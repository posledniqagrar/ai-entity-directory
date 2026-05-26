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
// Build an explicit CORS whitelist from environment variables and sensible
// local defaults. In production set `FRONTEND_URL` (eg https://aientity.co.uk)
// or `FRONTEND_ORIGINS` (comma-separated) so the server will accept requests
// from your frontend and allow cookies to be sent.
const allowedOrigins = (() => {
  const set = new Set();
  const addOrigin = (origin) => {
    if (!origin) return;
    const trimmed = origin.trim();
    set.add(trimmed);
    if (trimmed.startsWith('https://')) {
      const host = trimmed.slice('https://'.length);
      if (host.startsWith('www.')) {
        set.add(`https://${host.replace(/^www\./, '')}`);
      } else {
        set.add(`https://www.${host}`);
      }
    }
  };

  if (process.env.FRONTEND_URL) addOrigin(process.env.FRONTEND_URL);
  if (process.env.FRONTEND_ORIGINS) {
    process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()).filter(Boolean).forEach(addOrigin);
  }
  if (process.env.RAILWAY_STATIC_URL) {
    const url = process.env.RAILWAY_STATIC_URL.startsWith('http') ? process.env.RAILWAY_STATIC_URL : `https://${process.env.RAILWAY_STATIC_URL}`;
    addOrigin(url);
  }
  // If running in production and no frontend origin is configured, add sensible
  // defaults for the public site, including both non-www and www variants.
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL && !process.env.FRONTEND_ORIGINS) {
    console.warn('No FRONTEND_URL or FRONTEND_ORIGINS configured in production — falling back to https://aientity.co.uk and https://www.aientity.co.uk. Please set FRONTEND_URL in your environment.');
    addOrigin('https://aientity.co.uk');
  }
  // Local dev origins
  set.add('http://localhost:3000');
  set.add('http://127.0.0.1:3000');
  return Array.from(set);
})();

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl) which usually have no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('Blocked CORS origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.static('public'));

// Ensure the database is ready before starting the server
async function startServer() {
  await initializeDatabase();

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
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

