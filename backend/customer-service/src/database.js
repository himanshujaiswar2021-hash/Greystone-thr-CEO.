const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

// Dedicated SQLite database for Customer Service
const dbPath = path.join(__dirname, '..', 'customer_service.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
  );
`);

// Seed initial customers if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM customers');
if (countStmt.get().count === 0) {
  const insertCust = db.prepare('INSERT INTO customers (name, email, phone, status) VALUES (?, ?, ?, ?)');
  insertCust.run('Alice Smith', 'alice.smith@example.com', '+1-555-0101', 'ACTIVE');
  insertCust.run('Bob Johnson', 'bob.johnson@example.com', '+1-555-0102', 'ACTIVE');
  insertCust.run('Charlie Brown', 'charlie.brown@example.com', '+1-555-0103', 'SUSPENDED');

  const insertAddr = db.prepare('INSERT INTO addresses (customer_id, street, city, state, zip_code) VALUES (?, ?, ?, ?, ?)');
  insertAddr.run(1, '123 Market St', 'San Francisco', 'CA', '94105');
  insertAddr.run(2, '456 Tech Blvd', 'Austin', 'TX', '78701');

  console.log('[Customer Service DB] Seeded initial customer and address records.');
}

module.exports = {
  db,

  getAllCustomers: () => {
    const customers = db.prepare('SELECT * FROM customers ORDER BY id ASC').all();
    const addrStmt = db.prepare('SELECT * FROM addresses WHERE customer_id = ?');
    return customers.map(c => ({
      ...c,
      addresses: addrStmt.all(c.id)
    }));
  },

  getCustomerById: (id) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) return null;
    const addresses = db.prepare('SELECT * FROM addresses WHERE customer_id = ?').all(id);
    return {
      ...customer,
      addresses
    };
  },

  createCustomer: ({ name, email, phone, status = 'ACTIVE' }) => {
    const stmt = db.prepare(`
      INSERT INTO customers (name, email, phone, status)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(name, email, phone || null, status);
  },

  updateCustomer: (id, { name, email, phone, status }) => {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) return null;

    const uName = name !== undefined ? name : existing.name;
    const uEmail = email !== undefined ? email : existing.email;
    const uPhone = phone !== undefined ? phone : existing.phone;
    const uStatus = status !== undefined ? status : existing.status;

    const stmt = db.prepare(`
      UPDATE customers 
      SET name = ?, email = ?, phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    const updated = stmt.get(uName, uEmail, uPhone, uStatus, id);
    const addresses = db.prepare('SELECT * FROM addresses WHERE customer_id = ?').all(id);
    return {
      ...updated,
      addresses
    };
  },

  deleteCustomer: (id) => {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) return null;
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return existing;
  },

  // Addresses
  addAddress: (customerId, { street, city, state, zip_code }) => {
    const stmt = db.prepare(`
      INSERT INTO addresses (customer_id, street, city, state, zip_code)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(customerId, street, city, state, zip_code);
  }
};
