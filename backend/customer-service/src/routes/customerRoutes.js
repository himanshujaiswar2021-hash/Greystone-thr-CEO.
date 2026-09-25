const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer CRUD
router.get('/customers', customerController.getAllCustomers);
router.get('/customers/:id', customerController.getCustomerById);
router.get('/customers/:id/verify', customerController.verifyCustomer);
router.post('/customers', customerController.createCustomer);
router.put('/customers/:id', customerController.updateCustomer);
router.delete('/customers/:id', customerController.deleteCustomer);

// Address sub-resource
router.post('/customers/:id/addresses', customerController.addAddress);

module.exports = router;
