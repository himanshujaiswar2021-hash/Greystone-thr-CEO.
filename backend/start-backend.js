const { fork } = require('node:child_process');
const path = require('node:path');

console.log('========================================================');
console.log('  Starting All 4 Backend Microservices');
console.log('========================================================\n');

const productProcess = fork(path.join(__dirname, 'product-service', 'src', 'server.js'));
const orderProcess = fork(path.join(__dirname, 'order-service', 'src', 'server.js'));
const customerProcess = fork(path.join(__dirname, 'customer-service', 'src', 'server.js'));
const paymentProcess = fork(path.join(__dirname, 'payment-service', 'src', 'server.js'));

const cleanup = () => {
  console.log('\nStopping backend microservices...');
  productProcess.kill();
  orderProcess.kill();
  customerProcess.kill();
  paymentProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
