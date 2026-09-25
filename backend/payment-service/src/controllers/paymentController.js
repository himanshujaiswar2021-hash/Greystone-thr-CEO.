const db = require('../database');

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

// Process Payment (Inter-Service API called by Order Service)
exports.processPayment = (req, res) => {
  try {
    const { order_id, customer_id, amount, payment_method, customer_email } = req.body;

    if (!order_id || !customer_id || amount === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'order_id, customer_id, and amount are required', 400);
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return sendError(res, 'VALIDATION_ERROR', 'amount must be a positive number', 400);
    }

    const payment = db.processPayment({
      order_id: Number(order_id),
      customer_id: Number(customer_id),
      amount: Number(amount),
      payment_method: payment_method || 'CREDIT_CARD',
      customer_email
    });

    return sendSuccess(res, payment, 'Payment processed and receipt notification dispatched', 201);
  } catch (error) {
    return sendError(res, 'PAYMENT_FAILED', error.message, 500);
  }
};

// Refund Payment (Inter-Service API called on Order Cancellation)
exports.refundPayment = (req, res) => {
  try {
    const { order_id } = req.params;
    const { customer_email } = req.body || {};

    const refunded = db.refundPaymentByOrderId(Number(order_id), customer_email);
    if (!refunded) {
      return sendError(res, 'PAYMENT_NOT_FOUND', `No payment record found for order ID ${order_id}`, 404);
    }

    return sendSuccess(res, refunded, 'Payment successfully refunded and notification sent', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.getAllPayments = (req, res) => {
  try {
    const payments = db.getAllPayments();
    return sendSuccess(res, payments, 'Payments retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.getPaymentById = (req, res) => {
  try {
    const { id } = req.params;
    const payment = db.getPaymentById(Number(id));
    if (!payment) {
      return sendError(res, 'PAYMENT_NOT_FOUND', `Payment with ID ${id} not found`, 404);
    }
    return sendSuccess(res, payment, 'Payment details retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.deletePayment = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deletePayment(Number(id));
    if (!deleted) {
      return sendError(res, 'PAYMENT_NOT_FOUND', `Payment with ID ${id} not found`, 404);
    }
    return sendSuccess(res, { deletedId: Number(id) }, 'Payment record deleted', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Notification APIs
exports.getAllNotifications = (req, res) => {
  try {
    const notifs = db.getAllNotifications();
    return sendSuccess(res, notifs, 'Notifications log retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.sendNotification = (req, res) => {
  try {
    const { recipient_email, subject, message, type } = req.body;
    if (!recipient_email || !subject || !message) {
      return sendError(res, 'VALIDATION_ERROR', 'recipient_email, subject, and message are required', 400);
    }
    const notif = db.sendNotification({ recipient_email, subject, message, type });
    return sendSuccess(res, notif, 'Notification dispatched successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};
