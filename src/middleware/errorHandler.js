'use strict';

/**
 * Global error handler middleware for Express.
 *
 * Catches any error thrown (or passed via next(err)) in route handlers and
 * returns a consistent JSON envelope:
 *
 *   { success: false, error: '<message>' }
 *
 * In development / demo mode the stack trace is also included.
 */
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ErrorHandler] ${statusCode} — ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
