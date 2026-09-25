const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payments
router.get('/payments', paymentController.getAllPayments);
router.get('/payments/:id', paymentController.getPaymentById);
router.post('/payments/process', paymentController.processPayment);
router.post('/payments/order/:order_id/refund', paymentController.refundPayment);
router.delete('/payments/:id', paymentController.deletePayment);

// Notifications
router.get('/notifications', paymentController.getAllNotifications);
router.post('/notifications/send', paymentController.sendNotification);

module.exports = router;
