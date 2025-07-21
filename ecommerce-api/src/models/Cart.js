// src/models/Cart.js - Shopping cart model for user purchases
const mongoose = require('mongoose');

/**
 * Cart Item Schema Definition
 * Represents individual items in the shopping cart
 */
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
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
  price: {
    type: Number,
    required: [true, 'Price snapshot is required'],
    min: [0, 'Price cannot be negative']
  }
}, {
  _id: false, // Don't create separate _id for subdocuments
  timestamps: false
});

/**
 * Cart Schema Definition
 * Manages user shopping cart with items and calculations
 */
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true // Each user can have only one cart
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: function(items) {
          return items.length <= 50; // Limit cart items
        },
        message: 'Cart cannot have more than 50 items'
      }
    },
    totalItems: {
      type: Number,
      default: 0,
      min: [0, 'Total items cannot be negative']
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative']
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Virtual field to check if cart is empty
 */
cartSchema.virtual('isEmpty').get(function () {
  return this.items.length === 0;
});

/**
 * Virtual field to get formatted total amount
 */
cartSchema.virtual('formattedTotal').get(function () {
  return `$${this.totalAmount.toFixed(2)}`;
});

/**
 * Pre-save middleware to calculate totals before saving
 */
cartSchema.pre('save', function (next) {
  this.calculateTotals();
  next();
});

/**
 * Instance method to calculate total items and amount
 */
cartSchema.methods.calculateTotals = function () {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

/**
 * Instance method to add item to cart
 * @param {Object} productData - Product information
 * @param {number} quantity - Quantity to add
 * @returns {Object} - Updated cart
 */
cartSchema.methods.addItem = function (productData, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === productData._id.toString()
  );

  if (existingItemIndex > -1) {
    // Update existing item quantity
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item to cart
    this.items.push({
      product: productData._id,
      quantity: quantity,
      price: productData.price
    });
  }

  return this;
};

/**
 * Instance method to update item quantity
 * @param {string} productId - Product ID to update
 * @param {number} quantity - New quantity
 * @returns {boolean} - True if item was updated, false if not found
 */
cartSchema.methods.updateItemQuantity = function (productId, quantity) {
  const itemIndex = this.items.findIndex(
    item => item.product.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
    return true;
  }
  return false;
};

/**
 * Instance method to remove item from cart
 * @param {string} productId - Product ID to remove
 * @returns {boolean} - True if item was removed, false if not found
 */
cartSchema.methods.removeItem = function (productId) {
  const initialLength = this.items.length;
  this.items = this.items.filter(
    item => item.product.toString() !== productId.toString()
  );
  return this.items.length < initialLength;
};

/**
 * Instance method to clear all items from cart
 */
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.totalItems = 0;
  this.totalAmount = 0;
};

/**
 * Instance method to get item by product ID
 * @param {string} productId - Product ID to find
 * @returns {Object|null} - Cart item or null if not found
 */
cartSchema.methods.getItem = function (productId) {
  return this.items.find(
    item => item.product.toString() === productId.toString()
  ) || null;
};

/**
 * Static method to find cart by user ID
 * @param {string} userId - User ID
 * @returns {Promise} - Cart document with populated products
 */
cartSchema.statics.findByUser = function (userId) {
  return this.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'name price stock images category isActive'
  });
};

/**
 * Static method to create or get existing cart for user
 * @param {string} userId - User ID
 * @returns {Promise} - Cart document
 */
cartSchema.statics.findOrCreateByUser = async function (userId) {
  let cart = await this.findOne({ user: userId });
  
  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
  }
  
  return cart;
};

// Create indexes for better query performance
cartSchema.index({ user: 1 });
cartSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('Cart', cartSchema);
