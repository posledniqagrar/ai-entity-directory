const express = require('express');
const { getDb } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Apply authentication and admin middleware to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  const db = getDb();
  const totalServices = await db.get('SELECT COUNT(*) as count FROM services WHERE status = "approved"');
  const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
  const totalFavorites = await db.get('SELECT COUNT(*) as count FROM favorites');
  const pendingSubmissions = await db.get('SELECT COUNT(*) as count FROM pending_services WHERE status = "pending"');
  
  res.json({
    totalServices: totalServices.count,
    totalUsers: totalUsers.count,
    totalFavorites: totalFavorites.count,
    pendingSubmissions: pendingSubmissions.count
  });
});


// Get pending submissions
router.get('/pending', async (req, res) => {
  const db = getDb();
  const pending = await db.all(`
    SELECT ps.*, u.email as submitter_email 
    FROM pending_services ps
    JOIN users u ON ps.submitted_by = u.id
    WHERE ps.status = 'pending'
    ORDER BY ps.submitted_at DESC
  `);
  res.json(pending);
});

// Approve pending submission
router.post('/approve/:id', async (req, res) => {
  const db = getDb();
  const pending = await db.get('SELECT * FROM pending_services WHERE id = ? AND status = "pending"', [req.params.id]);
  
  if (!pending) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  
  // Move to services table
  await db.run(
    `INSERT INTO services (name, description, url, category, logo_url, status, submitted_by, submitted_at, approved_by, approved_at) 
     VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?, CURRENT_TIMESTAMP)`,
    [pending.name, pending.description, pending.url, pending.category, pending.logo_url, pending.submitted_by, pending.submitted_at, req.user.id]
  );
  
  // Update pending status
  await db.run('UPDATE pending_services SET status = "approved" WHERE id = ?', [req.params.id]);
  
  res.json({ message: 'Service approved and added to directory' });
});

// Reject pending submission
router.post('/reject/:id', async (req, res) => {
  const { reason } = req.body;
  const db = getDb();
  
  await db.run(
    'UPDATE pending_services SET status = "rejected", rejection_reason = ? WHERE id = ?',
    [reason || 'No reason provided', req.params.id]
  );
  
  res.json({ message: 'Service rejected' });
});

// Get all services (including pending status)
router.get('/services', async (req, res) => {
  const db = getDb();
  const services = await db.all('SELECT * FROM services WHERE status = "approved" ORDER BY name');
  res.json(services);
});

// Add new service (admin direct add)
router.post('/services', [
  body('name').notEmpty().trim(),
  body('description').notEmpty(),
  body('url').isURL(),
  body('category').notEmpty(),
  body('logo_url').optional().isURL()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, url, category, logo_url } = req.body;
  const db = getDb();
  
  const result = await db.run(
    'INSERT INTO services (name, description, url, category, logo_url, status, submitted_by, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, "approved", ?, ?, CURRENT_TIMESTAMP)',
    [name, description, url, category, logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`, req.user.id, req.user.id]
  );
  
  const newService = await db.get('SELECT * FROM services WHERE id = ?', [result.lastID]);
  res.json(newService);
});

// Update service
router.put('/services/:id', [
  body('name').notEmpty().trim(),
  body('description').notEmpty(),
  body('url').isURL(),
  body('category').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, url, category, logo_url } = req.body;
  const db = getDb();
  
  await db.run(
    'UPDATE services SET name = ?, description = ?, url = ?, category = ?, logo_url = ? WHERE id = ?',
    [name, description, url, category, logo_url, req.params.id]
  );
  
  const updatedService = await db.get('SELECT * FROM services WHERE id = ?', [req.params.id]);
  res.json(updatedService);
});

// Delete service
router.delete('/services/:id', async (req, res) => {
  const db = getDb();
  await db.run('DELETE FROM services WHERE id = ?', [req.params.id]);
  res.json({ message: 'Service deleted successfully' });
});

// Get all users
router.get('/users', async (req, res) => {
  const db = getDb();
  const users = await db.all('SELECT id, email, role, is_active, created_at FROM users');
  res.json(users);
});

// Deactivate/Activate user account
router.put('/users/:id/toggle-status', async (req, res) => {
  const db = getDb();
  const user = await db.get('SELECT is_active FROM users WHERE id = ?', [req.params.id]);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const newStatus = user.is_active ? 0 : 1;
  await db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
  
  res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'} successfully` });
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  const db = getDb();
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.params.id]);
  
  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin users' });
  }
  
  await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;