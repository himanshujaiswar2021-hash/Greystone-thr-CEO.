const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product CRUD routes
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Inter-Service routes
router.post('/products/:id/reserve-stock', productController.reserveStock);
router.post('/products/:id/release-stock', productController.releaseStock);

// Category routes
router.get('/categories', productController.getAllCategories);
router.post('/categories', productController.createCategory);

module.exports = router;
