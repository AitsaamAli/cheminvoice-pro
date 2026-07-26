const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const fbrService = require('../services/fbrService');

const MAX_TAKE = 100;

// ── Real-time NTN/CNIC verification against FBR ───────────────────────────────
// Soft check only — a failed/unreachable lookup returns verified:false with a
// reason, it never throws. Format validation at invoice-submit time (INV-6)
// remains the actual gate; this just gives the user an early heads-up while
// they're still typing the customer's details in.
const verifyRegistration = asyncHandler(async (req, res) => {
  const { regNo } = req.params;
  const result = await fbrService.verifyRegistration(regNo);
  res.json(result);
});

const createCustomer = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  // companyId already verified to match token by requireCompanyAccess middleware
  const {
    businessName, ntn, cnic, strn, address, province, city,
    registrationType, contactPerson, contactPhone, contactEmail,
  } = req.body;

  const customer = await prisma.customer.create({
    data: {
      businessName,
      ntn: ntn || null,
      cnic: cnic || null,
      strn: strn || null,
      address: address || null,
      province: province || null,
      city: city || null,
      registrationType: registrationType || 'UNREGISTERED',
      contactPerson: contactPerson || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      companyId,
    },
  });

  res.status(201).json({ success: true, customer });
});

const listCustomers = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  // ✅ FIX: clamp take to MAX_TAKE to prevent unbounded result sets
  const skip = Math.max(0, parseInt(req.query.skip) || 0);
  const take = Math.min(MAX_TAKE, Math.max(1, parseInt(req.query.take) || 50));

  const where = { companyId, isDeleted: false };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({ customers, pagination: { total, skip, take } });
});

const getCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError('Customer not found', 404);

  // ✅ FIX: IDOR — verify customer belongs to requesting user's company
  if (customer.companyId !== req.user.companyId) {
    throw new AppError('Access denied', 403);
  }

  res.json(customer);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  // ✅ FIX: IDOR — fetch first to verify ownership before updating
  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) throw new AppError('Customer not found', 404);
  if (existing.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  const {
    businessName, ntn, cnic, strn, address, province, city,
    registrationType, contactPerson, contactPhone, contactEmail,
  } = req.body;

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      businessName,
      ntn: ntn || null,
      cnic: cnic || null,
      strn: strn || null,
      address: address || null,
      province: province || null,
      city: city || null,
      registrationType: registrationType || 'UNREGISTERED',
      contactPerson: contactPerson || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
    },
  });

  res.json({ success: true, customer });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { _count: { select: { invoices: true } } },
  });
  if (!existing) throw new AppError('Customer not found', 404);
  if (existing.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  // If customer has invoices, soft-delete to preserve invoice history
  if (existing._count.invoices > 0) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { isDeleted: true },
    });
    return res.json({ success: true, message: 'Customer archived (has existing invoices)' });
  }

  await prisma.customer.delete({ where: { id: customerId } });
  res.json({ success: true, message: 'Customer deleted' });
});

module.exports = { createCustomer, listCustomers, getCustomer, updateCustomer, deleteCustomer, verifyRegistration };
