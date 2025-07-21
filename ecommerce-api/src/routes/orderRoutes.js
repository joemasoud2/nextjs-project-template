// src/routes/orderRoutes.js - Order management routes
const express = require('express');
const {
  placeOrder,
  getUserOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} = require('../controllers/orderController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// All order routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/orders/stats/overview
 * @desc    Get order statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/stats/overview', isAdmin, getOrderStats);

/**
 * @route   GET /api/orders/user
 * @desc    Get current user's orders
 * @access  Private
 * @query   page, limit, status
 */
router.get('/user', getUserOrders);

/**
 * @route   GET /api/orders
 * @desc    Get all orders (Admin only)
 * @access  Private/Admin
 * @query   page, limit, status, paymentStatus, sortBy, sortOrder
 */
router.get('/', isAdmin, getAllOrders);

/**
 * @route   POST /api/orders
 * @desc    Place a new order
 * @access  Private
 * @body    { paymentMethod, shippingAddress, notes }
 */
router.post('/', placeOrder);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private (own orders) / Admin (all orders)
 */
router.get('/:id', getOrderById);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (Admin only)
 * @access  Private/Admin
 * @body    { status, reason }
 */
router.patch('/:id/status', isAdmin, updateOrderStatus);

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (own orders) / Admin (all orders)
 * @body    { reason }
 */
router.patch('/:id/cancel', cancelOrder);

module.exports = router;
