// src/models/Order.js - Order model for purchase transactions
const mongoose = require('mongoose');

/**
 * Order Item Schema Definition
 * Represents individual items in an order (snapshot from cart)
 */
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  name: {
    type: String,
    required: [true, 'Product name is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number'
    }
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  }
}, {
  _id: false, // Don't create separate _id for subdocuments
  timestamps: false
});

/**
 * Shipping Address Schema Definition
 */
const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  addressLine1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true
  },
  addressLine2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'United States'
  },
  phone: {
    type: String,
    trim: true
  }
}, {
  _id: false,
  timestamps: false
});

/**
 * Order Schema Definition
 * Manages customer orders with payment and shipping information
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order must have at least one item'],
      validate: {
        validator: function(items) {
          return items.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },
    totalItems: {
      type: Number,
      required: [true, 'Total items count is required'],
      min: [1, 'Total items must be at least 1']
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    shipping: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['Cash', 'Online', 'Card', 'PayPal', 'Bank Transfer'],
        message: 'Please select a valid payment method'
      }
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'failed', 'refunded'],
        message: 'Please select a valid payment status'
      },
      default: 'pending'
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        message: 'Please select a valid order status'
      },
      default: 'pending'
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, 'Shipping address is required']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    estimatedDelivery: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Virtual field to get formatted total amount
 */
orderSchema.virtual('formattedTotal').get(function () {
  return `$${this.totalAmount.toFixed(2)}`;
});

/**
 * Virtual field to check if order is completed
 */
orderSchema.virtual('isCompleted').get(function () {
  return this.orderStatus === 'delivered' && this.paymentStatus === 'completed';
});

/**
 * Virtual field to check if order can be cancelled
 */
orderSchema.virtual('canBeCancelled').get(function () {
  return ['pending', 'confirmed'].includes(this.orderStatus);
});

/**
 * Pre-save middleware to generate order number and calculate totals
 */
orderSchema.pre('save', function (next) {
  // Generate order number if new order
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp.slice(-8)}-${random}`;
  }

  // Calculate totals
  this.calculateTotals();
  
  // Set estimated delivery (7 days from now for standard shipping)
  if (this.isNew && !this.estimatedDelivery) {
    this.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  next();
});

/**
 * Instance method to calculate order totals
 */
orderSchema.methods.calculateTotals = function () {
  // Calculate subtotal and total items
  this.subtotal = this.items.reduce((total, item) => total + item.subtotal, 0);
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  
  // Calculate total amount (subtotal + tax + shipping)
  this.totalAmount = this.subtotal + this.tax + this.shipping;
  
  // Ensure each item's subtotal is correct
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
};

/**
 * Instance method to update order status
 * @param {string} status - New order status
 * @param {string} reason - Reason for status change (optional)
 */
orderSchema.methods.updateStatus = function (status, reason = null) {
  this.orderStatus = status;
  
  if (status === 'delivered') {
    this.deliveredAt = new Date();
    this.paymentStatus = 'completed';
  } else if (status === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
  }
  
  return this.save();
};

/**
 * Instance method to mark order as paid
 */
orderSchema.methods.markAsPaid = function () {
  this.paymentStatus = 'completed';
  return this.save();
};

/**
 * Static method to find orders by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, sort, etc.)
 * @returns {Promise} - Array of user orders
 */
orderSchema.statics.findByUser = function (userId, options = {}) {
  const query = this.find({ user: userId });
  
  if (options.limit) query.limit(options.limit);
  if (options.sort) query.sort(options.sort);
  
  return query.populate('user', 'name email');
};

/**
 * Static method to find orders by status
 * @param {string} status - Order status
 * @returns {Promise} - Array of orders with specified status
 */
orderSchema.statics.findByStatus = function (status) {
  return this.find({ orderStatus: status }).populate('user', 'name email');
};

/**
 * Static method to get order statistics
 * @returns {Promise} - Order statistics object
 */
orderSchema.statics.getOrderStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  return stats;
};

// Create indexes for better query performance
orderSchema.index({ user: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
