const express = require('express');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Submit a new AI service for review
router.post('/submit', authenticate, [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('description').notEmpty().trim().isLength({ min: 10, max: 500 }),
  body('url').isURL(),
  body('category').notEmpty(),
  body('logo_url').trim().custom(val => !val || val.length === 0 || /^https?:\/\//.test(val))
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, url, category, logo_url } = req.body;
  const db = getDb();
  
  // Check if service already exists
  const existing = await db.get('SELECT id FROM services WHERE name = ? OR url = ?', [name, url]);
  if (existing) {
    return res.status(400).json({ error: 'A service with this name or URL already exists' });
  }
  
  // Check if already pending
  const pending = await db.get('SELECT id FROM pending_services WHERE name = ? OR url = ?', [name, url]);
  if (pending) {
    return res.status(400).json({ error: 'This service is already pending review' });
  }
  
  const result = await db.run(
    `INSERT INTO pending_services (name, description, url, category, logo_url, submitted_by, submitter_email, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [name, description, url, category, logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`, req.user.id, req.user.email]
  );
  
  res.json({ 
    message: 'Service submitted successfully for review', 
    submissionId: result.lastID 
  });
});

// Get user's pending submissions
router.get('/my-submissions', authenticate, async (req, res) => {
  const db = getDb();
  const submissions = await db.all(
    `SELECT * FROM pending_services WHERE submitted_by = ? ORDER BY submitted_at DESC`,
    [req.user.id]
  );
  res.json(submissions);
});

module.exports = router;