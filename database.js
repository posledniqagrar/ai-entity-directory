const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');
const { aiServices } = require('./seed-data');

let db;

async function initializeDatabase() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
  }

  const dbPath = path.join(dataDir, 'ai-services.db');
  console.log('Database path:', dbPath);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_url TEXT,
      status TEXT DEFAULT 'approved',
      is_featured INTEGER DEFAULT 0,
      submitted_by INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_by INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name_unique ON services(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_services_url_unique ON services(url);

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      service_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, service_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_url TEXT,
      submitted_by INTEGER NOT NULL,
      submitter_email TEXT,
      status TEXT DEFAULT 'pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      rejection_reason TEXT,
      FOREIGN KEY (submitted_by) REFERENCES users(id)
    );
  `);

  await migrateSchema();
  await seedServices();
  await seedAdminUsers();
  return db;
}

async function seedAdminUsers() {
  // Delete legacy admin user if exists
  await db.run('DELETE FROM users WHERE email = ?', ['admin@example.com']);
  console.log('Removed legacy admin@example.com user if present.');

  const adminUsers = [
    { email: 's.arsov@gmail.com', password: process.env.ADMIN_PASSWORD || 'Zakarum1!', role: 'admin' }
  ];

  for (const admin of adminUsers) {
    const passwordHash = await bcrypt.hash(admin.password, 12);
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [admin.email]);
    if (existingUser) {
      await db.run('UPDATE users SET password_hash = ?, role = ?, is_active = 1 WHERE email = ?', [passwordHash, admin.role, admin.email]);
      console.log(`Admin user ${admin.email} (id=${existingUser.id}) credentials updated.`);
    } else {
      const result = await db.run(
        'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
        [admin.email, passwordHash, admin.role]
      );
      console.log(`Seeded admin user id=${result.lastID}, email=${admin.email}`);
    }
  }
}

async function migrateSchema() {
  await ensureColumns('users', [
    { name: 'role', def: "TEXT DEFAULT 'user'" },
    { name: 'is_active', def: 'INTEGER DEFAULT 1' },
    { name: 'created_at', def: 'DATETIME' }
  ]);

  await ensureColumns('services', [
    { name: 'status', def: "TEXT DEFAULT 'approved'" },
    { name: 'is_featured', def: 'INTEGER DEFAULT 0' },
    { name: 'submitted_by', def: 'INTEGER' },
    { name: 'submitted_at', def: 'DATETIME' },
    { name: 'approved_by', def: 'INTEGER' },
    { name: 'approved_at', def: 'DATETIME' },
    { name: 'created_at', def: 'DATETIME' }
  ]);

  await ensureColumns('pending_services', [
    { name: 'submitter_email', def: 'TEXT' },
    { name: 'status', def: "TEXT DEFAULT 'pending'" },
    { name: 'rejection_reason', def: 'TEXT' }
  ]);
}

async function ensureColumns(table, columns) {
  const existingColumns = await db.all(`PRAGMA table_info(${table})`);
  const existingNames = existingColumns.map(c => c.name);
  for (const column of columns) {
    if (!existingNames.includes(column.name)) {
      await db.run(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.def}`);
      console.log(`Added missing column ${column.name} to ${table}`);
    }
  }
}

async function seedServices() {
  const countResult = await db.get('SELECT COUNT(*) as count FROM services');
  let insertedCount = 0;
  if (!countResult || countResult.count === 0) {
    for (const service of aiServices) {
      const result = await db.run(`
        INSERT OR IGNORE INTO services (name, description, url, category, logo_url, status, is_featured)
        VALUES (?, ?, ?, ?, ?, 'approved', ?)
      `, [service.name, service.description, service.url, service.category, service.logo_url, service.is_featured || 0]);

      if (result.changes > 0) {
        insertedCount++;
      }
    }
    console.log(`Seeded ${insertedCount} default AI services`);
  }

  // Update existing/new services with correct featured status and descriptions from seed-data.js
  for (const service of aiServices) {
    await db.run(`
      UPDATE services SET is_featured = ?, description = ? WHERE name = ?
    `, [service.is_featured || 0, service.description, service.name]);
  }
  console.log('Updated is_featured status and descriptions for default AI services');
}

function getDb() {
  return db;
}

module.exports = { initializeDatabase, getDb };