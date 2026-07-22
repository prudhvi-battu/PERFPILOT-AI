require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');
const errorHandler = require('./middleware/errorHandler');
const { initDb, getDb } = require('./db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
const limiter = rateLimit({ windowMs: 60000, max: 10000, message: { error: 'Too many requests' }, skip: (req) => req.path === '/api/loadtest/status' || req.path === '/api/loadtest/engine-status' });
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(metricsMiddleware);

// Health check (works before DB init)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Serve Gatling report static files (JS/CSS/images) without CSP
app.use('/gatling-report', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data:");
  next();
}, express.static(path.join(__dirname, '..', 'reports', 'gatling-latest')));

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true, customCss: '.swagger-ui .topbar { display: none }', customSiteTitle: 'E-Commerce API - Performance Testing' }));
app.get('/api-docs.json', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.send(swaggerSpec); });

// Metrics
app.get('/api/metrics', metricsEndpoint);

// Browser Notification SSE stream (zero credentials)
const { getBrowserNotifications } = require('./services/browserNotification');
app.get('/api/alerts/stream', (req, res) => {
  getBrowserNotifications().sseMiddleware(req, res);
});

async function start() {
  try {
    console.log('Initializing database...');
    await initDb();
    const db = getDb();
    console.log('✓ Database initialized\n');

    // Auto-migrate: create tables if they don't exist
    console.log('Running auto-migration...');
    
    db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT DEFAULT 'customer', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, price REAL NOT NULL, compare_price REAL, category_id INTEGER REFERENCES categories(id), image_url TEXT, stock_quantity INTEGER DEFAULT 0, sku TEXT UNIQUE, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS product_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER REFERENCES products(id), user_id INTEGER REFERENCES users(id), rating INTEGER CHECK (rating>=1 AND rating<=5), title TEXT, comment TEXT, created_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS cart (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) UNIQUE, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS cart_items (id INTEGER PRIMARY KEY AUTOINCREMENT, cart_id INTEGER REFERENCES cart(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id), quantity INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE NOT NULL, user_id INTEGER REFERENCES users(id), status TEXT DEFAULT 'pending', subtotal REAL NOT NULL, tax REAL NOT NULL, shipping REAL DEFAULT 0, total REAL NOT NULL, shipping_address TEXT, payment_method TEXT DEFAULT 'credit_card', payment_status TEXT DEFAULT 'pending', notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id), product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL)");
    db.exec("CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER REFERENCES orders(id), transaction_id TEXT UNIQUE, amount REAL NOT NULL, status TEXT DEFAULT 'pending', payment_method TEXT, gateway_response TEXT, created_at TEXT DEFAULT (datetime('now')))");
    
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id)');
    
    console.log('✓ Auto-migration complete\n');

    // Auto-seed: check if we have data, if not seed it
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
      console.log('Seeding database with sample data...\n');
      
      const hash = bcrypt.hashSync('password123', 10);
      
      // Users
      const iu = db.prepare('INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)');
      iu.run('admin@shop.com', hash, 'Admin', 'User', 'admin');
      iu.run('john@example.com', hash, 'John', 'Doe', 'customer');
      iu.run('jane@example.com', hash, 'Jane', 'Smith', 'customer');
      iu.run('bob@example.com', hash, 'Bob', 'Johnson', 'customer');
      iu.run('alice@example.com', hash, 'Alice', 'Williams', 'customer');
      
      // Categories
      const ic = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)');
      ic.run('Electronics', 'electronics', 'Electronic devices');
      ic.run('Clothing', 'clothing', 'Apparel and fashion');
      ic.run('Home & Garden', 'home-garden', 'Home improvement');
      ic.run('Books', 'books', 'Books and education');
      ic.run('Sports', 'sports', 'Sports equipment');
      ic.run('Toys & Games', 'toys-games', 'Toys and games');
      
      // Products (50)
      const products = [
        ['Smartphone Pro X','smartphone-pro-x',999.99,1,150,'ELEC-001'],
        ['Laptop Ultra 15','laptop-ultra-15',1499.99,1,75,'ELEC-002'],
        ['Wireless Headphones','wireless-headphones',199.99,1,300,'ELEC-003'],
        ['Smart Watch','smart-watch',349.99,1,200,'ELEC-004'],
        ['Tablet Pro 12','tablet-pro-12',799.99,1,100,'ELEC-005'],
        ['Bluetooth Speaker','bluetooth-speaker',79.99,1,500,'ELEC-006'],
        ['Gaming Console','gaming-console',499.99,1,60,'ELEC-007'],
        ['Digital Camera','digital-camera',649.99,1,45,'ELEC-008'],
        ['Portable Charger','portable-charger',49.99,1,1000,'ELEC-009'],
        ['USB-C Hub','usb-c-hub',39.99,1,800,'ELEC-010'],
        ['Cotton T-Shirt','cotton-t-shirt',29.99,2,500,'CLTH-001'],
        ['Denim Jeans','denim-jeans',79.99,2,300,'CLTH-002'],
        ['Winter Jacket','winter-jacket',149.99,2,100,'CLTH-003'],
        ['Running Shoes','running-shoes',129.99,2,200,'CLTH-004'],
        ['Leather Belt','leather-belt',49.99,2,400,'CLTH-005'],
        ['Garden Tool Set','garden-tool-set',89.99,3,150,'HOME-001'],
        ['Indoor Plant Pot','indoor-plant-pot',34.99,3,350,'HOME-002'],
        ['LED Desk Lamp','led-desk-lamp',59.99,3,250,'HOME-003'],
        ['Smart Thermostat','smart-thermostat',199.99,3,80,'HOME-004'],
        ['Cookware Set','cookware-set',149.99,3,90,'HOME-005'],
        ['Programming Book','programming-book',49.99,4,500,'BOOK-001'],
        ['Design Patterns','design-patterns',44.99,4,350,'BOOK-002'],
        ['Data Science Guide','data-science-guide',54.99,4,200,'BOOK-003'],
        ['Business Strategy','business-strategy',39.99,4,400,'BOOK-004'],
        ['Cookbook Deluxe','cookbook-deluxe',34.99,4,300,'BOOK-005'],
        ['Yoga Mat Premium','yoga-mat-premium',39.99,5,400,'SPRT-001'],
        ['Dumbbell Set 20lbs','dumbbell-set-20lbs',89.99,5,150,'SPRT-002'],
        ['Resistance Bands','resistance-bands',24.99,5,600,'SPRT-003'],
        ['Water Bottle Insulated','water-bottle-insulated',29.99,5,700,'SPRT-004'],
        ['Fitness Tracker','fitness-tracker',79.99,5,250,'SPRT-005'],
        ['Board Game Collection','board-game-collection',49.99,6,200,'TOYS-001'],
        ['Building Blocks 500pc','building-blocks-500pc',39.99,6,350,'TOYS-002'],
        ['Remote Control Car','remote-control-car',59.99,6,180,'TOYS-003'],
        ['Puzzle 1000pc','puzzle-1000pc',19.99,6,500,'TOYS-004'],
        ['Stuffed Animal Bear','stuffed-animal-bear',24.99,6,400,'TOYS-005'],
        ['Mechanical Keyboard','mechanical-keyboard',149.99,1,120,'ELEC-011'],
        ['Webcam HD 4K','webcam-hd-4k',129.99,1,90,'ELEC-012'],
        ['Wireless Mouse','wireless-mouse',49.99,1,350,'ELEC-013'],
        ['Monitor 27 4K','monitor-27-4k',449.99,1,50,'ELEC-014'],
        ['SSD 1TB External','ssd-1tb-external',129.99,1,200,'ELEC-015'],
        ['Wool Sweater','wool-sweater',89.99,2,150,'CLTH-006'],
        ['Casual Sneakers','casual-sneakers',99.99,2,250,'CLTH-007'],
        ['Formal Shirt','formal-shirt',69.99,2,300,'CLTH-008'],
        ['Winter Gloves','winter-gloves',19.99,2,500,'CLTH-009'],
        ['Cashmere Scarf','cashmere-scarf',59.99,2,200,'CLTH-010'],
        ['Air Purifier','air-purifier',249.99,3,60,'HOME-006'],
        ['Robot Vacuum','robot-vacuum',399.99,3,40,'HOME-007'],
        ['Coffee Maker Pro','coffee-maker-pro',89.99,3,180,'HOME-008'],
        ['Electric Kettle','electric-kettle',39.99,3,300,'HOME-009'],
        ['Throw Blanket','throw-blanket',34.99,3,250,'HOME-010'],
      ];
      
      const ip = db.prepare('INSERT INTO products (name, slug, description, price, category_id, image_url, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const [n, s, p, c, st, sku] of products) {
        ip.run(n, s, `High-quality ${n.toLowerCase()}`, p, c, `https://via.placeholder.com/400x400?text=${n.replace(/\s/g,'')}`, st, sku);
      }
      
      // Sample orders
      const io = db.prepare('INSERT INTO orders (order_number, user_id, status, subtotal, tax, shipping, total, shipping_address, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const ioi = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)');
      const ipay = db.prepare('INSERT INTO payments (order_id, transaction_id, amount, status, payment_method) VALUES (?, ?, ?, ?, ?)');
      
      for (let i = 0; i < 5; i++) {
        const sub = parseFloat((Math.random() * 500 + 50).toFixed(2));
        const tx = parseFloat((sub * 0.08).toFixed(2));
        const sh = i === 0 ? 0 : 9.99;
        const tot = parseFloat((sub + tx + sh).toFixed(2));
        const sts = ['delivered','delivered','shipped','processing','confirmed'];
        const pms = ['completed','completed','completed','pending','pending'];
        
        const or = io.run(`ORD-${100+i}`, (i%4)+2, sts[i], sub, tx, sh, tot, JSON.stringify({street:`${100+i} Main St`,city:'NYC',state:'NY',zip:'10001',country:'US'}),'credit_card',pms[i]);
        const rand = db.prepare('SELECT id, name, price FROM products ORDER BY RANDOM() LIMIT 3').all();
        for (const r of rand) {
          const q = Math.floor(Math.random() * 3) + 1;
          ioi.run(or.lastInsertRowid, r.id, r.name, q, r.price, parseFloat((r.price * q).toFixed(2)));
        }
        ipay.run(or.lastInsertRowid, `TXN-${1000+i}`, tot, pms[i], 'credit_card');
      }
      
      console.log('✓ Sample data seeded: 5 users, 6 categories, 50 products, 5 orders\n');
    } else {
      console.log(`✓ Database already has data (${userCount} users found, skipping seed)\n`);
    }

    // Create alert_log table for tracking notifications
    db.exec("CREATE TABLE IF NOT EXISTS alert_log (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, severity TEXT, metric TEXT, value TEXT, threshold TEXT, business_impact TEXT, notification_channel TEXT DEFAULT 'email', notification_status TEXT, error_message TEXT, sent_at TEXT)");

    // Now load routes and start listening
    const routes = {
      auth: require('./routes/auth'),
      products: require('./routes/products'),
      cart: require('./routes/cart'),
      orders: require('./routes/orders'),
      users: require('./routes/users'),
      admin: require('./routes/admin'),
      alerts: require('./routes/alerts'),
      loadtest: require('./routes/loadtest'),
    };

    app.use('/api/auth', routes.auth);
    app.use('/api/products', routes.products);
    app.use('/api/cart', routes.cart);
    app.use('/api/orders', routes.orders);
    app.use('/api/users', routes.users);
    app.use('/api/admin', routes.admin);
    app.use('/api/alerts', routes.alerts);
    app.use('/api/loadtest', routes.loadtest);

    // Error handling (must be after ALL routes)
    app.use(errorHandler);

    // Serve React frontend in production
    const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
    if (require('fs').existsSync(frontendBuild)) {
      app.use(express.static(frontendBuild));
      app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuild, 'index.html'));
      });
      console.log('✓ Serving React frontend from', frontendBuild);
    } else {
      app.use((req, res) => { res.status(404).json({ error: 'Route not found' }); });
    }

    const server = app.listen(PORT, () => {
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║     AI Performance Testing Assistant - Backend       ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  Server:      http://localhost:${PORT}                   ║`);
      console.log(`║  API Docs:    http://localhost:${PORT}/api-docs           ║`);
      console.log('║  Metrics:     http://localhost:5000/api/metrics        ║');
      console.log('║  Health:      http://localhost:5000/api/health         ║');
      console.log('╚══════════════════════════════════════════════════════╝\n');
      // Start the alert engine automatically
      try {
        const { getAlertEngine } = require('./services/alertEngine');
        const engine = getAlertEngine();
        engine.start();
        
        // Clean up on shutdown
        const shutdown = async () => {
          engine.stop();
          server.close(() => process.exit(0));
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
      } catch (e) {
        console.log('  (Alert engine not available:', e.message + ')')
      }

      console.log('  Test Accounts:');
      console.log('  - Admin:    admin@shop.com / password123');
      console.log('  - Customer: john@example.com / password123\n');
    });

    // SIGTERM/SIGINT handled above by the alert engine shutdown
  } catch (err) {
    console.error('✗ Server startup failed:', err.message);
    process.exit(1);
  }
}

start();
