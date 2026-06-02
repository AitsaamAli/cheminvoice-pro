const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

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

  const company = await prisma.company.create({
    data: {
      businessName: businessName || `${firstName} ${lastName} Company`,
      ntn: ntn || '0000000',
      strn: strn || '0000000000000',
      address: address || 'Pakistan',
      province: province || 'Punjab',
      city: city || 'Lahore',
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      companyId: company.id,
      role: 'ADMIN',
    },
  });

  const { accessToken, refreshToken } = generateTokens(user);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: { id: user.id, email: user.email, firstName: user.firstName },
    accessToken,
    refreshToken,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid credentials', 401);

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

  if (!user.isActive) throw new AppError('Account is deactivated', 403);

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
    include: { company: true },
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
