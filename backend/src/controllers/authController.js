const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '30m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, businessName, ntn, strn, address, province, city } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new AppError('Email already registered', 409);

  const hashedPassword = await bcrypt.hash(password, 12);

  const bizName = businessName || `${firstName} ${lastName} Company`;

  const company = await prisma.company.create({
    data: {
      businessName: bizName,
      ntn: ntn || '0000000',
      strn: strn || '0000000000000',
      address: address || 'Pakistan',
      province: province || 'Punjab',
      city: city || 'Lahore',
      subscriptionStatus: 'PENDING',
    },
  });

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      companyId: company.id,
      role: 'ADMIN',
    },
  });

  // Notify admin (fire-and-forget)
  emailService.notifyAdminNewSignup({
    businessName: bizName,
    email,
    ntn: ntn || '',
    city: city || '',
    companyId: company.id,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    pending: true,
    message: 'Registration submitted. Our team will review and approve your account. You will receive an email confirmation.',
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: { select: { subscriptionStatus: true } } },
  });
  if (!user) throw new AppError('Invalid credentials', 401);

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

  if (!user.isActive) throw new AppError('Account is deactivated', 403);

  if (user.company?.subscriptionStatus === 'PENDING') {
    throw new AppError('PENDING_APPROVAL: Your account is awaiting admin approval. You will receive an email once approved.', 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const { accessToken, refreshToken } = generateTokens(user);

  res.json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
    accessToken,
    refreshToken,
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) throw new AppError('Refresh token required', 400);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) throw new AppError('User not found', 404);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
});

const logout = asyncHandler(async (req, res) => {
  // Client-side implementation - just return success
  res.json({ success: true, message: 'Logged out successfully' });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, companyId: true, isActive: true, lastLogin: true, createdAt: true,
      company: true,
    },
  });

  res.json(user);
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
};
