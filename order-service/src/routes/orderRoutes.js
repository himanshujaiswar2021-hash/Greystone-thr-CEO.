const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Order CRUD routes
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', orderController.getOrderById);
router.post('/orders', orderController.createOrder);
router.put('/orders/:id/status', orderController.updateOrderStatus);
router.delete('/orders/:id', orderController.deleteOrder);

module.exports = router;
