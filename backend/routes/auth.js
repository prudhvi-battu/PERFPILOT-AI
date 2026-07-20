const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { activeUsers } = require('../middleware/metrics');

router.post('/register', async (req, res, next) => {
  try {
    const db = getDb();
    const { email, password, first_name, last_name } = req.body;
    if (!email || !password || !first_name || !last_name) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, 'customer')").run(email, hash, first_name, last_name);
    const user = db.prepare('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

    activeUsers.inc();
    res.status(201).json({ message: 'Registration successful', token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const db = getDb();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = db.prepare('SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    activeUsers.inc();
    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token required' });
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET, { ignoreExpiration: true });
    const token = jwt.sign({ id: decoded.id, email: decoded.email, role: decoded.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    res.json({ token });
  } catch (error) { next(error); }
});

module.exports = router;
