const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

// Dedicated SQLite database for Payment & Notification Service
const dbPath = path.join(__dirname, '..', 'payment_service.db');
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CREDIT_CARD',
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    transaction_ref TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ORDER_CONFIRMATION',
    status TEXT NOT NULL DEFAULT 'SENT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('[Payment Service DB] Dedicated SQLite database initialized.');

module.exports = {
  db,

  processPayment: ({ order_id, customer_id, amount, payment_method = 'CREDIT_CARD', customer_email = null }) => {
    db.exec('BEGIN TRANSACTION;');
    try {
      const transaction_ref = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
      const stmt = db.prepare(`
        INSERT INTO payments (order_id, customer_id, amount, payment_method, status, transaction_ref)
        VALUES (?, ?, ?, ?, 'SUCCESS', ?)
        RETURNING *
      `);
      const payment = stmt.get(order_id, customer_id, amount, payment_method, transaction_ref);

      // Trigger automatic receipt notification
      if (customer_email) {
        const notifStmt = db.prepare(`
          INSERT INTO notifications (recipient_email, subject, message, type, status)
          VALUES (?, ?, ?, 'ORDER_CONFIRMATION', 'SENT')
        `);
        notifStmt.run(
          customer_email,
          `Payment Receipt for Order #${order_id}`,
          `Your payment of $${amount.toFixed(2)} via ${payment_method} was successful. Transaction Ref: ${transaction_ref}`
        );
      }

      db.exec('COMMIT;');
      return payment;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  refundPaymentByOrderId: (order_id, customer_email = null) => {
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order_id);
    if (!payment) return null;

    const stmt = db.prepare(`
      UPDATE payments 
      SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    const refunded = stmt.get(payment.id);

    if (customer_email) {
      const notifStmt = db.prepare(`
        INSERT INTO notifications (recipient_email, subject, message, type, status)
        VALUES (?, ?, ?, 'ORDER_REFUND', 'SENT')
      `);
      notifStmt.run(
        customer_email,
        `Refund Processed for Order #${order_id}`,
        `A full refund of $${payment.amount.toFixed(2)} has been processed to your ${payment.payment_method}.`
      );
    }

    return refunded;
  },

  getAllPayments: () => {
    return db.prepare('SELECT * FROM payments ORDER BY id DESC').all();
  },

  getPaymentById: (id) => {
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  },

  getPaymentByOrderId: (order_id) => {
    return db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order_id);
  },

  deletePayment: (id) => {
    const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    if (!existing) return null;
    db.prepare('DELETE FROM payments WHERE id = ?').run(id);
    return existing;
  },

  getAllNotifications: () => {
    return db.prepare('SELECT * FROM notifications ORDER BY id DESC').all();
  },

  sendNotification: ({ recipient_email, subject, message, type = 'GENERAL' }) => {
    const stmt = db.prepare(`
      INSERT INTO notifications (recipient_email, subject, message, type, status)
      VALUES (?, ?, ?, ?, 'SENT')
      RETURNING *
    `);
    return stmt.get(recipient_email, subject, message, type);
  }
};
