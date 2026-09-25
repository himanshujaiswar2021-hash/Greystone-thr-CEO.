const API = {
  PRODUCT: 'http://localhost:5001/api',
  ORDER: 'http://localhost:5002/api',
  CUSTOMER: 'http://localhost:5003/api',
  PAYMENT: 'http://localhost:5004/api'
};

let cachedProducts = [];
let cachedCustomers = [];

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  setInterval(checkHealth, 5000);
  loadProducts();
  loadCustomers();
  loadOrders();
  loadPaymentsAndNotifs();
});

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');

  if (tabId === 'tab-products') loadProducts();
  if (tabId === 'tab-customers') loadCustomers();
  if (tabId === 'tab-orders') loadOrders();
  if (tabId === 'tab-payments') loadPaymentsAndNotifs();
}

// Health Check
async function checkHealth() {
  const services = [
    { id: 'badge-prod', url: 'http://localhost:5001/health' },
    { id: 'badge-order', url: 'http://localhost:5002/health' },
    { id: 'badge-cust', url: 'http://localhost:5003/health' },
    { id: 'badge-pay', url: 'http://localhost:5004/health' }
  ];

  for (const s of services) {
    const el = document.getElementById(s.id);
    try {
      const res = await fetch(s.url);
      if (res.ok) {
        el.className = 'badge online';
      } else {
        el.className = 'badge offline';
      }
    } catch {
      el.className = 'badge offline';
    }
  }
}

