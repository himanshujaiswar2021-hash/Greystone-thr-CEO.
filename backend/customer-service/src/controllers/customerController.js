const db = require('../database');

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

exports.getAllCustomers = (req, res) => {
  try {
    const customers = db.getAllCustomers();
    return sendSuccess(res, customers, 'Customers retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.getCustomerById = (req, res) => {
  try {
    const { id } = req.params;
    const customer = db.getCustomerById(Number(id));
    if (!customer) {
      return sendError(res, 'CUSTOMER_NOT_FOUND', `Customer with ID ${id} not found`, 404);
    }
    return sendSuccess(res, customer, 'Customer details retrieved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

// Inter-Service Verification Endpoint
exports.verifyCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const customer = db.getCustomerById(Number(id));
    if (!customer) {
      return sendError(res, 'CUSTOMER_NOT_FOUND', `Customer with ID ${id} not found`, 404);
    }
    if (customer.status !== 'ACTIVE') {
      return sendError(res, 'CUSTOMER_SUSPENDED', `Customer account is ${customer.status}`, 403);
    }
    return sendSuccess(res, {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      status: customer.status,
      is_eligible: true
    }, 'Customer is verified and eligible for ordering');
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.createCustomer = (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    if (!name || !email) {
      return sendError(res, 'VALIDATION_ERROR', 'Name and email are required fields', 400);
    }

    const newCustomer = db.createCustomer({ name, email, phone, status });
    return sendSuccess(res, newCustomer, 'Customer created successfully', 201);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return sendError(res, 'CUSTOMER_EXISTS', 'A customer with this email already exists', 409);
    }
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.updateCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status } = req.body;

    const existing = db.getCustomerById(Number(id));
    if (!existing) {
      return sendError(res, 'CUSTOMER_NOT_FOUND', `Customer with ID ${id} not found`, 404);
    }

    const updated = db.updateCustomer(Number(id), { name, email, phone, status });
    return sendSuccess(res, updated, 'Customer updated successfully', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.deleteCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteCustomer(Number(id));
    if (!deleted) {
      return sendError(res, 'CUSTOMER_NOT_FOUND', `Customer with ID ${id} not found`, 404);
    }
    return sendSuccess(res, { deletedId: Number(id) }, 'Customer deleted successfully', 200);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};

exports.addAddress = (req, res) => {
  try {
    const { id } = req.params;
    const { street, city, state, zip_code } = req.body;
    if (!street || !city || !state || !zip_code) {
      return sendError(res, 'VALIDATION_ERROR', 'All address fields (street, city, state, zip_code) are required', 400);
    }

    const customer = db.getCustomerById(Number(id));
    if (!customer) {
      return sendError(res, 'CUSTOMER_NOT_FOUND', `Customer with ID ${id} not found`, 404);
    }

    const newAddr = db.addAddress(Number(id), { street, city, state, zip_code });
    return sendSuccess(res, newAddr, 'Address added successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message, 500);
  }
};
