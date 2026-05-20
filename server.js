const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;  // Railway sets PORT automatically

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:3000', process.env.FRONTEND_URL || '*'],
  credentials: true
}));
app.use(express.static('public'));

// Initialize database
initializeDatabase().catch(console.error);

// Import routes
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const favoriteRoutes = require('./routes/favorites');
const adminRoutes = require('./routes/admin');
const submissionRoutes = require('./routes/submissions');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'submit.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Railway URL: https://${process.env.RAILWAY_STATIC_URL || 'localhost'}`);
  console.log(`👤 Admin: admin@example.com / admin123`);
});