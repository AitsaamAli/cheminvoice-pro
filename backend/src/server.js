require('dotenv').config();

// ✅ FIX: validate all required env vars BEFORE anything else starts
const { validateEnv } = require('./middleware/startupValidator');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { verifyToken, requireCompanyAccess } = require('./middleware/authMiddleware');
const { validate } = require('./middleware/validationMiddleware');
const { authLimiter, otpLimiter, apiLimiter } = require('./middleware/rateLimiter');

const authController = require('./controllers/authController');
const invoiceController = require('./controllers/invoiceController');
const customerController = require('./controllers/customerController');
const productController = require('./controllers/productController');
const quotationController = require('./controllers/quotationController');
const userController = require('./controllers/userController');
const emailService = require('./services/emailService');
const customerPortalRoutes = require('./routes/customerPortalRoutes');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// ── CORS — strict for browser requests; allow server-to-server (no Origin) ────
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header = server-to-server, health checks, curl → always allow
    if (!origin) return callback(null, true);
    // Browser request with Origin → check allowlist
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body limits — 5MB to accommodate base64-encoded company logos ─────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ── Logging — strip Authorization header from logs ───────────────────────────
morgan.token('user-id', (req) => req.user?.id || 'anonymous');
app.use(morgan(':method :url :status :response-time ms — user::user-id', {
  skip: (req) => req.path === '/health',
}));

// ── Apply general rate limit to all API routes ───────────────────────────────
app.use('/api', apiLimiter);

// ── Public auth routes (with strict rate limiting) ───────────────────────────
app.post('/api/auth/register', authLimiter, validate('registerUser'), authController.register);
app.post('/api/auth/login', authLimiter, validate('loginUser'), authController.login);
app.post('/api/auth/refresh', authLimiter, authController.refreshAccessToken);

// ── Protected auth routes ─────────────────────────────────────────────────────
app.get('/api/auth/me', verifyToken, authController.getCurrentUser);
app.post('/api/auth/logout', verifyToken, authController.logout);

// ── Invoice routes — verifyToken + requireCompanyAccess (prevents IDOR) ───────
app.post(
  '/api/companies/:companyId/invoices',
  verifyToken, requireCompanyAccess, validate('createInvoice'),
  invoiceController.createInvoice
);
app.get(
  '/api/companies/:companyId/invoices',
  verifyToken, requireCompanyAccess,
  invoiceController.listInvoices
);
// Individual invoice routes: IDOR check is inside the controller (no :companyId in path)
app.get('/api/invoices/:invoiceId', verifyToken, invoiceController.getInvoice);
app.post('/api/invoices/:invoiceId/submit-fbr', verifyToken, invoiceController.submitToFBR);
app.patch('/api/invoices/:invoiceId/payment', verifyToken, validate('updatePayment'), invoiceController.updatePayment);
app.delete('/api/invoices/:invoiceId', verifyToken, invoiceController.cancelInvoice);
app.get('/api/invoices/:invoiceId/pdf', verifyToken, invoiceController.generatePDF);

// ── Customer routes ───────────────────────────────────────────────────────────
app.post(
  '/api/companies/:companyId/customers',
  verifyToken, requireCompanyAccess, validate('createCustomer'),
  customerController.createCustomer
);
app.get(
  '/api/companies/:companyId/customers',
  verifyToken, requireCompanyAccess,
  customerController.listCustomers
);
// Individual customer routes: IDOR check inside controller
app.get('/api/customers/:customerId', verifyToken, customerController.getCustomer);
app.put('/api/customers/:customerId', verifyToken, customerController.updateCustomer);
app.delete('/api/customers/:customerId', verifyToken, customerController.deleteCustomer);

