// src/middlewares/errorHandler.js - Global error handling middleware
const mongoose = require('mongoose');

/**
 * Global error handling middleware
 * Catches all errors and sends standardized error responses
 * Must be placed after all routes in the application
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details for debugging
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId error
  if (err.name === 'CastError') {
    const message = 'Resource not found. Invalid ID format.';
    error = {
      message,
      statusCode: 404,
      type: 'ValidationError'
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value for ${field}: '${value}'. This ${field} already exists.`;
    error = {
      message,
      statusCode: 400,
      type: 'DuplicateError',
      field: field
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message: `Validation Error: ${message}`,
      statusCode: 400,
      type: 'ValidationError',
      errors: Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {})
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token. Please login again.',
      statusCode: 401,
      type: 'AuthenticationError'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired. Please login again.',
      statusCode: 401,
      type: 'AuthenticationError'
    };
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    error = {
      message: 'Database connection error. Please try again later.',
      statusCode: 503,
      type: 'DatabaseError'
    };
  }

  // File upload errors (if using multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File size too large. Please upload a smaller file.',
      statusCode: 400,
      type: 'FileUploadError'
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field or too many files.',
      statusCode: 400,
      type: 'FileUploadError'
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
      type: 'RateLimitError'
    };
  }

  // Default error response structure
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'Internal Server Error',
      type: error.type || 'ServerError',
      ...(error.field && { field: error.field }),
      ...(error.errors && { validationErrors: error.errors }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        originalError: err.name
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Send error response
  res.status(error.statusCode || 500).json(errorResponse);
};

/**
 * Middleware to handle 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.type = 'NotFoundError';
  next(error);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, type = 'ApplicationError') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error helper
 */
const createValidationError = (message, field = null) => {
  const error = new AppError(message, 400, 'ValidationError');
  if (field) error.field = field;
  return error;
};

/**
 * Authentication error helper
 */
const createAuthError = (message = 'Authentication failed') => {
  return new AppError(message, 401, 'AuthenticationError');
};

/**
 * Authorization error helper
 */
const createAuthorizationError = (message = 'Access denied') => {
  return new AppError(message, 403, 'AuthorizationError');
};

/**
 * Not found error helper
 */
const createNotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404, 'NotFoundError');
};

/**
 * Conflict error helper (for duplicate resources)
 */
const createConflictError = (message) => {
  return new AppError(message, 409, 'ConflictError');
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError
};
