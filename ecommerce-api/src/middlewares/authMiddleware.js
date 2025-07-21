// src/middlewares/authMiddleware.js - Authentication and authorization middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and authenticate user
 * Extracts token from Authorization header and validates it
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header (Bearer token format)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format. Use Bearer <token>'
      });
    }

    // Extract the token part after 'Bearer '
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is missing.'
      });
    }

    // Verify the token using JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID from token payload
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated.'
      });
    }

    // Attach user information to request object
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format or signature.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware to check if authenticated user has admin role
 * Must be used after verifyToken middleware
 */
const isAdmin = (req, res, next) => {
  try {
    // Check if user object exists (should be set by verifyToken)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login first.'
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware to check if user is accessing their own resources
 * Compares req.user.id with req.params.userId or req.body.userId
 */
const isOwnerOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Get user ID from params or body
    const targetUserId = req.params.userId || req.body.userId || req.params.id;
    
    // Check if user is accessing their own resource
    if (req.user.id.toString() === targetUserId?.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  } catch (error) {
    console.error('Owner authorization error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Optional authentication middleware
 * Sets user info if token is provided, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          
          if (user && user.isActive) {
            req.user = {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive
            };
          }
        } catch (tokenError) {
          // Token is invalid, but we continue without authentication
          console.log('Optional auth - invalid token:', tokenError.message);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error.message);
    next(); // Continue without authentication
  }
};

/**
 * Utility function to generate JWT token
 * @param {Object} payload - Token payload (usually user info)
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Utility function to generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  verifyToken,
  isAdmin,
  isOwnerOrAdmin,
  optionalAuth,
  generateToken,
  generateRefreshToken
};
