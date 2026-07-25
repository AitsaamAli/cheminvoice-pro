const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const listCompanyUsers = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const users = await prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ users });
});

const inviteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new AppError('Only admins can add users', 403);
  const { companyId } = req.params;
  const { email, firstName, lastName, role, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw new AppError('Is email se pehle se account hai', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: passwordHash,
      firstName,
      lastName,
      role,
      companyId,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
  });

  res.status(201).json({ success: true, user });
});

const updateUserRole = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new AppError('Only admins can change roles', 403);
  const { userId } = req.params;
  const { role } = req.body;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError('User not found', 404);
  if (target.companyId !== req.user.companyId) throw new AppError('Access denied', 403);
  if (target.id === req.user.id) throw new AppError('Apna role khud nahi badal sakte', 400);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });
  res.json({ success: true, user });
});

const deactivateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new AppError('Only admins can deactivate users', 403);
  const { userId } = req.params;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError('User not found', 404);
  if (target.companyId !== req.user.companyId) throw new AppError('Access denied', 403);
  if (target.id === req.user.id) throw new AppError('Apna account khud deactivate nahi kar sakte', 400);

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  res.json({ success: true, message: 'User deactivated' });
});

module.exports = { listCompanyUsers, inviteUser, updateUserRole, deactivateUser };
