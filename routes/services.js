const express = require('express');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all services with pagination and filtering
router.get('/', async (req, res) => {
  const { page = 1, limit = 12, search = '', category = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = getDb();
  
  let query = 'SELECT * FROM services WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM services WHERE 1=1';
  const params = [];
  
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    countQuery += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (category && category !== 'all') {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY name LIMIT ? OFFSET ?';
  const services = await db.all(query, [...params, limit, offset]);
  
  const countResult = await db.get(countQuery, params);
  const total = countResult.total;
  
  // Get favorites if user is authenticated
  let favorites = [];
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const { verifyToken } = require('../middleware/auth');
      const decoded = verifyToken(token);
      if (decoded) {
        const favs = await db.all('SELECT service_id FROM favorites WHERE user_id = ?', [decoded.userId]);
        favorites = favs.map(f => f.service_id);
      }
    } catch (e) {}
  }
  
  res.json({
    services,
    favorites,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  });
});

// Get all categories
router.get('/categories', async (req, res) => {
  const db = getDb();
  const categories = await db.all('SELECT DISTINCT category FROM services ORDER BY category');
  res.json(categories.map(c => c.category));
});

// Get single service
router.get('/:id', async (req, res) => {
  const db = getDb();
  const service = await db.get('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(service);
});

module.exports = router;