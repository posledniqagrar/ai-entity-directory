const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { initializeDatabase } = require('./database');

const EMAIL = 's.arsov@gmail.com';

(async () => {
  const db = await initializeDatabase();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', EMAIL);
  if (existing) {
    console.log(`Admin user already exists with id=${existing.id}`);
    process.exit(0);
  }

  const raw = crypto.randomBytes(24).toString('base64');
  const password = raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  const hash = await bcrypt.hash(password, 12);

  const result = await db.run(
    'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
    [EMAIL, hash, 'admin']
  );

  console.log('Created admin user id=', result.lastID);
  console.log('Admin email=', EMAIL);
  console.log('Admin password=', password);
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
