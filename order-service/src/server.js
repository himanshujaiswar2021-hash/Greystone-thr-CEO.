const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const orderRoutes = require('./routes/orderRoutes');
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Order Service] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Root redirect to Swagger Docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'order-service',
    status: 'UP',
    port: PORT,
    productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:5001',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', orderRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    },
    timestamp: new Date().toISOString()
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Order Service running on http://localhost:${PORT}`);
    console.log(`📖 Swagger API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`====================================================`);
  });
}

module.exports = app;
