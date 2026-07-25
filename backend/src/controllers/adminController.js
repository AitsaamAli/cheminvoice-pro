const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

const requireSuperAdmin = (req) => {
  if (req.user.role !== 'SUPERADMIN') throw new AppError('Access denied', 403);
};

const listAllCompanies = asyncHandler(async (req, res) => {
  requireSuperAdmin(req);

  const companies = await prisma.company.findMany({
    orderBy: [
      { subscriptionStatus: 'asc' }, // PENDING first (alphabetically before TRIAL)
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      businessName: true,
      ntn: true,
      city: true,
      contactEmail: true,
      subscriptionStatus: true,
      trialInvoicesUsed: true,
      trialInvoiceLimit: true,
      activatedAt: true,
      suspendedAt: true,
      createdAt: true,
      _count: { select: { users: true, invoices: true, customers: true } },
    },
  });

  // Attach admin user email for each company (for display)
  const companyIds = companies.map(c => c.id);
  const adminUsers = await prisma.user.findMany({
    where: { companyId: { in: companyIds }, role: 'ADMIN' },
    select: { companyId: true, email: true, firstName: true, lastName: true },
  });
  const userMap = Object.fromEntries(adminUsers.map(u => [u.companyId, u]));
  const enriched = companies.map(c => ({ ...c, adminUser: userMap[c.id] || null }));

  res.json({ success: true, companies: enriched });
});

const approveCompany = asyncHandler(async (req, res) => {
  requireSuperAdmin(req);
  const { companyId } = req.params;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError('Company not found', 404);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: 'TRIAL',
      activatedAt: new Date(),
      suspendedAt: null,
    },
    select: { id: true, businessName: true, subscriptionStatus: true, activatedAt: true },
  });

  // Send approval email to company's admin user (fire-and-forget)
  prisma.user.findFirst({ where: { companyId, role: 'ADMIN' } })
    .then(user => {
      if (user) emailService.sendApprovalEmail(user.email, company.businessName).catch(() => {});
    }).catch(() => {});

  res.json({ success: true, company: updated });
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

module.exports = { listAllCompanies, approveCompany, activateCompany, suspendCompany };
