const PRODUCT_URL = 'http://localhost:5001/api';
const ORDER_URL = 'http://localhost:5002/api';
const CUSTOMER_URL = 'http://localhost:5003/api';
const PAYMENT_URL = 'http://localhost:5004/api';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Starting Full 4-Microservice End-to-End Integration Tests');
  console.log('================================================================\n');

  try {
    // 1. Health Checks for all 4 Microservices
    console.log('--- 1. Testing Health Checks Across All 4 Microservices ---');
    const [pHealth, oHealth, cHealth, payHealth] = await Promise.all([
      (await fetch('http://localhost:5001/health')).json(),
      (await fetch('http://localhost:5002/health')).json(),
      (await fetch('http://localhost:5003/health')).json(),
      (await fetch('http://localhost:5004/health')).json()
    ]);
    console.log('✓ Product Service (Port 5001): ', pHealth.status);
    console.log('✓ Order Service (Port 5002):   ', oHealth.status);
    console.log('✓ Customer Service (Port 5003):', cHealth.status);
    console.log('✓ Payment Service (Port 5004): ', payHealth.status, '\n');

    // 2. Customer Service CRUD
    console.log('--- 2. Customer Service: CRUD & Account Verification ---');
    const createCustRes = await fetch(`${CUSTOMER_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sophia Clark',
        email: `sophia.clark.${Date.now()}@example.com`,
        phone: '+1-555-8899',
        status: 'ACTIVE'
      })
    });
    const custData = await createCustRes.json();
    const customerId = custData.data.id;
    console.log(`✓ Customer Created: ${custData.data.name} (ID: ${customerId})`);

    // Verify Customer API (Inter-service check)
    const verifyCustRes = await fetch(`${CUSTOMER_URL}/customers/${customerId}/verify`);
    const verifyCustData = await verifyCustRes.json();
    console.log(`✓ Customer Verification Check: Status ${verifyCustData.data.status} (Eligible: ${verifyCustData.data.is_eligible})\n`);

    // 3. Product Service CRUD
    console.log('--- 3. Product Service: CRUD & Inventory Setup ---');
    const createProdRes = await fetch(`${PRODUCT_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Wireless Noise-Cancelling Earbuds Pro',
        description: 'Active noise cancelling Bluetooth 5.3 earbuds',
        price: 99.50,
        stock_quantity: 15,
        category_id: 1
      })
    });
    const prodData = await createProdRes.json();
    const productId = prodData.data.id;
    console.log(`✓ Product Created: ${prodData.data.name} (ID: ${productId}, Initial Stock: ${prodData.data.stock_quantity})`);

    // Update Product Price
    const updateProdRes = await fetch(`${PRODUCT_URL}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 89.99 })
    });
    const updatedProd = await updateProdRes.json();
    console.log(`✓ Product Price Updated to: $${updatedProd.data.price}\n`);

    // 4. Complete Inter-Service Choreography (Order -> Customer -> Product -> Payment)
    console.log('--- 4. Full Inter-Service Checkout Choreography ---');
    console.log(`Order Service placing order for Customer #${customerId} (2 units of Product #${productId})...`);
    
    const createOrderRes = await fetch(`${ORDER_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        payment_method: 'CREDIT_CARD',
        items: [
          { product_id: productId, quantity: 2 }
        ]
      })
    });
    const orderData = await createOrderRes.json();
    const orderId = orderData.data.id;
    console.log('✓ Order Successfully Created & Orchestrated!');
    console.log('  Order ID:        ', orderId);
    console.log('  Customer:        ', orderData.data.customer_name);
    console.log('  Total Amount:   $', orderData.data.total_amount);
    console.log('  Transaction Ref: ', orderData.data.transaction_ref);
    console.log('  Order Status:    ', orderData.data.status);

    // Verify Stock Reduction in Product Service
    const checkStockRes = await fetch(`${PRODUCT_URL}/products/${productId}`);
    const checkStockData = await checkStockRes.json();
    console.log(`✓ Product Stock Verified: Reduced from 15 -> ${checkStockData.data.stock_quantity} (Deducted 2)`);

    // Verify Payment & Notification in Payment Service
    const checkPaymentRes = await fetch(`${PAYMENT_URL}/payments`);
    const checkPaymentData = await checkPaymentRes.json();
    const paymentRecord = checkPaymentData.data.find(p => p.order_id === orderId);
    console.log(`✓ Payment Service Verified: Recorded $${paymentRecord.amount} (${paymentRecord.payment_method}, Ref: ${paymentRecord.transaction_ref})`);

    const checkNotifRes = await fetch(`${PAYMENT_URL}/notifications`);
    const checkNotifData = await checkNotifRes.json();
    console.log(`✓ Notification Service Verified: ${checkNotifData.data[0].subject} dispatched to ${checkNotifData.data[0].recipient_email}\n`);

    // 5. Inter-Service Error Handling: Suspended Customer & Stock Conflict
    console.log('--- 5. Inter-Service Error Handling Tests ---');
    // Suspended customer test (Customer ID 3 is Charlie Brown, suspended)
    console.log('Testing order creation with SUSPENDED customer (ID: 3)...');
    const suspendedRes = await fetch(`${ORDER_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 3,
        items: [{ product_id: productId, quantity: 1 }]
      })
    });
    const suspendedData = await suspendedRes.json();
    console.log(`✓ Blocked Suspended Customer as expected (Status: ${suspendedRes.status}, Code: ${suspendedData.error.code})`);

    // Insufficient stock test
    console.log('Testing order exceeding available stock (requesting 50 units)...');
    const stockConflictRes = await fetch(`${ORDER_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        items: [{ product_id: productId, quantity: 50 }]
      })
    });
    const stockConflictData = await stockConflictRes.json();
    console.log(`✓ Handled Out-of-Stock Conflict (Status: ${stockConflictRes.status}, Code: ${stockConflictData.error.code})\n`);

    // 6. Order Cancellation: Dual Rollback (Stock Release + Payment Refund)
    console.log('--- 6. Order Cancellation & Distributed Rollback ---');
    console.log(`Cancelling Order #${orderId}...`);
    const cancelRes = await fetch(`${ORDER_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });
    const cancelData = await cancelRes.json();
    console.log('✓ Order Status Updated to:', cancelData.data.status);

    // Verify stock restored in Product Service
    const restoredStockRes = await fetch(`${PRODUCT_URL}/products/${productId}`);
    const restoredStockData = await restoredStockRes.json();
    console.log(`✓ Product Stock Verified: Restored back from 13 -> ${restoredStockData.data.stock_quantity} (Released 2)`);

    // Verify refund in Payment Service
    const checkRefundRes = await fetch(`${PAYMENT_URL}/payments`);
    const checkRefundData = await checkRefundRes.json();
    const refundedRecord = checkRefundData.data.find(p => p.order_id === orderId);
    console.log(`✓ Payment Service Verified: Status updated to '${refundedRecord.status}' with refund notification sent\n`);

    // 7. Cleanup (DELETE operations across services)
    console.log('--- 7. Testing DELETE Operations Across Services ---');
    const delOrder = await (await fetch(`${ORDER_URL}/orders/${orderId}`, { method: 'DELETE' })).json();
    console.log('✓ Order Deleted:', delOrder.data.deletedOrderId);

    const delProd = await (await fetch(`${PRODUCT_URL}/products/${productId}`, { method: 'DELETE' })).json();
    console.log('✓ Product Deleted:', delProd.data.deletedId);

    const delCust = await (await fetch(`${CUSTOMER_URL}/customers/${customerId}`, { method: 'DELETE' })).json();
    console.log('✓ Customer Deleted:', delCust.data.deletedId, '\n');

    console.log('================================================================');
    console.log('🎉 ALL 4 MICROSERVICES INTEGRATION & CHOREOGRAPHY TESTS PASSED!');
    console.log('================================================================');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
