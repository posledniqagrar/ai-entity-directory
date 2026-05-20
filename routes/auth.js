const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { email, password } = req.body;
  const db = getDb();
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hashedPassword]);
    
    const user = await db.get('SELECT id, email, role FROM users WHERE email = ?', [email]);
    const token = generateToken(user.id, user.email, user.role);
    
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(user.id, user.email, user.role);
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;