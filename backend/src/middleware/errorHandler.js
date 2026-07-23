// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Full details to server log only — never to client
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: req.user?.id || 'anonymous',
    error: err.message,
    code: err.code,
    stack: err.stack,
  });

  let statusCode = err.statusCode || 500;
  let clientMessage = 'An unexpected error occurred';

  if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    clientMessage = 'Invalid data submitted. Please check your input.';
    // ✅ FIX: never send err.message (leaks schema info)
  } else if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = 409;
      const field = err.meta?.target?.[0];
      clientMessage = field === 'email' ? 'Email already registered' : 'Duplicate entry';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      clientMessage = 'Record not found';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      clientMessage = 'Referenced record does not exist';
    } else {
      statusCode = 400;
      clientMessage = 'Database operation failed';
    }
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    clientMessage = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    clientMessage = 'Authentication token has expired';
    // ✅ FIX: no expiredAt in response (information disclosure)
  } else if (err.statusCode) {
    // AppError with explicit status — use the message as-is (developer-set)
    clientMessage = err.message;
  }

  return res.status(statusCode).json({
    error: clientMessage,
    // Stack only in dev, never in production
    ...(process.env.NODE_ENV === 'development' && { debug: err.message, stack: err.stack }),
  });
};

// 404 handler — don't leak internal path details in production
const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Resource not found' });
};

// Wraps async route handlers so thrown errors reach errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, notFoundHandler, asyncHandler, AppError };
