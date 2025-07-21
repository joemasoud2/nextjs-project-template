// src/routes/productRoutes.js - Product management routes
const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  updateProductStock,
  getCategories
} = require('../controllers/productController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/products/categories/list
 * @desc    Get all product categories
 * @access  Public
 */
router.get('/categories/list', getCategories);

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering, sorting, and pagination
 * @access  Public
 * @query   page, limit, category, minPrice, maxPrice, inStock, search, sortBy, sortOrder
 */
router.get('/', getProducts);

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:category', getProductsByCategory);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product (Admin only)
 * @access  Private/Admin
 */
router.post('/', verifyToken, isAdmin, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', verifyToken, isAdmin, updateProduct);

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update product stock (Admin only)
 * @access  Private/Admin
 */
router.patch('/:id/stock', verifyToken, isAdmin, updateProductStock);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (Admin only) - Soft delete
 * @access  Private/Admin
 */
router.delete('/:id', verifyToken, isAdmin, deleteProduct);

module.exports = router;
