// src/controllers/productController.js - Product management controller
const Product = require('../models/Product');
const { asyncHandler, AppError, createValidationError, createNotFoundError } = require('../middlewares/errorHandler');

/**
 * Get all products with filtering, sorting, and pagination
 * @route GET /api/products
 * @access Public
 */
const getProducts = asyncHandler(async (req, res, next) => {
  // Extract query parameters
  const {
    page = 1,
    limit = 10,
    category,
    minPrice,
    maxPrice,
    inStock,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const filter = { isActive: true };

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Stock filter
  if (inStock === 'true') {
    filter.stock = { $gt: 0 };
  }

  // Search filter (name and description)
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [products, totalProducts] = await Promise.all([
    Product.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter)
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalProducts / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.json({
    success: true,
    message: 'Products retrieved successfully',
    data: {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      },
      filters: {
        category,
        minPrice,
        maxPrice,
        inStock,
        search
      }
    }
  });
});

/**
 * Get single product by ID
 * @route GET /api/products/:id
 * @access Public
 */
const getProductById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findOne({ _id: id, isActive: true })
    .populate('createdBy', 'name email');

  if (!product) {
    return next(createNotFoundError('Product'));
  }

  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: {
      product
    }
  });
});

/**
 * Create new product (Admin only)
 * @route POST /api/products
 * @access Private/Admin
 */
const createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    price,
    category,
    stock,
    images,
    brand,
    sku
  } = req.body;

  // Validate required fields
  if (!name || !price || !category) {
    return next(createValidationError('Name, price, and category are required'));
  }

  // Validate price
  if (price <= 0) {
    return next(createValidationError('Price must be greater than 0', 'price'));
  }

  // Validate stock
  if (stock < 0) {
    return next(createValidationError('Stock cannot be negative', 'stock'));
  }

  // Check if SKU already exists (if provided)
  if (sku) {
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return next(new AppError('Product with this SKU already exists', 409, 'ConflictError'));
    }
  }

  // Create product data
  const productData = {
    name: name.trim(),
    description: description?.trim(),
    price: parseFloat(price),
    category,
    stock: parseInt(stock) || 0,
    images: images || [],
    brand: brand?.trim(),
    sku: sku?.toUpperCase(),
    createdBy: req.user.id
  };

  const product = await Product.create(productData);

  // Populate creator info
  await product.populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      product
    }
  });
});

/**
 * Update product (Admin only)
 * @route PUT /api/products/:id
 * @access Private/Admin
 */
const updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    category,
    stock,
    images,
    brand,
    sku,
    isActive
  } = req.body;

  // Find product
  const product = await Product.findById(id);
  if (!product) {
    return next(createNotFoundError('Product'));
  }

  // Validate price if provided
  if (price !== undefined && price <= 0) {
    return next(createValidationError('Price must be greater than 0', 'price'));
  }

  // Validate stock if provided
  if (stock !== undefined && stock < 0) {
    return next(createValidationError('Stock cannot be negative', 'stock'));
  }

  // Check if SKU already exists (if provided and different from current)
  if (sku && sku.toUpperCase() !== product.sku) {
    const existingProduct = await Product.findOne({ 
      sku: sku.toUpperCase(),
      _id: { $ne: id }
    });
    if (existingProduct) {
      return next(new AppError('Product with this SKU already exists', 409, 'ConflictError'));
    }
  }

  // Update product fields
  if (name !== undefined) product.name = name.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = parseFloat(price);
  if (category !== undefined) product.category = category;
  if (stock !== undefined) product.stock = parseInt(stock);
  if (images !== undefined) product.images = images;
  if (brand !== undefined) product.brand = brand.trim();
  if (sku !== undefined) product.sku = sku.toUpperCase();
  if (isActive !== undefined) product.isActive = isActive;

  const updatedProduct = await product.save();
  await updatedProduct.populate('createdBy', 'name email');

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product: updatedProduct
    }
  });
});

/**
 * Delete product (Admin only)
 * @route DELETE /api/products/:id
 * @access Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return next(createNotFoundError('Product'));
  }

  // Soft delete by setting isActive to false
  product.isActive = false;
  await product.save();

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

/**
 * Get products by category
 * @route GET /api/products/category/:category
 * @access Public
 */
const getProductsByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get products by category
  const [products, totalProducts] = await Promise.all([
    Product.find({ category, isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments({ category, isActive: true })
  ]);

  const totalPages = Math.ceil(totalProducts / limitNum);

  res.json({
    success: true,
    message: `Products in ${category} category retrieved successfully`,
    data: {
      products,
      category,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    }
  });
});

/**
 * Update product stock (Admin only)
 * @route PATCH /api/products/:id/stock
 * @access Private/Admin
 */
const updateProductStock = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { stock, operation = 'set' } = req.body;

  if (stock === undefined) {
    return next(createValidationError('Stock value is required'));
  }

  const product = await Product.findById(id);
  if (!product) {
    return next(createNotFoundError('Product'));
  }

  // Update stock based on operation
  switch (operation) {
    case 'set':
      product.stock = parseInt(stock);
      break;
    case 'add':
      product.stock += parseInt(stock);
      break;
    case 'subtract':
      product.stock -= parseInt(stock);
      if (product.stock < 0) product.stock = 0;
      break;
    default:
      return next(createValidationError('Invalid operation. Use: set, add, or subtract'));
  }

  const updatedProduct = await product.save();

  res.json({
    success: true,
    message: 'Product stock updated successfully',
    data: {
      product: {
        id: updatedProduct._id,
        name: updatedProduct.name,
        stock: updatedProduct.stock,
        inStock: updatedProduct.inStock
      }
    }
  });
});

/**
 * Get product categories
 * @route GET /api/products/categories/list
 * @access Public
 */
const getCategories = asyncHandler(async (req, res, next) => {
  // Get distinct categories from active products
  const categories = await Product.distinct('category', { isActive: true });

  // Get category counts
  const categoryCounts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    message: 'Product categories retrieved successfully',
    data: {
      categories,
      categoryCounts: categoryCounts.map(item => ({
        category: item._id,
        count: item.count
      }))
    }
  });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  updateProductStock,
  getCategories
};
