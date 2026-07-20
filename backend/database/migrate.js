require('dotenv').config();
const { initDb, getDb } = require('../db');

async function migrate() {
  await initDb();
  const db = getDb();

  console.log('Running database migrations...\n');
  db.exec('BEGIN');

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT DEFAULT 'customer' CHECK (role IN ('customer','admin')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT,
        price REAL NOT NULL, compare_price REAL,
        category_id INTEGER REFERENCES categories(id),
        image_url TEXT, stock_quantity INTEGER DEFAULT 0, sku TEXT UNIQUE,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS product_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK (rating>=1 AND rating<=5),
        title TEXT, comment TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER REFERENCES cart(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
        subtotal REAL NOT NULL, tax REAL NOT NULL, shipping REAL DEFAULT 0, total REAL NOT NULL,
        shipping_address TEXT, payment_method TEXT DEFAULT 'credit_card',
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','refunded')),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id),
        transaction_id TEXT UNIQUE, amount REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded')),
        payment_method TEXT, gateway_response TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    `);

    db.exec('COMMIT');
    console.log('✓ Database migration completed successfully');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

migrate().catch(() => process.exit(1));
