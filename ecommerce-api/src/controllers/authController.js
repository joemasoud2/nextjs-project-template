// src/controllers/authController.js - Authentication controller
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middlewares/authMiddleware');
const { asyncHandler, AppError, createValidationError, createAuthError } = require('../middlewares/errorHandler');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return next(createValidationError('Name, email, and password are required'));
  }

  // Validate email format
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return next(createValidationError('Please provide a valid email address', 'email'));
  }

  // Validate password strength
  if (password.length < 6) {
    return next(createValidationError('Password must be at least 6 characters long', 'password'));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 409, 'ConflictError'));
  }

  // Validate role if provided (only admin can create admin users)
  if (role && role === 'admin') {
    return next(new AppError('Cannot register as admin user', 403, 'AuthorizationError'));
  }

  // Create new user
  const userData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: role || 'user'
  };

  const user = await User.create(userData);

  // Generate JWT token
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role
  });

  // Generate refresh token
  const refreshToken = generateRefreshToken({
    id: user._id,
    email: user.email
  });

  // Remove password from response
  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: userResponse,
      token,
      refreshToken
    }
  });
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return next(createValidationError('Email and password are required'));
  }

  // Find user by email (including password field)
  const user = await User.findByEmail(email.toLowerCase());
  if (!user) {
    return next(createAuthError('Invalid email or password'));
  }

  // Check if user account is active
  if (!user.isActive) {
    return next(createAuthError('Account is deactivated. Please contact support.'));
  }

  // Validate password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(createAuthError('Invalid email or password'));
  }

  // Generate JWT token
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role
  });

  // Generate refresh token
  const refreshToken = generateRefreshToken({
    id: user._id,
    email: user.email
  });

  // Prepare user response (exclude password)
  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userResponse,
      token,
      refreshToken
    }
  });
});

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
const getProfile = asyncHandler(async (req, res, next) => {
  // User info is already available from auth middleware
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(createAuthError('User not found'));
  }

  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: userResponse
    }
  });
});

/**
 * Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  // Find current user
  const user = await User.findById(userId);
  if (!user) {
    return next(createAuthError('User not found'));
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return next(createValidationError('Please provide a valid email address', 'email'));
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return next(new AppError('Email is already taken by another user', 409, 'ConflictError'));
    }
  }

  // Update user fields
  if (name) user.name = name.trim();
  if (email) user.email = email.toLowerCase().trim();

  const updatedUser = await user.save();

  // Prepare response
  const userResponse = {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    isActive: updatedUser.isActive,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt
  };

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: userResponse
    }
  });
});

/**
 * Change user password
 * @route PUT /api/auth/change-password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!currentPassword || !newPassword) {
    return next(createValidationError('Current password and new password are required'));
  }

  // Validate new password strength
  if (newPassword.length < 6) {
    return next(createValidationError('New password must be at least 6 characters long', 'newPassword'));
  }

  // Find user with password field
  const user = await User.findById(userId).select('+password');
  if (!user) {
    return next(createAuthError('User not found'));
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return next(createAuthError('Current password is incorrect'));
  }

  // Check if new password is different from current
  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    return next(createValidationError('New password must be different from current password'));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Logout user (client-side token removal)
 * @route POST /api/auth/logout
 * @access Private
 */
const logoutUser = asyncHandler(async (req, res, next) => {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token from storage. This endpoint serves as confirmation.
  
  res.json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client storage.'
  });
});

/**
 * Refresh JWT token
 * @route POST /api/auth/refresh-token
 * @access Public (requires refresh token)
 */
const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return next(createValidationError('Refresh token is required'));
  }

  try {
    // Verify refresh token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(createAuthError('Invalid refresh token or user not found'));
    }

    // Generate new access token
    const newToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    return next(createAuthError('Invalid or expired refresh token'));
  }
});

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  logoutUser,
  refreshToken
};
