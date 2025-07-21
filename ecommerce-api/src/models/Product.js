// src/models/Product.js - Product model for e-commerce catalog
const mongoose = require('mongoose');

/**
 * Product Schema Definition
 * Manages product catalog with inventory tracking
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function(value) {
          return Number.isFinite(value) && value >= 0;
        },
        message: 'Price must be a valid positive number'
      }
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      enum: {
        values: [
          'Electronics',
          'Clothing',
          'Books',
          'Home & Garden',
          'Sports',
          'Beauty',
          'Toys',
          'Food',
          'Other'
        ],
        message: 'Please select a valid category'
      }
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number'
      }
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(images) {
          return images.length <= 5;
        },
        message: 'Cannot have more than 5 images per product'
      }
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [50, 'Brand name cannot exceed 50 characters']
    },
    sku: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple documents without SKU
      trim: true,
      uppercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must have a creator']
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Virtual field to check if product is in stock
 */
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

/**
 * Virtual field to get formatted price
 */
productSchema.virtual('formattedPrice').get(function () {
  return `$${this.price.toFixed(2)}`;
});

/**
 * Instance method to check if sufficient stock is available
 * @param {number} quantity - Requested quantity
 * @returns {boolean} - True if sufficient stock available
 */
productSchema.methods.hasStock = function (quantity) {
  return this.stock >= quantity;
};

/**
 * Instance method to reduce stock quantity
 * @param {number} quantity - Quantity to reduce
 * @returns {Promise} - Updated product document
 */
productSchema.methods.reduceStock = async function (quantity) {
  if (!this.hasStock(quantity)) {
    throw new Error('Insufficient stock available');
  }
  
  this.stock -= quantity;
  return await this.save();
};

/**
 * Instance method to increase stock quantity
 * @param {number} quantity - Quantity to add
 * @returns {Promise} - Updated product document
 */
productSchema.methods.increaseStock = async function (quantity) {
  this.stock += quantity;
  return await this.save();
};

/**
 * Static method to find products by category
 * @param {string} category - Product category
 * @returns {Promise} - Array of products in category
 */
productSchema.statics.findByCategory = function (category) {
  return this.find({ category, isActive: true });
};

/**
 * Static method to find products in stock
 * @returns {Promise} - Array of products with stock > 0
 */
productSchema.statics.findInStock = function () {
  return this.find({ stock: { $gt: 0 }, isActive: true });
};

/**
 * Pre-save middleware to generate SKU if not provided
 */
productSchema.pre('save', function (next) {
  if (!this.sku && this.isNew) {
    // Generate simple SKU based on category and timestamp
    const categoryCode = this.category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${categoryCode}-${timestamp}`;
  }
  next();
});

// Create indexes for better query performance
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Product', productSchema);
