const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { aiServices } = require('./seed-data');

async function initDatabase() {
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
  }

  const dbPath = path.join(dataDir, 'ai-services.db');
  console.log('Database path:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
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
  
  await migrateSchema(db);

  // Delete legacy admin user if exists
  await db.run('DELETE FROM users WHERE email = ?', ['admin@example.com']);

  // Hash password for admin
  const hashedPassword = await bcrypt.hash('Zakarum1!', 12);
  
  // Insert admin user (only if not exists) or update existing
  const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', ['s.arsov@gmail.com']);
  if (existingAdmin) {
    await db.run('UPDATE users SET password_hash = ?, role = "admin", is_active = 1 WHERE email = ?', [hashedPassword, 's.arsov@gmail.com']);
  } else {
    await db.run(`
      INSERT INTO users (email, password_hash, role, is_active) 
      VALUES ('s.arsov@gmail.com', ?, 'admin', 1)
    `, [hashedPassword]);
  }
  
  // Insert AI services
  let insertedCount = 0;
  for (const service of aiServices) {
    const result = await db.run(`
      INSERT OR IGNORE INTO services (name, description, url, category, logo_url, status, is_featured) 
      VALUES (?, ?, ?, ?, ?, 'approved', ?)
    `, [service.name, service.description, service.url, service.category, service.logo_url, service.is_featured || 0]);
    
    if (result.changes > 0) {
      insertedCount++;
    }
  }

  // Update existing services with correct fields from seed-data.js
  for (const service of aiServices) {
    await db.run(`
      UPDATE services 
      SET is_featured = ?, description = ?, url = ?, category = ?, logo_url = ? 
      WHERE name = ?
    `, [service.is_featured || 0, service.description, service.url, service.category, service.logo_url, service.name]);
  }
  
  console.log(`Database initialized successfully!`);
  console.log(`Total services in database: ${aiServices.length}`);
  console.log(`New services added: ${insertedCount}`);
  console.log(`\n✅ Admin login: s.arsov@gmail.com / Zakarum1!`);
  console.log(`\n🚀 Run 'npm start' to launch the server`);
  console.log(`\n📝 New Feature: Users can submit AI services for admin approval!`);
}

async function migrateSchema(db) {
  await ensureColumns(db, 'users', [
    { name: 'role', def: "TEXT DEFAULT 'user'" },
    { name: 'is_active', def: 'INTEGER DEFAULT 1' },
    { name: 'created_at', def: 'DATETIME' }
  ]);

  await ensureColumns(db, 'services', [
    { name: 'status', def: "TEXT DEFAULT 'approved'" },
    { name: 'is_featured', def: 'INTEGER DEFAULT 0' },
    { name: 'submitted_by', def: 'INTEGER' },
    { name: 'submitted_at', def: 'DATETIME' },
    { name: 'approved_by', def: 'INTEGER' },
    { name: 'approved_at', def: 'DATETIME' },
    { name: 'created_at', def: 'DATETIME' }
  ]);

  await ensureColumns(db, 'pending_services', [
    { name: 'submitter_email', def: 'TEXT' },
    { name: 'status', def: "TEXT DEFAULT 'pending'" },
    { name: 'rejection_reason', def: 'TEXT' }
  ]);
}

async function ensureColumns(db, table, columns) {
  const existingColumns = await db.all(`PRAGMA table_info(${table})`);
  const existingNames = existingColumns.map(column => column.name);
  for (const column of columns) {
    if (!existingNames.includes(column.name)) {
      await db.run(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.def}`);
      console.log(`Added missing column ${column.name} to ${table}`);
    }
  }
}

initDatabase().catch(err => {
  console.error('Error initializing database:', err);
});