// 1. PRODUCTS
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  try {
    const res = await fetch(`${API.PRODUCT}/products`);
    const json = await res.json();
    cachedProducts = json.data || [];

    // Populate order dropdown as well
    populateOrderProductsDropdown();

    if (cachedProducts.length === 0) {
      grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center;">No products found. Add one!</div>`;
      return;
    }

    grid.innerHTML = cachedProducts.map(p => {
      let stockClass = 'in-stock';
      if (p.stock_quantity === 0) stockClass = 'out-stock';
      else if (p.stock_quantity < 5) stockClass = 'low-stock';

      return `
        <div class="card product-card">
          <div class="cat-tag">${p.category_name || 'General'}</div>
          <h3>${p.name}</h3>
          <p>${p.description || 'No description provided.'}</p>
          <div class="footer-info">
            <span class="price">$${p.price.toFixed(2)}</span>
            <span class="stock-tag ${stockClass}">Stock: ${p.stock_quantity}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="card" style="grid-column: 1/-1; color: var(--danger);">Failed to load products from ${API.PRODUCT}: ${err.message}</div>`;
  }
}

async function handleAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('newProdName').value;
  const description = document.getElementById('newProdDesc').value;
  const price = parseFloat(document.getElementById('newProdPrice').value);
  const stock_quantity = parseInt(document.getElementById('newProdStock').value);

  try {
    const res = await fetch(`${API.PRODUCT}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price, stock_quantity, category_id: 1 })
    });
    const json = await res.json();
    if (res.ok) {
      showToast(`Product "${name}" created successfully!`);
      closeModal('modal-add-product');
      document.getElementById('addProductForm').reset();
      loadProducts();
    } else {
      showToast(json.error?.message || 'Failed to create product', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 2. CUSTOMERS
async function loadCustomers() {
  const tbody = document.getElementById('customersTableBody');
  try {
    const res = await fetch(`${API.CUSTOMER}/customers`);
    const json = await res.json();
    cachedCustomers = json.data || [];

    populateOrderCustomersDropdown();

    if (cachedCustomers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No customers found.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedCustomers.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.email}</td>
        <td>${c.phone || '-'}</td>
        <td><span class="chip chip-${c.status.toLowerCase()}">${c.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="verifyCustomerPopup(${c.id})">Verify Status</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger)">Failed to load customers: ${err.message}</td></tr>`;
  }
}

async function verifyCustomerPopup(id) {
  try {
    const res = await fetch(`${API.CUSTOMER}/customers/${id}/verify`);
    const json = await res.json();
    if (res.ok) {
      alert(`✅ Customer #${id} (${json.data.name}): Account is ACTIVE and eligible for ordering!`);
    } else {
      alert(`⚠️ Customer #${id} Verification: ${json.error.message}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function handleAddCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('newCustName').value;
  const email = document.getElementById('newCustEmail').value;
  const phone = document.getElementById('newCustPhone').value;
  const status = document.getElementById('newCustStatus').value;

  try {
    const res = await fetch(`${API.CUSTOMER}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, status })
    });
    const json = await res.json();
    if (res.ok) {
      showToast(`Customer "${name}" registered successfully!`);
      closeModal('modal-add-customer');
      document.getElementById('addCustomerForm').reset();
      loadCustomers();
    } else {
      showToast(json.error?.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 3. CHECKOUT & CHOREOGRAPHY
function populateOrderCustomersDropdown() {
  const select = document.getElementById('orderCustomerSelect');
  if (!select) return;
  select.innerHTML = cachedCustomers.map(c => `
    <option value="${c.id}">${c.name} (${c.email}) - [${c.status}]</option>
  `).join('');
}

function populateOrderProductsDropdown() {
  const select = document.getElementById('orderProductSelect');
  if (!select) return;
  select.innerHTML = cachedProducts.map(p => `
    <option value="${p.id}" data-price="${p.price}" data-stock="${p.stock_quantity}">
      ${p.name} - $${p.price.toFixed(2)} (${p.stock_quantity} in stock)
    </option>
  `).join('');
  updateProductPreview();
}

function updateProductPreview() {
  const select = document.getElementById('orderProductSelect');
  const hint = document.getElementById('productStockHint');
  const selectedOpt = select.selectedOptions[0];
  if (selectedOpt) {
    const stock = selectedOpt.getAttribute('data-stock');
    hint.textContent = `Available Stock in Product Service: ${stock} units`;
  }
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('btnPlaceOrder');
  const log = document.getElementById('choreographyLog');
  const customerId = parseInt(document.getElementById('orderCustomerSelect').value);
  const productId = parseInt(document.getElementById('orderProductSelect').value);
  const quantity = parseInt(document.getElementById('orderQuantity').value);
  const paymentMethod = document.getElementById('orderPaymentMethod').value;

  btn.disabled = true;
  btn.textContent = '⏳ Executing Inter-Service Choreography...';

  // Reset steps UI
  setStep('step-cust', 'running', 'Verifying...');
  setStep('step-stock', '', 'Waiting');
  setStep('step-pay', '', 'Waiting');
  setStep('step-order', '', 'Waiting');

  log.textContent = `[CHOREOGRAPHY START] Initiating order for Customer #${customerId}...\n`;

  try {
    log.textContent += `[Order Service -> Customer Service] Validating customer #${customerId}...\n`;
    await delay(300);

    // Call Order Service (which orchestrates the other 3 services!)
    const response = await fetch(`${API.ORDER}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        payment_method: paymentMethod,
        items: [{ product_id: productId, quantity }]
      })
    });

    const result = await response.json();

    if (response.ok) {
      setStep('step-cust', 'success', 'Verified Active');
      log.textContent += `✓ [Customer Service] Customer active and eligible.\n`;
      await delay(200);

      setStep('step-stock', 'success', `Stock Reserved (-${quantity})`);
      log.textContent += `✓ [Product Service] Stock availability confirmed and ${quantity} unit(s) reserved.\n`;
      await delay(200);

      setStep('step-pay', 'success', `Paid $${result.data.total_amount}`);
      log.textContent += `✓ [Payment Service] Transaction authorized: ${result.data.transaction_ref}. Notification emailed.\n`;
      await delay(200);

      setStep('step-order', 'success', `Order #${result.data.id} Confirmed`);
      log.textContent += `🎉 [Order Service] Order #${result.data.id} committed with status CONFIRMED!\n`;

      showToast(`Order #${result.data.id} placed successfully!`);
      loadProducts();
      loadOrders();
      loadPaymentsAndNotifs();
    } else {
      // Analyze error and highlight failed step
      const err = result.error;
      log.textContent += `❌ [FAILED] Status ${response.status}: ${err.code} - ${err.message}\n`;

      if (err.code === 'CUSTOMER_SUSPENDED' || err.code === 'CUSTOMER_NOT_FOUND') {
        setStep('step-cust', 'error', err.code);
      } else if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'PRODUCT_NOT_FOUND') {
        setStep('step-cust', 'success', 'Verified');
        setStep('step-stock', 'error', err.code);
      } else if (err.code === 'PAYMENT_FAILED') {
        setStep('step-cust', 'success', 'Verified');
        setStep('step-stock', 'success', 'Reserved');
        setStep('step-pay', 'error', 'Payment Failed');
      } else {
        setStep('step-order', 'error', err.code || 'Error');
      }

      showToast(err.message, 'error');
    }
  } catch (networkErr) {
    log.textContent += `❌ [Network Error] ${networkErr.message}\n`;
    setStep('step-order', 'error', 'Network Error');
    showToast(networkErr.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Place Order & Run Choreography';
  }
}

function setStep(stepId, state, statusText) {
  const el = document.getElementById(stepId);
  if (!el) return;
  el.className = `pipe-step ${state}`;
  el.querySelector('.step-status').textContent = statusText;
}

// 4. ORDERS
async function loadOrders() {
  const list = document.getElementById('ordersList');
  try {
    const res = await fetch(`${API.ORDER}/orders`);
    const json = await res.json();
    const orders = json.data || [];

    if (orders.length === 0) {
      list.innerHTML = `<div class="card text-center">No orders placed yet. Use the Live Checkout tab to place one!</div>`;
      return;
    }

    list.innerHTML = orders.map(o => `
      <div class="order-item-card">
        <div class="order-details">
          <h4>Order #${o.id} - ${o.customer_name} <span class="chip chip-${o.status}">${o.status}</span></h4>
          <p>Created: ${o.created_at} | Payment Ref: <code>${o.transaction_ref || 'N/A'}</code></p>
          <div class="order-items-list">
            Items: ${o.items.map(i => `${i.product_name} (x${i.quantity}) @ $${i.unit_price}`).join(', ')}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: #38bdf8; margin-bottom: 8px;">
            $${o.total_amount.toFixed(2)}
          </div>
          ${o.status !== 'CANCELLED' ? `
            <button class="btn btn-danger btn-sm" onclick="cancelOrder(${o.id})">
              ✖ Cancel & Refund
            </button>
          ` : '<span style="color:var(--text-muted); font-size:12px;">Refunded & Restored</span>'}
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div class="card" style="color:var(--danger)">Failed to load orders: ${err.message}</div>`;
  }
}

async function cancelOrder(orderId) {
  if (!confirm(`Are you sure you want to cancel Order #${orderId}? This will automatically release reserved stock and issue a refund in Payment Service.`)) {
    return;
  }

  try {
    const res = await fetch(`${API.ORDER}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });
    const json = await res.json();
    if (res.ok) {
      showToast(`Order #${orderId} cancelled! Stock released and refund sent.`);
      loadOrders();
      loadProducts();
      loadPaymentsAndNotifs();
    } else {
      showToast(json.error?.message || 'Cancellation failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 5. PAYMENTS & NOTIFICATIONS
async function loadPaymentsAndNotifs() {
  // Payments
  const tbody = document.getElementById('paymentsTableBody');
  try {
    const res = await fetch(`${API.PAYMENT}/payments`);
    const json = await res.json();
    const payments = json.data || [];

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td><code>${p.transaction_ref}</code></td>
        <td>#${p.order_id}</td>
        <td>$${p.amount.toFixed(2)}</td>
        <td>${p.payment_method}</td>
        <td><span class="chip chip-${p.status}">${p.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger)">${err.message}</td></tr>`;
  }

  // Notifications
  const notifFeed = document.getElementById('notificationsFeed');
  try {
    const res = await fetch(`${API.PAYMENT}/notifications`);
    const json = await res.json();
    const notifs = json.data || [];

    notifFeed.innerHTML = notifs.map(n => `
      <div style="background:#0f172a; border:1px solid var(--card-border); border-radius:8px; padding:12px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:4px;">
          <span>To: <strong>${n.recipient_email}</strong></span>
          <span>${n.created_at}</span>
        </div>
        <div style="font-weight:600; font-size:13px; color:#38bdf8;">${n.subject}</div>
        <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">${n.message}</div>
      </div>
    `).join('');
  } catch (err) {
    notifFeed.innerHTML = `<div style="color:var(--danger)">${err.message}</div>`;
  }
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
