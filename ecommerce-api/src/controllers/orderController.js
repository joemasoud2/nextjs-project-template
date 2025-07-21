// src/controllers/orderController.js - Order management controller
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler, AppError, createValidationError, createNotFoundError } = require('../middlewares/errorHandler');

/**
 * Place a new order
 * @route POST /api/orders
 * @access Private
 */
const placeOrder = asyncHandler(async (req, res, next) => {
  const {
    paymentMethod,
    shippingAddress,
    notes
  } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!paymentMethod) {
    return next(createValidationError('Payment method is required'));
  }

  if (!shippingAddress) {
    return next(createValidationError('Shipping address is required'));
  }

  // Validate shipping address fields
  const requiredAddressFields = ['fullName', 'addressLine1', 'city', 'state', 'zipCode'];
  for (const field of requiredAddressFields) {
    if (!shippingAddress[field]) {
      return next(createValidationError(`Shipping address ${field} is required`));
    }
  }

  // Get user's cart
  const cart = await Cart.findByUser(userId);
  if (!cart || cart.isEmpty) {
    return next(new AppError('Cart is empty. Cannot place order.', 400, 'ValidationError'));
  }

  // Validate cart items and stock
  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const product = cartItem.product;

    // Check if product exists and is active
    if (!product || !product.isActive) {
      return next(new AppError(`Product "${product?.name || 'Unknown'}" is no longer available`, 400, 'ValidationError'));
    }

    // Check stock availability
    if (product.stock < cartItem.quantity) {
      return next(new AppError(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`,
        400,
        'StockError'
      ));
    }

    // Create order item
    const orderItem = {
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: cartItem.quantity,
      subtotal: product.price * cartItem.quantity
    };

    orderItems.push(orderItem);
    subtotal += orderItem.subtotal;
  }

  // Calculate totals (you can add tax and shipping logic here)
  const tax = subtotal * 0.08; // 8% tax rate
  const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
  const totalAmount = subtotal + tax + shipping;

  // Create order
  const orderData = {
    user: userId,
    items: orderItems,
    totalItems: cart.totalItems,
    subtotal,
    tax,
    shipping,
    totalAmount,
    paymentMethod,
    shippingAddress,
    notes: notes?.trim()
  };

  const order = await Order.create(orderData);

  // Reduce product stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } }
    );
  }

  // Clear user's cart
  cart.clearCart();
  await cart.save();

  // Populate order for response
  await order.populate('user', 'name email');

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        totalItems: order.totalItems,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        totalAmount: order.totalAmount,
        formattedTotal: order.formattedTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        shippingAddress: order.shippingAddress,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt
      }
    }
  });
});

/**
 * Get user's orders
 * @route GET /api/orders/user
 * @access Private
 */
const getUserOrders = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  // Build filter
  const filter = { user: userId };
  if (status) {
    filter.orderStatus = status;
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get orders with pagination
  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('items.product', 'name images'),
    Order.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalOrders / limitNum);

  res.json({
    success: true,
    message: 'User orders retrieved successfully',
    data: {
      orders: orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        totalItems: order.totalItems,
        totalAmount: order.totalAmount,
        formattedTotal: order.formattedTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    }
  });
});

/**
 * Get all orders (Admin only)
 * @route GET /api/orders
 * @access Private/Admin
 */
const getAllOrders = asyncHandler(async (req, res, next) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    paymentStatus,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Get orders with pagination
  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalOrders / limitNum);

  res.json({
    success: true,
    message: 'All orders retrieved successfully',
    data: {
      orders: orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        items: order.items,
        totalItems: order.totalItems,
        totalAmount: order.totalAmount,
        formattedTotal: order.formattedTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        shippingAddress: order.shippingAddress,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    }
  });
});

/**
 * Get single order by ID
 * @route GET /api/orders/:id
 * @access Private
 */
const getOrderById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const order = await Order.findById(id)
    .populate('user', 'name email')
    .populate('items.product', 'name images category');

  if (!order) {
    return next(createNotFoundError('Order'));
  }

  // Check if user can access this order (own order or admin)
  if (userRole !== 'admin' && order.user._id.toString() !== userId) {
    return next(new AppError('Access denied. You can only view your own orders.', 403, 'AuthorizationError'));
  }

  res.json({
    success: true,
    message: 'Order retrieved successfully',
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        items: order.items,
        totalItems: order.totalItems,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        totalAmount: order.totalAmount,
        formattedTotal: order.formattedTotal,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    }
  });
});

/**
 * Update order status (Admin only)
 * @route PATCH /api/orders/:id/status
 * @access Private/Admin
 */
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!status) {
    return next(createValidationError('Status is required'));
  }

  const order = await Order.findById(id);
  if (!order) {
    return next(createNotFoundError('Order'));
  }

  // Update order status
  await order.updateStatus(status, reason);

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        updatedAt: order.updatedAt
      }
    }
  });
});

/**
 * Cancel order
 * @route PATCH /api/orders/:id/cancel
 * @access Private
 */
const cancelOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const order = await Order.findById(id);
  if (!order) {
    return next(createNotFoundError('Order'));
  }

  // Check if user can cancel this order (own order or admin)
  if (userRole !== 'admin' && order.user.toString() !== userId) {
    return next(new AppError('Access denied. You can only cancel your own orders.', 403, 'AuthorizationError'));
  }

  // Check if order can be cancelled
  if (!order.canBeCancelled) {
    return next(new AppError('Order cannot be cancelled at this stage', 400, 'ValidationError'));
  }

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );
  }

  // Cancel order
  await order.updateStatus('cancelled', reason);

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason
      }
    }
  });
});

/**
 * Get order statistics (Admin only)
 * @route GET /api/orders/stats/overview
 * @access Private/Admin
 */
const getOrderStats = asyncHandler(async (req, res, next) => {
  const stats = await Order.getOrderStats();

  // Get additional statistics
  const [totalRevenue, totalOrders, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.countDocuments(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .select('orderNumber user totalAmount orderStatus createdAt')
  ]);

  res.json({
    success: true,
    message: 'Order statistics retrieved successfully',
    data: {
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats,
        recentOrders
      }
    }
  });
});

module.exports = {
  placeOrder,
  getUserOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};
