// src/routes/authRoutes.js - Authentication routes
const express = require('express');
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  logoutUser,
  refreshToken
} = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token using refresh token
 * @access  Public (requires refresh token)
 */
router.post('/refresh-token', refreshToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', verifyToken, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', verifyToken, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', verifyToken, changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', verifyToken, logoutUser);

module.exports = router;
