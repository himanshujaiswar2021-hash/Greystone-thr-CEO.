const { fork } = require('node:child_process');
const path = require('node:path');

console.log('========================================================');
console.log('  Starting Full System: Frontend (3000) & Microservices (5001-5004)');
console.log('========================================================\n');

// Launch Microservices
const productProcess = fork(path.join(__dirname, 'product-service', 'src', 'server.js'));
const orderProcess = fork(path.join(__dirname, 'order-service', 'src', 'server.js'));
const customerProcess = fork(path.join(__dirname, 'customer-service', 'src', 'server.js'));
const paymentProcess = fork(path.join(__dirname, 'payment-service', 'src', 'server.js'));

// Launch Frontend Dashboard on Port 3000
const frontendProcess = fork(path.join(__dirname, 'frontend', 'server.js'));

const cleanup = () => {
  console.log('\nStopping all processes...');
  productProcess.kill();
  orderProcess.kill();
  customerProcess.kill();
  paymentProcess.kill();
  frontendProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
