require('dotenv').config();
const { initDb, getDb } = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDb();
  const db = getDb();

  console.log('Seeding database...\n');
  db.exec('BEGIN');

  try {
    db.exec('DELETE FROM payments');
    db.exec('DELETE FROM order_items');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM cart_items');
    db.exec('DELETE FROM cart');
    db.exec('DELETE FROM product_reviews');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM users');
    db.exec("DELETE FROM sqlite_sequence");

    const hash = bcrypt.hashSync('password123', 10);
    const insU = db.prepare('INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)');
    insU.run('admin@shop.com', hash, 'Admin', 'User', 'admin');
    insU.run('john@example.com', hash, 'John', 'Doe', 'customer');
    insU.run('jane@example.com', hash, 'Jane', 'Smith', 'customer');
    insU.run('bob@example.com', hash, 'Bob', 'Johnson', 'customer');
    insU.run('alice@example.com', hash, 'Alice', 'Williams', 'customer');

    const insC = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)');
    insC.run('Electronics', 'electronics', 'Electronic devices');
    insC.run('Clothing', 'clothing', 'Apparel and fashion');
    insC.run('Home & Garden', 'home-garden', 'Home improvement');
    insC.run('Books', 'books', 'Books and education');
    insC.run('Sports', 'sports', 'Sports equipment');
    insC.run('Toys & Games', 'toys-games', 'Toys and games');

    const products = [
      ['Smartphone Pro X','smartphone-pro-x',999.99,1299.99,1,'ELEC-001',150],
      ['Laptop Ultra 15','laptop-ultra-15',1499.99,1799.99,1,'ELEC-002',75],
      ['Wireless Headphones','wireless-headphones',199.99,249.99,1,'ELEC-003',300],
      ['Smart Watch Series 5','smart-watch-series-5',349.99,399.99,1,'ELEC-004',200],
      ['Tablet Pro 12','tablet-pro-12',799.99,899.99,1,'ELEC-005',100],
      ['Bluetooth Speaker','bluetooth-speaker',79.99,99.99,1,'ELEC-006',500],
      ['Gaming Console','gaming-console',499.99,549.99,1,'ELEC-007',60],
      ['Digital Camera','digital-camera',649.99,749.99,1,'ELEC-008',45],
      ['Portable Charger','portable-charger',49.99,59.99,1,'ELEC-009',1000],
      ['USB-C Hub','usb-c-hub',39.99,49.99,1,'ELEC-010',800],
      ['Cotton T-Shirt','cotton-t-shirt',29.99,39.99,2,'CLTH-001',500],
      ['Denim Jeans','denim-jeans',79.99,99.99,2,'CLTH-002',300],
      ['Winter Jacket','winter-jacket',149.99,199.99,2,'CLTH-003',100],
      ['Running Shoes','running-shoes',129.99,159.99,2,'CLTH-004',200],
      ['Leather Belt','leather-belt',49.99,59.99,2,'CLTH-005',400],
      ['Garden Tool Set','garden-tool-set',89.99,109.99,3,'HOME-001',150],
      ['Indoor Plant Pot','indoor-plant-pot',34.99,44.99,3,'HOME-002',350],
      ['LED Desk Lamp','led-desk-lamp',59.99,69.99,3,'HOME-003',250],
      ['Smart Thermostat','smart-thermostat',199.99,249.99,3,'HOME-004',80],
      ['Cookware Set','cookware-set',149.99,199.99,3,'HOME-005',90],
      ['Programming Book','programming-book',49.99,59.99,4,'BOOK-001',500],
      ['Design Patterns','design-patterns',44.99,54.99,4,'BOOK-002',350],
      ['Data Science Guide','data-science-guide',54.99,64.99,4,'BOOK-003',200],
      ['Business Strategy','business-strategy',39.99,49.99,4,'BOOK-004',400],
      ['Cookbook Deluxe','cookbook-deluxe',34.99,44.99,4,'BOOK-005',300],
      ['Yoga Mat Premium','yoga-mat-premium',39.99,49.99,5,'SPRT-001',400],
      ['Dumbbell Set 20lbs','dumbbell-set-20lbs',89.99,109.99,5,'SPRT-002',150],
      ['Resistance Bands','resistance-bands',24.99,34.99,5,'SPRT-003',600],
      ['Water Bottle Insulated','water-bottle-insulated',29.99,39.99,5,'SPRT-004',700],
      ['Fitness Tracker','fitness-tracker',79.99,99.99,5,'SPRT-005',250],
      ['Board Game Collection','board-game-collection',49.99,59.99,6,'TOYS-001',200],
      ['Building Blocks 500pc','building-blocks-500pc',39.99,49.99,6,'TOYS-002',350],
      ['Remote Control Car','remote-control-car',59.99,79.99,6,'TOYS-003',180],
      ['Puzzle 1000pc','puzzle-1000pc',19.99,24.99,6,'TOYS-004',500],
      ['Stuffed Animal Bear','stuffed-animal-bear',24.99,34.99,6,'TOYS-005',400],
      ['Mechanical Keyboard','mechanical-keyboard',149.99,179.99,1,'ELEC-011',120],
      ['Webcam HD 4K','webcam-hd-4k',129.99,159.99,1,'ELEC-012',90],
      ['Wireless Mouse','wireless-mouse',49.99,69.99,1,'ELEC-013',350],
      ['Monitor 27" 4K','monitor-27-4k',449.99,549.99,1,'ELEC-014',50],
      ['SSD 1TB External','ssd-1tb-external',129.99,159.99,1,'ELEC-015',200],
      ['Wool Sweater','wool-sweater',89.99,119.99,2,'CLTH-006',150],
      ['Casual Sneakers','casual-sneakers',99.99,129.99,2,'CLTH-007',250],
      ['Formal Shirt','formal-shirt',69.99,89.99,2,'CLTH-008',300],
      ['Winter Gloves','winter-gloves',19.99,29.99,2,'CLTH-009',500],
      ['Cashmere Scarf','cashmere-scarf',59.99,79.99,2,'CLTH-010',200],
      ['Air Purifier','air-purifier',249.99,299.99,3,'HOME-006',60],
      ['Robot Vacuum','robot-vacuum',399.99,499.99,3,'HOME-007',40],
      ['Coffee Maker Pro','coffee-maker-pro',89.99,119.99,3,'HOME-008',180],
      ['Electric Kettle','electric-kettle',39.99,49.99,3,'HOME-009',300],
      ['Throw Blanket','throw-blanket',34.99,49.99,3,'HOME-010',250],
    ];

    const insP = db.prepare('INSERT INTO products (name,slug,description,price,compare_price,category_id,image_url,stock_quantity,sku) VALUES (?,?,?,?,?,?,?,?,?)');
    for (const [n, s, p, cp, cat, sku, stock] of products) {
      insP.run(n, s, `High-quality ${n.toLowerCase()} - perfect for your needs.`, p, cp, cat, `https://via.placeholder.com/400x400?text=${n.replace(/\s/g,'')}`, stock, sku);
    }

    // Sample orders
    const insO = db.prepare('INSERT INTO orders (order_number,user_id,status,subtotal,tax,shipping,total,shipping_address,payment_method,payment_status) VALUES (?,?,?,?,?,?,?,?,?,?)');
    const insOI = db.prepare('INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price,total_price) VALUES (?,?,?,?,?,?)');
    const insPay = db.prepare('INSERT INTO payments (order_id,transaction_id,amount,status,payment_method) VALUES (?,?,?,?,?)');

    for (let i = 0; i < 5; i++) {
      const sub = parseFloat((Math.random() * 500 + 50).toFixed(2));
      const tax = parseFloat((sub * 0.08).toFixed(2));
      const ship = i === 0 ? 0 : 9.99;
      const tot = parseFloat((sub + tax + ship).toFixed(2));
      const statuses = ['delivered','delivered','shipped','processing','confirmed'];
      const payments = ['completed','completed','completed','pending','pending'];

      const oR = insO.run(`ORD-${String(100 + i).padStart(3,'0')}`, (i % 4) + 2, statuses[i], sub, tax, ship, tot, JSON.stringify({street:`${100+i} Main St`,city:'New York',state:'NY',zip:'10001',country:'US'}),'credit_card',payments[i]);
      const randoms = db.prepare('SELECT id, name, price FROM products ORDER BY RANDOM() LIMIT 3').all();
      for (const r of randoms) {
        const q = Math.floor(Math.random() * 3) + 1;
        insOI.run(oR.lastInsertRowid, r.id, r.name, q, r.price, parseFloat((r.price * q).toFixed(2)));
      }
      insPay.run(oR.lastInsertRowid, `TXN-${String(1000+i).padStart(6,'0')}`, tot, payments[i], 'credit_card');
    }

    db.exec('COMMIT');
    console.log('✓ Database seeded successfully');
    console.log('  - 5 users, 6 categories, 50 products, 5 orders');
    console.log('  - Admin: admin@shop.com / password123');
    console.log('  - Customer: john@example.com / password123');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('✗ Seed failed:', error.message);
    throw error;
  }
}

seed().catch(() => process.exit(1));
