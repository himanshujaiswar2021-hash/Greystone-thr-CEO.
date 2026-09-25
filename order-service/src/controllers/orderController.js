const db = require('../database');
const productServiceClient = require('../services/productServiceClient');
const customerServiceClient = require('../services/customerServiceClient');
const paymentServiceClient = require('../services/paymentServiceClient');

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

// Create a new order with Inter-Service Choreography (Customer -> Product -> Payment)
exports.createOrder = async (req, res) => {
  try {
    let { customer_id, customer_name, customer_email, payment_method, items } = req.body;

    // Validation
    if (!customer_id && (!customer_name || !customer_email)) {
      return sendError(res, 'VALIDATION_ERROR', 'Either customer_id or customer_name and customer_email are required', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'items array cannot be empty', 400);
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Each item must have a valid product_id and positive quantity', 400);
      }
    }

    // Step 1: Inter-service communication with Customer Service (Port 5003)
    if (customer_id) {
      console.log(`[Order Service -> Customer Service] Verifying customer ID: ${customer_id}`);
      const custResult = await customerServiceClient.verifyCustomer(customer_id);
      if (!custResult.ok) {
        return sendError(res, custResult.error.code, custResult.error.message, custResult.statusCode);
      }
      customer_name = custResult.customer.name;
      customer_email = custResult.customer.email;
    }

    // Step 2: Inter-service communication with Product Service (Port 5001) - Check availability
    const verifiedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      console.log(`[Order Service -> Product Service] Verifying product ID: ${item.product_id}`);
      const checkResult = await productServiceClient.getProduct(item.product_id);

      if (!checkResult.ok) {
        return sendError(res, checkResult.error.code, checkResult.error.message, checkResult.statusCode);
      }

      const product = checkResult.product;
      if (product.stock_quantity < item.quantity) {
        return sendError(
          res,
          'INSUFFICIENT_STOCK',
          `Cannot place order: Product '${product.name}' only has ${product.stock_quantity} units available (requested ${item.quantity}).`,
          409
        );
      }

      const subtotal = Number((product.price * item.quantity).toFixed(2));
      calculatedTotal += subtotal;

      verifiedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal
      });
    }

    // Step 3: Inter-service communication - Reserve stock in Product Service
    const reservedItems = [];
    for (const item of verifiedItems) {
      console.log(`[Order Service -> Product Service] Reserving ${item.quantity} units for product ID: ${item.product_id}`);
      const reserveResult = await productServiceClient.reserveStock(item.product_id, item.quantity);

      if (!reserveResult.ok) {
        // Rollback reserved stock
        console.warn(`[Order Service] Reservation failed for product ${item.product_id}. Rolling back reserved stock...`);
        for (const reserved of reservedItems) {
          await productServiceClient.releaseStock(reserved.product_id, reserved.quantity);
        }
        return sendError(res, reserveResult.error.code, reserveResult.error.message, reserveResult.statusCode);
      }

      reservedItems.push(item);
    }

    const totalAmount = Number(calculatedTotal.toFixed(2));

    // Step 4: Inter-service communication with Payment Service (Port 5004) - Process Payment
    console.log(`[Order Service -> Payment Service] Processing payment of $${totalAmount} for ${customer_email}...`);
    // Pre-create order or generate ID for tracking
    const newOrder = db.createOrder({
      customer_id: customer_id ? Number(customer_id) : null,
      customer_name,
      customer_email,
      total_amount: totalAmount,
      status: 'CONFIRMED',
      payment_status: 'PAID',
      items: verifiedItems
    });

    const paymentResult = await paymentServiceClient.processPayment({
      order_id: newOrder.id,
      customer_id: customer_id ? Number(customer_id) : 1,
      amount: totalAmount,
      payment_method: payment_method || 'CREDIT_CARD',
      customer_email
    });

    if (!paymentResult.ok) {
      console.warn(`[Order Service] Payment failed. Rolling back order and releasing stock...`);
      for (const reserved of reservedItems) {
        await productServiceClient.releaseStock(reserved.product_id, reserved.quantity);
      }
      db.deleteOrder(newOrder.id);
      return sendError(res, paymentResult.error.code, paymentResult.error.message, paymentResult.statusCode);
    }

    // Update order with transaction reference
    db.updateOrderStatus(newOrder.id, 'CONFIRMED', 'PAID');
    newOrder.transaction_ref = paymentResult.payment.transaction_ref;
    newOrder.payment_details = paymentResult.payment;

    console.log(`[Order Service] Order #${newOrder.id} confirmed with payment ref: ${newOrder.transaction_ref}`);
    return sendSuccess(res, newOrder, 'Order placed, inventory reserved, payment processed, and receipt sent', 201);

  } catch (error) {
    console.error('[Order Service] Error creating order:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Get all orders
exports.getAllOrders = (req, res) => {
  try {
    const orders = db.getAllOrders();
    return sendSuccess(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Get order by ID
exports.getOrderById = (req, res) => {
  try {
    const { id } = req.params;
    const order = db.getOrderById(Number(id));
    if (!order) {
      return sendError(res, 'ORDER_NOT_FOUND', `Order with ID ${id} not found`, 404);
    }
    return sendSuccess(res, order, 'Order details retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Update order status (PUT /api/orders/:id/status)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'DELIVERED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return sendError(res, 'VALIDATION_ERROR', `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const currentOrder = db.getOrderById(Number(id));
    if (!currentOrder) {
      return sendError(res, 'ORDER_NOT_FOUND', `Order with ID ${id} not found`, 404);
    }

    const newStatus = status.toUpperCase();

    // Cancellation: trigger stock release AND payment refund
    if (newStatus === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
      console.log(`[Order Service -> Product Service] Releasing stock for cancelled order #${id}...`);
      for (const item of currentOrder.items) {
        await productServiceClient.releaseStock(item.product_id, item.quantity);
      }

      console.log(`[Order Service -> Payment Service] Requesting refund for cancelled order #${id}...`);
      await paymentServiceClient.refundPayment(id, currentOrder.customer_email);
    }

    const updated = db.updateOrderStatus(Number(id), newStatus, newStatus === 'CANCELLED' ? 'REFUNDED' : null);
    return sendSuccess(res, updated, `Order status updated to ${newStatus}`, 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Delete order (DELETE /api/orders/:id)
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.getOrderById(Number(id));
    if (!existing) {
      return sendError(res, 'ORDER_NOT_FOUND', `Order with ID ${id} not found`, 404);
    }

    if (existing.status !== 'CANCELLED') {
      console.log(`[Order Service] Releasing stock and requesting refund before deleting order #${id}...`);
      for (const item of existing.items) {
        await productServiceClient.releaseStock(item.product_id, item.quantity);
      }
      await paymentServiceClient.refundPayment(id, existing.customer_email);
    }

    const deleted = db.deleteOrder(Number(id));
    return sendSuccess(res, { deletedOrderId: Number(id) }, 'Order deleted successfully', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};
