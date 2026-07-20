const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { trackDbQuery, orderTotal, revenueTotal } = require('../middleware/metrics');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    for (const o of orders) o.items = db.prepare('SELECT product_id, product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = ?').all(o.id);
    trackDbQuery('order_history', qs);
    res.json({ orders });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const db = getDb();
    const { shipping_address, payment_method = 'credit_card' } = req.body;
    if (!shipping_address) return res.status(400).json({ error: 'Shipping address is required' });
    const qs = Date.now();

    const cart = db.prepare('SELECT id FROM cart WHERE user_id = ?').get(req.user.id);
    if (!cart) return res.status(400).json({ error: 'Cart is empty' });

    const items = db.prepare('SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock_quantity FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?').all(cart.id);
    if (items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    let subtotal = 0;
    for (const item of items) {
      if (item.stock_quantity < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
      subtotal += item.price * item.quantity;
    }

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const shipping = subtotal >= 100 ? 0 : 9.99;
    const total = parseFloat((subtotal + tax + shipping).toFixed(2));
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const order = db.transaction(() => {
      const oR = db.prepare("INSERT INTO orders (order_number, user_id, status, subtotal, tax, shipping, total, shipping_address, payment_method, payment_status) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'pending')").run(orderNumber, req.user.id, subtotal, tax, shipping, total, JSON.stringify(shipping_address), payment_method);
      const orderId = oR.lastInsertRowid;

      for (const item of items) {
        db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)').run(orderId, item.product_id, item.name, item.quantity, item.price, parseFloat((item.price * item.quantity).toFixed(2)));
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
      }

      const txId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      db.prepare("INSERT INTO payments (order_id, transaction_id, amount, status, payment_method, gateway_response) VALUES (?, ?, ?, 'completed', ?, ?)").run(orderId, txId, total, payment_method, JSON.stringify({ simulated: true, gateway: 'payment-simulator' }));
      db.prepare("UPDATE orders SET payment_status = 'completed', status = 'confirmed' WHERE id = ?").run(orderId);
      db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);

      const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      o.items = db.prepare('SELECT product_id, product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = ?').all(orderId);
      return o;
    })();

    orderTotal.inc();
    revenueTotal.inc({ currency: 'USD' }, total);
    trackDbQuery('create_order', qs);
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = db.prepare('SELECT product_id, product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = ?').all(order.id);
    trackDbQuery('order_detail', qs);
    res.json(order);
  } catch (error) { next(error); }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const r = db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status IN ('pending', 'confirmed')").run(req.params.id, req.user.id);
    trackDbQuery('cancel_order', qs);
    if (r.changes === 0) return res.status(400).json({ error: 'Order cannot be cancelled' });
    res.json({ message: 'Order cancelled', order: db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) });
  } catch (error) { next(error); }
});

module.exports = router;
