const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not defined in environment variables.');
      return;
    }
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    isConnected = true;
    console.log(`MongoDB Connected (Pool Size: 50): ${conn.connection.host}`);

    // Auto-sanitize existing database names to ensure first and last names have first letters capitalized
    const { sanitizeAllDatabaseNames } = require('../utils/formatters');
    sanitizeAllDatabaseNames().catch(err => console.error('Sanitization non-fatal error:', err));
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
