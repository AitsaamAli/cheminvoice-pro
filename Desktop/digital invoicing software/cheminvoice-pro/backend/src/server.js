const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { verifyToken, checkRole } = require('./middleware/authMiddleware');
const { validate } = require('./middleware/validationMiddleware');

const authController = require('./controllers/authController');
const invoiceController = require('./controllers/invoiceController');
const customerController = require('./controllers/customerController');
const productController = require('./controllers/productController');

const customerPortalRoutes = require('./routes/customerPortalRoutes');

const app = express();

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('combined'));

// Public routes
app.post('/api/auth/register', validate('registerUser'), authController.register);
app.post('/api/auth/login', validate('loginUser'), authController.login);
app.post('/api/auth/refresh', authController.refreshAccessToken);

// Protected routes
app.get('/api/auth/me', verifyToken, authController.getCurrentUser);
app.post('/api/auth/logout', verifyToken, authController.logout);

// Invoice routes
app.post('/api/companies/:companyId/invoices', verifyToken, validate('createInvoice'), invoiceController.createInvoice);
app.get('/api/companies/:companyId/invoices', verifyToken, invoiceController.listInvoices);
app.get('/api/invoices/:invoiceId', verifyToken, invoiceController.getInvoice);
app.post('/api/invoices/:invoiceId/submit-fbr', verifyToken, invoiceController.submitToFBR);
app.get('/api/invoices/:invoiceId/pdf', verifyToken, invoiceController.generatePDF);

// Customer routes
app.post('/api/companies/:companyId/customers', verifyToken, validate('createCustomer'), customerController.createCustomer);
app.get('/api/companies/:companyId/customers', verifyToken, customerController.listCustomers);
app.get('/api/customers/:customerId', verifyToken, customerController.getCustomer);
app.put('/api/customers/:customerId', verifyToken, customerController.updateCustomer);
app.delete('/api/customers/:customerId', verifyToken, customerController.deleteCustomer);

// Product routes
app.post('/api/companies/:companyId/products', verifyToken, validate('createProduct'), productController.createProduct);
app.get('/api/companies/:companyId/products', verifyToken, productController.listProducts);
app.get('/api/products/:productId', verifyToken, productController.getProduct);
app.put('/api/products/:productId', verifyToken, productController.updateProduct);
app.delete('/api/products/:productId', verifyToken, productController.deleteProduct);

// Customer Portal routes (public + protected)
app.use('/api/customer-portal', customerPortalRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`FBR Mode: ${process.env.FBR_MODE}`);
});

module.exports = app;
