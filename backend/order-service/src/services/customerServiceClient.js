const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:5003';

class CustomerServiceClient {
  async verifyCustomer(customerId) {
    try {
      const response = await fetch(`${CUSTOMER_SERVICE_URL}/api/customers/${customerId}/verify`);
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: data.error || { code: 'CUSTOMER_VERIFICATION_FAILED', message: 'Customer verification failed' }
        };
      }

      return { ok: true, customer: data.data };
    } catch (err) {
      return {
        ok: false,
        statusCode: 502,
        error: {
          code: 'CUSTOMER_SERVICE_UNAVAILABLE',
          message: `Failed to connect to Customer Service at ${CUSTOMER_SERVICE_URL}: ${err.message}`
        }
      };
    }
  }
}

module.exports = new CustomerServiceClient();
