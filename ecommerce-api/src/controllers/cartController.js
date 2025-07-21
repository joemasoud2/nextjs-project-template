// src/controllers/cartController.js - Shopping cart management controller
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler, AppError, createValidationError, createNotFoundError } = require('../middlewares/errorHandler');

/**
 * Get user's shopping cart
 * @route GET /api/cart
 * @access Private
 */
const getCart = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  // Find or create cart for user
  let cart = await Cart.findByUser(userId);

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  // Filter out inactive products and update cart
  const activeItems = cart.items.filter(item => 
    item.product && item.product.isActive && item.product.stock > 0
  );

  // Update cart if items were filtered out
  if (activeItems.length !== cart.items.length) {
    cart.items = activeItems;
    cart.calculateTotals();
    await cart.save();
  }

  res.json({
    success: true,
    message: 'Cart retrieved successfully',
    data: {
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        formattedTotal: cart.formattedTotal,
        isEmpty: cart.isEmpty,
        updatedAt: cart.updatedAt
      }
    }
  });
});

/**
 * Add item to cart
 * @route POST /api/cart/add
 * @access Private
 */
const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!productId) {
    return next(createValidationError('Product ID is required'));
  }

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return next(createValidationError('Quantity must be a positive integer'));
  }

  // Find product
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    return next(createNotFoundError('Product'));
  }

  // Check stock availability
  if (product.stock < quantity) {
    return next(new AppError(`Only ${product.stock} items available in stock`, 400, 'StockError'));
  }

  // Find or create cart
  let cart = await Cart.findOrCreateByUser(userId);

  // Check if product already exists in cart
  const existingItem = cart.getItem(productId);
  const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  // Validate total quantity against stock
  if (newQuantity > product.stock) {
    return next(new AppError(
      `Cannot add ${quantity} items. Only ${product.stock - (existingItem?.quantity || 0)} more available`,
      400,
      'StockError'
    ));
  }

  // Add or update item in cart
  cart.addItem(product, quantity);
  await cart.save();

  // Populate cart for response
  await cart.populate({
    path: 'items.product',
    select: 'name price stock images category'
  });

  res.json({
    success: true,
    message: 'Item added to cart successfully',
    data: {
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        formattedTotal: cart.formattedTotal
      }
    }
  });
});

/**
 * Update cart item quantity
 * @route PUT /api/cart/update
 * @access Private
 */
const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!productId) {
    return next(createValidationError('Product ID is required'));
  }

  if (quantity < 0 || !Number.isInteger(quantity)) {
    return next(createValidationError('Quantity must be a non-negative integer'));
  }

  // Find cart
  const cart = await Cart.findByUser(userId);
  if (!cart) {
    return next(createNotFoundError('Cart'));
  }

  // Check if item exists in cart
  const existingItem = cart.getItem(productId);
  if (!existingItem) {
    return next(createNotFoundError('Item in cart'));
  }

  // If quantity is 0, remove item
  if (quantity === 0) {
    cart.removeItem(productId);
  } else {
    // Validate stock availability
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(createNotFoundError('Product'));
    }

    if (quantity > product.stock) {
      return next(new AppError(`Only ${product.stock} items available in stock`, 400, 'StockError'));
    }

    // Update quantity
    cart.updateItemQuantity(productId, quantity);
  }

  await cart.save();

  // Populate cart for response
  await cart.populate({
    path: 'items.product',
    select: 'name price stock images category'
  });

  res.json({
    success: true,
    message: 'Cart item updated successfully',
    data: {
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        formattedTotal: cart.formattedTotal
      }
    }
  });
});

/**
 * Remove item from cart
 * @route DELETE /api/cart/remove/:productId
 * @access Private
 */
const removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user.id;

  // Find cart
  const cart = await Cart.findByUser(userId);
  if (!cart) {
    return next(createNotFoundError('Cart'));
  }

  // Remove item from cart
  const itemRemoved = cart.removeItem(productId);
  if (!itemRemoved) {
    return next(createNotFoundError('Item in cart'));
  }

  await cart.save();

  // Populate cart for response
  await cart.populate({
    path: 'items.product',
    select: 'name price stock images category'
  });

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: {
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        formattedTotal: cart.formattedTotal
      }
    }
  });
});

/**
 * Clear entire cart
 * @route DELETE /api/cart/clear
 * @access Private
 */
const clearCart = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  // Find cart
  const cart = await Cart.findByUser(userId);
  if (!cart) {
    return next(createNotFoundError('Cart'));
  }

  // Clear cart
  cart.clearCart();
  await cart.save();

  res.json({
    success: true,
    message: 'Cart cleared successfully',
    data: {
      cart: {
        id: cart._id,
        items: [],
        totalItems: 0,
        totalAmount: 0,
        formattedTotal: '$0.00',
        isEmpty: true
      }
    }
  });
});

/**
 * Get cart summary (items count and total)
 * @route GET /api/cart/summary
 * @access Private
 */
const getCartSummary = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const cart = await Cart.findOne({ user: userId });

  const summary = {
    totalItems: cart ? cart.totalItems : 0,
    totalAmount: cart ? cart.totalAmount : 0,
    formattedTotal: cart ? cart.formattedTotal : '$0.00',
    itemCount: cart ? cart.items.length : 0,
    isEmpty: cart ? cart.isEmpty : true
  };

  res.json({
    success: true,
    message: 'Cart summary retrieved successfully',
    data: {
      summary
    }
  });
});

/**
 * Validate cart items (check stock and active status)
 * @route POST /api/cart/validate
 * @access Private
 */
const validateCart = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const cart = await Cart.findByUser(userId);
  if (!cart || cart.isEmpty) {
    return res.json({
      success: true,
      message: 'Cart is empty',
      data: {
        isValid: true,
        issues: []
      }
    });
  }

  const issues = [];
  const validItems = [];

  // Check each item
  for (const item of cart.items) {
    const product = item.product;

    if (!product) {
      issues.push({
        productId: item.product,
        issue: 'Product not found',
        action: 'remove'
      });
      continue;
    }

    if (!product.isActive) {
      issues.push({
        productId: product._id,
        productName: product.name,
        issue: 'Product is no longer available',
        action: 'remove'
      });
      continue;
    }

    if (product.stock === 0) {
      issues.push({
        productId: product._id,
        productName: product.name,
        issue: 'Product is out of stock',
        action: 'remove'
      });
      continue;
    }

    if (item.quantity > product.stock) {
      issues.push({
        productId: product._id,
        productName: product.name,
        issue: `Only ${product.stock} items available, but ${item.quantity} requested`,
        action: 'reduce',
        availableStock: product.stock,
        requestedQuantity: item.quantity
      });
      
      // Add item with reduced quantity
      validItems.push({
        ...item.toObject(),
        quantity: product.stock
      });
    } else {
      validItems.push(item);
    }
  }

  // Update cart if there are issues
  if (issues.length > 0) {
    cart.items = validItems;
    cart.calculateTotals();
    await cart.save();
  }

  res.json({
    success: true,
    message: 'Cart validation completed',
    data: {
      isValid: issues.length === 0,
      issues,
      updatedCart: issues.length > 0 ? {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        formattedTotal: cart.formattedTotal
      } : null
    }
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart
};
