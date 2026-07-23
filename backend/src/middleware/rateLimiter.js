const rateLimit = require('express-rate-limit');

const onLimitReached = (req, res) => {
  res.status(429).json({
    error: 'Too many requests. Please try again later.',
    retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60),
  });
};

// Auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
  skipSuccessfulRequests: false,
});

// OTP/customer-portal: 5 attempts per 10 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
});

// General API: 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
});

module.exports = { authLimiter, otpLimiter, apiLimiter };
