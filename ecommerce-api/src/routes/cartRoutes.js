// src/routes/cartRoutes.js - Shopping cart routes
const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart
} = require('../controllers/cartController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// All cart routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/cart
 * @desc    Get user's shopping cart
 * @access  Private
 */
router.get('/', getCart);

/**
 * @route   GET /api/cart/summary
 * @desc    Get cart summary (items count and total)
 * @access  Private
 */
router.get('/summary', getCartSummary);

/**
 * @route   POST /api/cart/validate
 * @desc    Validate cart items (check stock and active status)
 * @access  Private
 */
router.post('/validate', validateCart);

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Private
 * @body    { productId, quantity }
 */
router.post('/add', addToCart);

/**
 * @route   PUT /api/cart/update
 * @desc    Update cart item quantity
 * @access  Private
 * @body    { productId, quantity }
 */
router.put('/update', updateCartItem);

/**
 * @route   DELETE /api/cart/remove/:productId
 * @desc    Remove specific item from cart
 * @access  Private
 */
router.delete('/remove/:productId', removeFromCart);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/clear', clearCart);

module.exports = router;
