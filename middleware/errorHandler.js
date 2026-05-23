/**
 * Global Express error handler.
 * All route errors should call next(err) instead of try/catch repetition.
 */
const errorHandler = (err, req, res, next) => {
  // Log server-side
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `${field} already exists.`,
      field,
    });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // JWT errors (should be caught in middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
