const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dbPath = path.join(__dirname, '..', 'product_service.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
  );
`);

// Seed initial data if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM categories');
const categoryCount = countStmt.get().count;

if (categoryCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  insertCat.run('Electronics', 'Gadgets, computers, and electronic accessories');
  insertCat.run('Office Supplies', 'Workplace, desk, and office stationery');

  const insertProd = db.prepare(
    'INSERT INTO products (name, description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?)'
  );
  insertProd.run('Ergonomic Mechanical Keyboard', 'RGB backlit mechanical keyboard with blue switches', 79.99, 25, 1);
  insertProd.run('Wireless Optical Mouse', '2.4GHz wireless ergonomic optical mouse', 24.50, 50, 1);
  insertProd.run('Noise Cancelling Headphones', 'Over-ear Bluetooth active noise cancelling headphones', 129.00, 15, 1);
  insertProd.run('Standing Desk Converter', 'Height adjustable dual monitor standing desk riser', 189.99, 10, 2);
  console.log('[Product Service DB] Initial seed data created successfully.');
}

module.exports = {
  db,
  
  // Category operations
  getAllCategories: () => {
    return db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  },

  getCategoryById: (id) => {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  createCategory: (name, description) => {
    const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *').get(name, description);
    return result;
  },

  // Product CRUD operations
  getAllProducts: (categoryId = null) => {
    if (categoryId) {
      return db.prepare(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.category_id = ?
        ORDER BY p.id ASC
      `).all(categoryId);
    }
    return db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.id ASC
    `).all();
  },

  getProductById: (id) => {
    return db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `).get(id);
  },

  createProduct: ({ name, description, price, stock_quantity, category_id }) => {
    const stmt = db.prepare(`
      INSERT INTO products (name, description, price, stock_quantity, category_id)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(name, description || '', price, stock_quantity || 0, category_id || null);
  },

  updateProduct: (id, { name, description, price, stock_quantity, category_id }) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return null;

    const updatedName = name !== undefined ? name : existing.name;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedPrice = price !== undefined ? price : existing.price;
    const updatedStock = stock_quantity !== undefined ? stock_quantity : existing.stock_quantity;
    const updatedCat = category_id !== undefined ? category_id : existing.category_id;

    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, stock_quantity = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(updatedName, updatedDesc, updatedPrice, updatedStock, updatedCat, id);
  },

  deleteProduct: (id) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return null;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return existing;
  },

  // Inter-service inventory reservation
  reserveStock: (id, quantity) => {
    db.exec('BEGIN TRANSACTION;');
    try {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!product) {
        db.exec('ROLLBACK;');
        return { error: 'PRODUCT_NOT_FOUND', message: `Product with ID ${id} not found.` };
      }
      if (product.stock_quantity < quantity) {
        db.exec('ROLLBACK;');
        return {
          error: 'INSUFFICIENT_STOCK',
          message: `Product '${product.name}' only has ${product.stock_quantity} units available (requested ${quantity}).`
        };
      }
      const updated = db.prepare(`
        UPDATE products 
        SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(quantity, id);
      db.exec('COMMIT;');
      return { success: true, product: updated };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  // Inter-service stock release (e.g. order cancelled)
  releaseStock: (id, quantity) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return { error: 'PRODUCT_NOT_FOUND', message: `Product with ID ${id} not found.` };
    }
    const updated = db.prepare(`
      UPDATE products 
      SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).get(quantity, id);
    return { success: true, product: updated };
  }
};
