const express = require('express');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user's favorites
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const favorites = await db.all(`
    SELECT s.* FROM services s
    JOIN favorites f ON s.id = f.service_id
    WHERE f.user_id = ?
    ORDER BY s.name
  `, [req.user.id]);
  res.json(favorites);
});

// Add to favorites
router.post('/:serviceId', authenticate, async (req, res) => {
  const db = getDb();
  try {
    await db.run('INSERT INTO favorites (user_id, service_id) VALUES (?, ?)', 
      [req.user.id, req.params.serviceId]);
    res.json({ message: 'Added to favorites' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Already in favorites' });
    } else {
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  }
});

// Remove from favorites
router.delete('/:serviceId', authenticate, async (req, res) => {
  const db = getDb();
  await db.run('DELETE FROM favorites WHERE user_id = ? AND service_id = ?', 
    [req.user.id, req.params.serviceId]);
  res.json({ message: 'Removed from favorites' });
});

module.exports = router;