const express = require('express');
const customerPortalController = require('../controllers/customerPortalController');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Middleware to verify customer JWT token
const verifyCustomerToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'customer') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.customer = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Public routes (no authentication required)

// Send login code to email
router.post('/send-code', asyncHandler(async (req, res) => {
  await customerPortalController.sendLoginCode(req, res);
}));

// Verify code and get JWT token
router.post('/verify-code', asyncHandler(async (req, res) => {
  await customerPortalController.verifyLoginCode(req, res);
}));

// Protected routes (authentication required)

// Get all invoices for logged-in customer
router.get('/invoices', verifyCustomerToken, asyncHandler(async (req, res) => {
  await customerPortalController.getCustomerInvoices(req, res);
}));

// Get specific invoice detail
router.get('/invoices/:invoiceId', verifyCustomerToken, asyncHandler(async (req, res) => {
  await customerPortalController.getInvoiceDetail(req, res);
}));

// Get outstanding balance
router.get('/outstanding-balance', verifyCustomerToken, asyncHandler(async (req, res) => {
  await customerPortalController.getOutstandingBalance(req, res);
}));

// Get payment history
router.get('/payment-history', verifyCustomerToken, asyncHandler(async (req, res) => {
  await customerPortalController.getPaymentHistory(req, res);
}));

// Get customer info
router.get('/customer-info', verifyCustomerToken, asyncHandler(async (req, res) => {
  await customerPortalController.getCustomerInfo(req, res);
}));

module.exports = router;
