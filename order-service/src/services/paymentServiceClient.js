const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';

class PaymentServiceClient {
  async processPayment({ order_id, customer_id, amount, payment_method = 'CREDIT_CARD', customer_email = null }) {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, customer_id, amount, payment_method, customer_email })
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: data.error || { code: 'PAYMENT_FAILED', message: 'Payment processing failed' }
        };
      }

      return { ok: true, payment: data.data };
    } catch (err) {
      return {
        ok: false,
        statusCode: 502,
        error: {
          code: 'PAYMENT_SERVICE_UNAVAILABLE',
          message: `Failed to connect to Payment Service at ${PAYMENT_SERVICE_URL}: ${err.message}`
        }
      };
    }
  }

  async refundPayment(order_id, customer_email = null) {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/order/${order_id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_email })
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: data.error || { code: 'REFUND_FAILED', message: 'Refund processing failed' }
        };
      }

      return { ok: true, payment: data.data };
    } catch (err) {
      console.error(`[Order Service] Warning: Failed to refund payment for order ${order_id}:`, err.message);
      return {
        ok: false,
        statusCode: 502,
        error: {
          code: 'PAYMENT_SERVICE_UNAVAILABLE',
          message: `Failed to connect to Payment Service: ${err.message}`
        }
      };
    }
  }
}

module.exports = new PaymentServiceClient();
