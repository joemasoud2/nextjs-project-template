// src/config/database.js - MongoDB connection configuration
const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose
 * Uses connection string from environment variables
 */
const connectDB = async () => {
  try {
    // Connect to MongoDB with recommended options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📁 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Exit process with failure code
    process.exit(1);
  }
};

/**
 * Handle MongoDB connection events
 */
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = { connectDB };
