const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // ✅ FIX: do not return expiredAt — information disclosure
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const checkRole = (allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: insufficient role' });
  }
  next();
};

/**
 * ✅ FIX: Enforces that the :companyId route param matches the token's companyId.
 * Prevents IDOR attacks where User A sends requests for Company B's data.
 * Must be placed after verifyToken.
 */
const requireCompanyAccess = (req, res, next) => {
  const { companyId } = req.params;
  if (!companyId) return next();
  if (req.user.companyId !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = { verifyToken, checkRole, requireCompanyAccess };
