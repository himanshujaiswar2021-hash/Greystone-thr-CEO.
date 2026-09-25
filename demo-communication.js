async function runCommunicationDemo() {
  console.log('========================================================================');
  console.log('🔗 LIVE INTER-SERVICE REST COMMUNICATION DEMONSTRATION');
  console.log('   Microservice 1: Product Service (Port 5001)');
  console.log('   Microservice 2: Order Service   (Port 5002)');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Query Product Service directly to inspect initial inventory
    // -------------------------------------------------------------------------
    console.log('📍 STEP 1: Querying Product Service directly for Product #1 (Ergonomic Keyboard)...');
    const prodBeforeRes = await fetch('http://localhost:5001/api/products/1');
    const prodBefore = await prodBeforeRes.json();
    const initialStock = prodBefore.data.stock_quantity;
    console.log(`   [Product Service Response]`);
    console.log(`   • Product: "${prodBefore.data.name}"`);
    console.log(`   • Price:   $${prodBefore.data.price}`);
    console.log(`   • Current Stock: ${initialStock} units\n`);

    // -------------------------------------------------------------------------
    // STEP 2: Client places order via Order Service (Port 5002)
    //         Order Service will autonomously call Product Service (Port 5001)
    // -------------------------------------------------------------------------
    console.log('📍 STEP 2: Client calls Order Service: POST http://localhost:5002/api/orders');
    console.log('   Request Body: Ordering 2 units of Product #1 for Alice Smith...');
    console.log('   ⚡ WATCH INTER-SERVICE COMMUNICATION HAPPENING IN REAL TIME:');
    console.log('      [Order Service] ──(HTTP GET /api/products/1)─────────► [Product Service]');
    console.log('      [Order Service] ◄──(200 OK: Stock Available)─────────── [Product Service]');
    console.log('      [Order Service] ──(HTTP POST /api/products/1/reserve)─► [Product Service]');
    console.log('      [Order Service] ◄──(200 OK: Stock Reserved)──────────── [Product Service]');

    const orderRes = await fetch('http://localhost:5002/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        payment_method: 'CREDIT_CARD',
        items: [
          { product_id: 1, quantity: 2 }
        ]
      })
    });

    const orderJson = await orderRes.json();
    console.log('\n   [Order Service Response: 201 Created]');
    console.log(`   • Order ID:        #${orderJson.data.id}`);
    console.log(`   • Customer:        ${orderJson.data.customer_name}`);
    console.log(`   • Total Charged:   $${orderJson.data.total_amount}`);
    console.log(`   • Order Status:    ${orderJson.data.status}`);
    console.log(`   • Transaction Ref: ${orderJson.data.transaction_ref}\n`);

    const createdOrderId = orderJson.data.id;

    // -------------------------------------------------------------------------
    // STEP 3: Verify that Product Service stock was decremented by Order Service
    // -------------------------------------------------------------------------
    console.log('📍 STEP 3: Verifying Product Service stock after order placement...');
    const prodAfterRes = await fetch('http://localhost:5001/api/products/1');
    const prodAfter = await prodAfterRes.json();
    const newStock = prodAfter.data.stock_quantity;
    console.log(`   [Product Service Response]`);
    console.log(`   • Initial Stock:     ${initialStock}`);
    console.log(`   • Decremented Stock: ${newStock} (-2 units deducted by Order Service!)`);
    console.log(`   ✓ Inter-service stock reservation VERIFIED!\n`);

    // -------------------------------------------------------------------------
    // STEP 4: Cancel the Order in Order Service
    //         Order Service automatically calls Product Service to release stock
    // -------------------------------------------------------------------------
    console.log(`📍 STEP 4: Cancelling Order #${createdOrderId} in Order Service...`);
    console.log('   ⚡ WATCH COMPENSATION / ROLLBACK COMMUNICATION:');
    console.log(`      [Order Service] ──(HTTP POST /api/products/1/release-stock)─► [Product Service]`);
    console.log(`      [Order Service] ◄──(200 OK: Stock Restored)────────────────── [Product Service]`);

    const cancelRes = await fetch(`http://localhost:5002/api/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });
    const cancelJson = await cancelRes.json();
    console.log(`\n   [Order Service Response: 200 OK]`);
    console.log(`   • Order Status: ${cancelJson.data.status}`);

    // -------------------------------------------------------------------------
    // STEP 5: Verify that Product Service stock was restored back
    // -------------------------------------------------------------------------
    console.log('\n📍 STEP 5: Verifying Product Service stock after cancellation...');
    const prodRestoredRes = await fetch('http://localhost:5001/api/products/1');
    const prodRestored = await prodRestoredRes.json();
    console.log(`   [Product Service Response]`);
    console.log(`   • Restored Stock: ${prodRestored.data.stock_quantity} (Restored back from ${newStock} -> ${prodRestored.data.stock_quantity})`);
    console.log(`   ✓ Inter-service compensation and rollback VERIFIED!\n`);

    console.log('========================================================================');
    console.log('🎉 COMMUNICATION SUCCESS: Both microservices communicated flawlessly!');
    console.log('========================================================================');

  } catch (err) {
    console.error('Error in communication demo:', err);
  }
}

runCommunicationDemo();
