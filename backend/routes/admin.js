const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { trackDbQuery } = require('../middleware/metrics');

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    res.json({
      stats: {
        total_users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
        total_products: db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count,
        total_orders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
        total_revenue: db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status = 'completed'").get().total,
        orders_by_status: db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all(),
        low_stock_items: db.prepare('SELECT id, name, stock_quantity, sku FROM products WHERE stock_quantity < 10 ORDER BY stock_quantity ASC LIMIT 10').all(),
      },
      recent_orders: db.prepare('SELECT order_number, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5').all()
    });
    trackDbQuery('admin_stats', qs);
  } catch (error) { next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const { page = 1, limit = 50 } = req.query;
    const off = (parseInt(page) - 1) * parseInt(limit);
    const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?').all(parseInt(limit), off);
    trackDbQuery('admin_products', qs);
    res.json({ products, pagination: { page: parseInt(page), limit: parseInt(limit), total: db.prepare('SELECT COUNT(*) as count FROM products').get().count } });
  } catch (error) { next(error); }
});

router.post('/products', async (req, res, next) => {
  try {
    const db = getDb();
    const { name, description, price, compare_price, category_id, image_url, stock_quantity, sku } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const qs = Date.now();
    const r = db.prepare('INSERT INTO products (name, slug, description, price, compare_price, category_id, image_url, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, slug, description, price, compare_price, category_id, image_url, stock_quantity, sku);
    trackDbQuery('admin_create_product', qs);
    res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid));
  } catch (error) { next(error); }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const { name, description, price, compare_price, category_id, image_url, stock_quantity, sku, is_active } = req.body;
    const qs = Date.now();
    if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Product not found' });
    db.prepare("UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), compare_price = COALESCE(?, compare_price), category_id = COALESCE(?, category_id), image_url = COALESCE(?, image_url), stock_quantity = COALESCE(?, stock_quantity), sku = COALESCE(?, sku), is_active = COALESCE(?, is_active), updated_at = datetime('now') WHERE id = ?").run(name, description, price, compare_price, category_id, image_url, stock_quantity, sku, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
    trackDbQuery('admin_update_product', qs);
    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  } catch (error) { next(error); }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const r = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    trackDbQuery('admin_delete_product', qs);
    if (r.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) { next(error); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const db = getDb();
    const { status, page = 1, limit = 20 } = req.query;
    const off = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT o.*, u.email as user_email, u.first_name, u.last_name FROM orders o JOIN users u ON o.user_id = u.id';
    const params = [];
    if (status) { sql += ' WHERE o.status = ?'; params.push(status); }
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), off);
    const qs = Date.now();
    res.json({ orders: db.prepare(sql).all(...params) });
    trackDbQuery('admin_orders', qs);
  } catch (error) { next(error); }
});

router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const db = getDb();
    const { status } = req.body;
    if (!status || !['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const qs = Date.now();
    const r = db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    trackDbQuery('admin_update_order', qs);
    if (r.changes === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
  } catch (error) { next(error); }
});

router.get('/sales', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    res.json({
      revenue_by_day: db.prepare("SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE payment_status = 'completed' AND created_at >= datetime('now', '-30 days') GROUP BY DATE(created_at) ORDER BY date").all(),
      top_products: db.prepare("SELECT oi.product_name, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as total_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.payment_status = 'completed' GROUP BY oi.product_name ORDER BY total_revenue DESC LIMIT 10").all(),
      sales_by_category: db.prepare("SELECT c.name, SUM(oi.total_price) as revenue, COUNT(DISTINCT o.id) as order_count FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id JOIN categories c ON p.category_id = c.id WHERE o.payment_status = 'completed' GROUP BY c.name ORDER BY revenue DESC").all()
    });
    trackDbQuery('admin_sales', qs);
  } catch (error) { next(error); }
});

module.exports = router;
