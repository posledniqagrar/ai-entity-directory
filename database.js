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
  await seedAdminUser();
  return db;
}

async function seedAdminUser() {
  const adminEmail = 's.arsov@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'fbdZsIJUScN4LUFknYUom7O8';
  const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', adminEmail);
  if (existingAdmin) {
    console.log(`Admin user already exists with id=${existingAdmin.id}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const result = await db.run(
    'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
    [adminEmail, passwordHash, 'admin']
  );

  console.log(`Seeded admin user id=${result.lastID}, email=${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('Using default ADMIN_PASSWORD from code; change it with the ADMIN_PASSWORD environment variable.');
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
  if (countResult && countResult.count > 0) {
    console.log(`Services already seeded: ${countResult.count}`);
    return;
  }

  let insertedCount = 0;
  for (const service of aiServices) {
    const result = await db.run(`
      INSERT OR IGNORE INTO services (name, description, url, category, logo_url, status)
      VALUES (?, ?, ?, ?, ?, 'approved')
    `, [service.name, service.description, service.url, service.category, service.logo_url]);

    if (result.changes > 0) {
      insertedCount++;
    }
  }

  console.log(`Seeded ${insertedCount} default AI services`);
}

function getDb() {
  return db;
}

module.exports = { initializeDatabase, getDb };