const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

// Dedicated SQLite database for Order Service
const dbPath = path.join(__dirname, '..', 'order_service.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payment_status TEXT NOT NULL DEFAULT 'PAID',
    transaction_ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
  );
`);

// Check if columns exist in orders table (for backward compatibility)
try {
  db.exec('ALTER TABLE orders ADD COLUMN customer_id INTEGER;');
} catch (e) { /* already exists */ }
try {
  db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PAID';");
} catch (e) { /* already exists */ }
try {
  db.exec('ALTER TABLE orders ADD COLUMN transaction_ref TEXT;');
} catch (e) { /* already exists */ }

console.log('[Order Service DB] Dedicated SQLite database initialized.');

module.exports = {
  db,

  getAllOrders: () => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    return orders.map(order => ({
      ...order,
      items: itemStmt.all(order.id)
    }));
  },

  getOrderById: (id) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return {
      ...order,
      items
    };
  },

  createOrder: ({ customer_id, customer_name, customer_email, total_amount, status = 'CONFIRMED', payment_status = 'PAID', transaction_ref = null, items }) => {
    db.exec('BEGIN TRANSACTION;');
    try {
      const orderStmt = db.prepare(`
        INSERT INTO orders (customer_id, customer_name, customer_email, total_amount, status, payment_status, transaction_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `);
      const newOrder = orderStmt.get(customer_id || null, customer_name, customer_email, total_amount, status, payment_status, transaction_ref);

      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `);

      const createdItems = items.map(item => {
        const subtotal = Number((item.quantity * item.unit_price).toFixed(2));
        return itemStmt.get(
          newOrder.id,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          subtotal
        );
      });

      db.exec('COMMIT;');
      return {
        ...newOrder,
        items: createdItems
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  updateOrderStatus: (id, status, payment_status = null) => {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) return null;

    let updated;
    if (payment_status) {
      const stmt = db.prepare(`
        UPDATE orders 
        SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `);
      updated = stmt.get(status, payment_status, id);
    } else {
      const stmt = db.prepare(`
        UPDATE orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `);
      updated = stmt.get(status, id);
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return {
      ...updated,
      items
    };
  },

  deleteOrder: (id) => {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return {
      ...existing,
      items
    };
  }
};
