const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const requireSuperAdmin = (req) => {
  if (req.user.role !== 'SUPERADMIN') throw new AppError('Access denied', 403);
};

const listAllCompanies = asyncHandler(async (req, res) => {
  requireSuperAdmin(req);

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      businessName: true,
      ntn: true,
      city: true,
      subscriptionStatus: true,
      trialInvoicesUsed: true,
      trialInvoiceLimit: true,
      activatedAt: true,
      suspendedAt: true,
      createdAt: true,
      _count: { select: { users: true, invoices: true, customers: true } },
    },
  });

  res.json({ success: true, companies });
});

const activateCompany = asyncHandler(async (req, res) => {
  requireSuperAdmin(req);
  const { companyId } = req.params;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError('Company not found', 404);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: 'ACTIVE',
      activatedAt: new Date(),
      suspendedAt: null,
    },
    select: { id: true, businessName: true, subscriptionStatus: true, activatedAt: true },
  });

  res.json({ success: true, company: updated });
});

const suspendCompany = asyncHandler(async (req, res) => {
  requireSuperAdmin(req);
  const { companyId } = req.params;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError('Company not found', 404);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: 'SUSPENDED',
      suspendedAt: new Date(),
    },
    select: { id: true, businessName: true, subscriptionStatus: true, suspendedAt: true },
  });

  res.json({ success: true, company: updated });
});

module.exports = { listAllCompanies, activateCompany, suspendCompany };
