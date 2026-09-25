const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5001';

class ProductServiceClient {
  /**
   * Check product details and stock from Product Service
   */
  async getProduct(productId) {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: data.error || { code: 'PRODUCT_ERROR', message: 'Error fetching product' }
        };
      }

      return { ok: true, product: data.data };
    } catch (err) {
      return {
        ok: false,
        statusCode: 502,
        error: {
          code: 'PRODUCT_SERVICE_UNAVAILABLE',
          message: `Failed to connect to Product Service at ${PRODUCT_SERVICE_URL}: ${err.message}`
        }
      };
    }
  }

  /**
   * Reserve stock in Product Service during order placement
   */
  async reserveStock(productId, quantity) {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}/reserve-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: data.error || { code: 'RESERVE_STOCK_FAILED', message: 'Failed to reserve stock' }
        };
      }

      return { ok: true, product: data.data };
    } catch (err) {
      return {
        ok: false,
        statusCode: 502,
        error: {
          code: 'PRODUCT_SERVICE_UNAVAILABLE',
          message: `Failed to connect to Product Service: ${err.message}`
        }
      };
    }
  }

  /**
   * Release stock back in Product Service if order is cancelled
   */
  async releaseStock(productId, quantity) {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}/release-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: data.error || { code: 'RELEASE_STOCK_FAILED', message: 'Failed to release stock' }
        };
      }

      return { ok: true, product: data.data };
    } catch (err) {
      console.error(`[Order Service] Warning: Failed to release stock for product ${productId}:`, err.message);
      return {
        ok: false,
        statusCode: 502,
        error: {
          code: 'PRODUCT_SERVICE_UNAVAILABLE',
          message: `Failed to connect to Product Service: ${err.message}`
        }
      };
    }
  }
}

module.exports = new ProductServiceClient();
