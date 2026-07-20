const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { trackDbQuery } = require('../middleware/metrics');

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const { q, category_id, min_price, max_price, sort_by = 'created_at', sort_order = 'desc', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE p.is_active = 1';
    const params = [];
    if (q) { where += ' AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))'; params.push(`%${q}%`, `%${q}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(parseInt(category_id)); }
    if (min_price) { where += ' AND p.price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { where += ' AND p.price <= ?'; params.push(parseFloat(max_price)); }

    const qs = Date.now();
    const count = db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params).count;
    const sortF = (['name', 'price', 'created_at'].includes(sort_by) ? sort_by : 'created_at');
    const sortD = sort_order === 'asc' ? 'ASC' : 'DESC';
    const products = db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where} ORDER BY p.${sortF} ${sortD} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
    trackDbQuery('product_search', qs);

    const tp = Math.ceil(count / parseInt(limit));
    res.json({ products, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, total_pages: tp, has_next: parseInt(page) < tp, has_prev: parseInt(page) > 1 } });
  } catch (error) { next(error); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const categories = db.prepare('SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 GROUP BY c.id ORDER BY c.name').all();
    trackDbQuery('categories', qs);
    res.json({ categories });
  } catch (error) { next(error); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const product = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.is_active = 1').get(req.params.slug);
    trackDbQuery('product_detail', qs);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const rs = Date.now();
    const related = db.prepare('SELECT id, name, slug, price, image_url FROM products WHERE category_id = ? AND id != ? AND is_active = 1 LIMIT 4').all(product.category_id, product.id);
    trackDbQuery('related_products', rs);
    res.json({ ...product, related_products: related });
  } catch (error) { next(error); }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    res.json({ reviews: db.prepare('SELECT pr.*, u.first_name, u.last_name FROM product_reviews pr JOIN users u ON pr.user_id = u.id WHERE pr.product_id = ? ORDER BY pr.created_at DESC').all(req.params.id) });
    trackDbQuery('product_reviews', qs);
  } catch (error) { next(error); }
});

router.post('/:id/reviews', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    const { rating, title, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    const qs = Date.now();
    const r = db.prepare('INSERT INTO product_reviews (product_id, user_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)').run(req.params.id, req.user.id, rating, title, comment);
    trackDbQuery('create_review', qs);
    res.status(201).json({ id: r.lastInsertRowid, product_id: parseInt(req.params.id), user_id: req.user.id, rating, title, comment });
  } catch (error) { next(error); }
});

module.exports = router;
