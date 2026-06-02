const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', expiredAt: error.expiredAt });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check user role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

// Check company access
const checkCompanyAccess = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    req.company = user.company;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Session timeout middleware
const sessionTimeout = (req, res, next) => {
  const lastActivity = req.session?.lastActivity || Date.now();
  const currentTime = Date.now();
  const timeout = parseInt(process.env.SESSION_TIMEOUT || '1800000'); // 30 minutes

  if (currentTime - lastActivity > timeout) {
    return res.status(401).json({
      error: 'Session expired due to inactivity',
    });
  }

  req.session = req.session || {};
  req.session.lastActivity = currentTime;
  next();
};

module.exports = {
  verifyToken,
  checkRole,
  checkCompanyAccess,
  sessionTimeout,
};
