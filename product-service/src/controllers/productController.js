const db = require('../database');

// Standard Response Helpers
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, errorCode, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message
    },
    timestamp: new Date().toISOString()
  });
};

// Controllers
exports.getAllProducts = (req, res) => {
  try {
    const { category_id } = req.query;
    const products = db.getAllProducts(category_id ? Number(category_id) : null);
    return sendSuccess(res, products, 'Products retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.getProductById = (req, res) => {
  try {
    const { id } = req.params;
    const product = db.getProductById(Number(id));
    if (!product) {
      return sendError(res, 'PRODUCT_NOT_FOUND', `Product with ID ${id} not found`, 404);
    }
    return sendSuccess(res, product, 'Product details retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.createProduct = (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id } = req.body;
    if (!name || price === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'Name and price are required fields', 400);
    }
    if (typeof price !== 'number' || price < 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Price must be a positive number', 400);
    }
    if (stock_quantity !== undefined && (typeof stock_quantity !== 'number' || stock_quantity < 0)) {
      return sendError(res, 'VALIDATION_ERROR', 'Stock quantity must be a non-negative integer', 400);
    }

    const newProduct = db.createProduct({
      name,
      description,
      price: Number(price),
      stock_quantity: stock_quantity ? Number(stock_quantity) : 0,
      category_id: category_id ? Number(category_id) : null
    });
    return sendSuccess(res, newProduct, 'Product created successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.updateProduct = (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category_id } = req.body;

    const existing = db.getProductById(Number(id));
    if (!existing) {
      return sendError(res, 'PRODUCT_NOT_FOUND', `Product with ID ${id} not found`, 404);
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return sendError(res, 'VALIDATION_ERROR', 'Price must be a non-negative number', 400);
    }
    if (stock_quantity !== undefined && (typeof stock_quantity !== 'number' || stock_quantity < 0)) {
      return sendError(res, 'VALIDATION_ERROR', 'Stock quantity must be a non-negative integer', 400);
    }

    const updated = db.updateProduct(Number(id), {
      name,
      description,
      price,
      stock_quantity,
      category_id
    });
    return sendSuccess(res, updated, 'Product updated successfully', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.deleteProduct = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteProduct(Number(id));
    if (!deleted) {
      return sendError(res, 'PRODUCT_NOT_FOUND', `Product with ID ${id} not found`, 404);
    }
    return sendSuccess(res, { deletedId: Number(id) }, 'Product deleted successfully', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Inter-Service Communication Endpoint: Reserve Stock
exports.reserveStock = (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive integer', 400);
    }

    const result = db.reserveStock(Number(id), quantity);
    if (result.error) {
      const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 409;
      return sendError(res, result.error, result.message, statusCode);
    }

    return sendSuccess(res, result.product, `Successfully reserved ${quantity} units`, 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Inter-Service Communication Endpoint: Release Stock
exports.releaseStock = (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive integer', 400);
    }

    const result = db.releaseStock(Number(id), quantity);
    if (result.error) {
      return sendError(res, result.error, result.message, 404);
    }

    return sendSuccess(res, result.product, `Successfully released ${quantity} units back to stock`, 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Categories
exports.getAllCategories = (req, res) => {
  try {
    const categories = db.getAllCategories();
    return sendSuccess(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.createCategory = (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return sendError(res, 'VALIDATION_ERROR', 'Category name is required', 400);
    }
    const cat = db.createCategory(name, description || '');
    return sendSuccess(res, cat, 'Category created successfully', 201);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return sendError(res, 'CATEGORY_EXISTS', 'A category with this name already exists', 409);
    }
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};
