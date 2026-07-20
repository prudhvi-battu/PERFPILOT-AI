const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { trackDbQuery } = require('../middleware/metrics');

router.use(authenticate);

router.get('/profile', async (req, res, next) => {
  try {
    const db = getDb();
    const qs = Date.now();
    const user = db.prepare('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
    trackDbQuery('get_profile', qs);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { next(error); }
});

router.put('/profile', async (req, res, next) => {
  try {
    const db = getDb();
    const { first_name, last_name } = req.body;
    const qs = Date.now();
    db.prepare("UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), updated_at = datetime('now') WHERE id = ?").run(first_name || null, last_name || null, req.user.id);
    const user = db.prepare('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
    trackDbQuery('update_profile', qs);
    res.json({ message: 'Profile updated', user });
  } catch (error) { next(error); }
});

module.exports = router;
