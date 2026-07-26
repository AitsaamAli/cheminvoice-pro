const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const listCompanyUsers = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const memberships = await prisma.companyMembership.findMany({
    where: { companyId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, lastLogin: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const users = memberships.map(m => ({
    id: m.user.id,
    email: m.user.email,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    role: m.role,
    isActive: m.isActive,
    lastLogin: m.user.lastLogin,
    createdAt: m.createdAt,
  }));
  res.json({ users });
});

const inviteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new AppError('Only admins can add users', 403);
  const { companyId } = req.params;
  const { email, firstName, lastName, role, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    // Account already exists elsewhere (e.g. an accountant working across
    // several clients) — grant membership in this company instead of
    // rejecting on the unique-email constraint. Their existing password stands.
    const existingMembership = await prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId: existing.id, companyId } },
    });
    if (existingMembership) throw new AppError('Ye user pehle se is company ka member hai', 409);

    await prisma.companyMembership.create({
      data: { userId: existing.id, companyId, role },
    });

    return res.status(201).json({
      success: true,
      user: {
        id: existing.id, email: existing.email, firstName: existing.firstName,
        lastName: existing.lastName, role, isActive: true,
      },
      addedExistingAccount: true,
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      firstName,
      lastName,
      role,
      companyId,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
  });
  await prisma.companyMembership.create({
    data: { userId: user.id, companyId, role },
  });

  res.status(201).json({ success: true, user });
});

const updateUserRole = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new AppError('Only admins can change roles', 403);
  const { userId } = req.params;
  const { role } = req.body;

  if (userId === req.user.id) throw new AppError('Apna role khud nahi badal sakte', 400);

  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId, companyId: req.user.companyId } },
  });
  if (!membership) throw new AppError('User not found', 404);

  await prisma.companyMembership.update({ where: { id: membership.id }, data: { role } });

  // Keep the legacy User.role in sync when this is the user's *home* company
  // — other code (e.g. admin notifications) still reads it directly for that case.
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (target && target.companyId === req.user.companyId) {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  res.json({
    success: true,
    user: { id: userId, email: target?.email, firstName: target?.firstName, lastName: target?.lastName, role, isActive: membership.isActive },
  });
});

const deactivateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new AppError('Only admins can deactivate users', 403);
  const { userId } = req.params;

  if (userId === req.user.id) throw new AppError('Apna account khud deactivate nahi kar sakte', 400);

  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId, companyId: req.user.companyId } },
  });
  if (!membership) throw new AppError('User not found', 404);

  // Scoped to this company only — a user removed here may still hold active
  // membership at other companies (multi-tenant), so the global User row is
  // untouched.
  await prisma.companyMembership.update({ where: { id: membership.id }, data: { isActive: false } });

  res.json({ success: true, message: 'User is company se remove ho gaya' });
});

module.exports = { listCompanyUsers, inviteUser, updateUserRole, deactivateUser };
