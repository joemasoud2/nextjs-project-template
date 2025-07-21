// index.js - Main application entry point
const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const { errorHandler } = require('./src/middlewares/errorHandler');

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();

// Connect to MongoDB database
connectDB();

// Middleware to parse JSON request bodies
app.use(express.json());

// Basic route for API health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'E-Commerce API is running successfully!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders'
    }
  });
});

// Mount API Routes with their base paths
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Global Error Handling Middleware (must be last)
app.use(errorHandler);

// Start the server on the specified port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 E-Commerce API Server started on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
});