// ── Product routes ────────────────────────────────────────────────────────────
app.post(
  '/api/companies/:companyId/products',
  verifyToken, requireCompanyAccess, validate('createProduct'),
  productController.createProduct
);
app.get(
  '/api/companies/:companyId/products',
  verifyToken, requireCompanyAccess,
  productController.listProducts
);
app.get('/api/products/:productId', verifyToken, productController.getProduct);
app.put('/api/products/:productId', verifyToken, productController.updateProduct);
app.delete('/api/products/:productId', verifyToken, productController.deleteProduct);

// ── Company profile ───────────────────────────────────────────────────────────
app.get('/api/companies/:companyId', verifyToken, requireCompanyAccess, async (req, res, next) => {
  try {
    const prisma = require('./lib/prisma');
    const company = await prisma.company.findUnique({ where: { id: req.params.companyId } });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  } catch (err) { next(err); }
});

app.put(
  '/api/companies/:companyId',
  verifyToken, requireCompanyAccess, validate('updateCompany'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { businessName, ntn, strn, address, province, city, contactPhone, contactEmail, businessType, logoBase64 } = req.body;
      const prisma = require('./lib/prisma');
      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          businessName: businessName || undefined,
          ntn: ntn || undefined,
          strn: strn || undefined,
          address: address || undefined,
          province: province || undefined,
          city: city || undefined,
          contactPhone: contactPhone || null,
          contactEmail: contactEmail || null,
          businessType: businessType || undefined,
          logoBase64: logoBase64 !== undefined ? (logoBase64 || null) : undefined,
        },
      });
      res.json({ success: true, company });
    } catch (err) { next(err); }
  }
);

// ── Quotation routes ──────────────────────────────────────────────────────────
app.post(
  '/api/companies/:companyId/quotations',
  verifyToken, requireCompanyAccess, validate('createQuotation'),
  quotationController.createQuotation
);
app.get(
  '/api/companies/:companyId/quotations',
  verifyToken, requireCompanyAccess,
  quotationController.listQuotations
);
app.get('/api/quotations/:quotationId', verifyToken, quotationController.getQuotation);
app.put('/api/quotations/:quotationId', verifyToken, quotationController.updateQuotation);
app.post('/api/quotations/:quotationId/convert', verifyToken, quotationController.convertToInvoice);
app.delete('/api/quotations/:quotationId', verifyToken, quotationController.deleteQuotation);

// ── Send invoice by email ─────────────────────────────────────────────────────
app.post('/api/invoices/:invoiceId/send-email', verifyToken, async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Valid email required' });

    const prisma = require('./lib/prisma');
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, company: true, customer: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.companyId !== req.user.companyId) return res.status(403).json({ error: 'Access denied' });

    await emailService.sendInvoice(email, invoice, null);
    res.json({ success: true, message: `Invoice email ho gayi: ${email}` });
  } catch (err) { next(err); }
});

// ── User management routes ────────────────────────────────────────────────────
app.get('/api/companies/:companyId/users', verifyToken, requireCompanyAccess, userController.listCompanyUsers);
app.post('/api/companies/:companyId/users', verifyToken, requireCompanyAccess, validate('inviteUser'), userController.inviteUser);
app.put('/api/users/:userId/role', verifyToken, validate('updateUserRole'), userController.updateUserRole);
app.delete('/api/users/:userId', verifyToken, userController.deactivateUser);

// ── Customer Portal routes ────────────────────────────────────────────────────
app.use('/api/customer-portal', otpLimiter, customerPortalRoutes);

// ── Health check — no sensitive info ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Error handlers (must be last) ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Startup DB migration (adds new columns safely, no data loss) ──────────────
const { runMigrations } = require('./lib/migration');
const prismaForMigration = require('./lib/prisma');
runMigrations(prismaForMigration);

// ── FBR offline queue retry job — INV-8 ──────────────────────────────────────
const { startRetryJob } = require('./jobs/fbrRetryJob');
const retryJobTimer = startRetryJob();

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const prisma = require('./lib/prisma');
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received — shutting down gracefully`);
  if (retryJobTimer) clearInterval(retryJobTimer);
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Unhandled rejection guard — log and exit rather than corrupt state ────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
