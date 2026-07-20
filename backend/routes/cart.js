const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { trackDbQuery } = require('../middleware/metrics');

router.use(authenticate);

function getOrCreateCart(db, userId) {
  let cart = db.prepare('SELECT id FROM cart WHERE user_id = ?').get(userId);
  if (!cart) { const r = db.prepare('INSERT INTO cart (user_id) VALUES (?)').run(userId); return r.lastInsertRowid; }
  return cart.id;
}

function getCartWithItems(db, cartId) {
  const items = db.prepare('SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, p.slug FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?').all(cartId);
  let total = 0;
  const mapped = items.map(i => { const t = i.price * i.quantity; total += t; return { id: i.id, product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url, slug: i.slug, total: parseFloat(t.toFixed(2)) }; });
  return { items: mapped, total: parseFloat(total.toFixed(2)) };
}

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const cartId = getOrCreateCart(db, req.user.id);
    const cart = getCartWithItems(db, cartId);
    trackDbQuery('get_cart', qs);
    res.json({ cart_id: cartId, ...cart });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const db = getDb();
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Product ID is required' });
    const qs = Date.now();
    const product = db.prepare('SELECT id, stock_quantity FROM products WHERE id = ? AND is_active = 1').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock_quantity < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    const cartId = getOrCreateCart(db, req.user.id);
    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cartId, product_id);
    if (existing) {
      const nq = existing.quantity + quantity;
      if (nq > product.stock_quantity) return res.status(400).json({ error: 'Insufficient stock' });
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(nq, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(cartId, product_id, quantity);
    }
    const cart = getCartWithItems(db, cartId);
    trackDbQuery('add_to_cart', qs);
    res.json({ message: 'Item added to cart', cart_id: cartId, ...cart });
  } catch (error) { next(error); }
});

router.put('/items/:itemId', async (req, res, next) => {
  try {
    const db = getDb();
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0) return res.status(400).json({ error: 'Valid quantity is required' });
    const qs = Date.now();
    const cartId = getOrCreateCart(db, req.user.id);
    if (quantity === 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(req.params.itemId, cartId);
    } else {
      const item = db.prepare('SELECT ci.product_id, p.stock_quantity FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.id = ? AND ci.cart_id = ?').get(req.params.itemId, cartId);
      if (!item) return res.status(404).json({ error: 'Cart item not found' });
      if (quantity > item.stock_quantity) return res.status(400).json({ error: 'Insufficient stock' });
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.itemId);
    }
    const cart = getCartWithItems(db, cartId);
    trackDbQuery('update_cart', qs);
    res.json({ message: 'Cart updated', cart_id: cartId, ...cart });
  } catch (error) { next(error); }
});

router.delete('/items/:itemId', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const cartId = getOrCreateCart(db, req.user.id);
    db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(req.params.itemId, cartId);
    const cart = getCartWithItems(db, cartId);
    trackDbQuery('remove_cart_item', qs);
    res.json({ message: 'Item removed from cart', cart_id: cartId, ...cart });
  } catch (error) { next(error); }
});

router.delete('/', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const cartId = getOrCreateCart(db, req.user.id);
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
    trackDbQuery('clear_cart', qs);
    res.json({ message: 'Cart cleared', cart_id: cartId, items: [], total: 0 });
  } catch (error) { next(error); }
});

module.exports = router;
