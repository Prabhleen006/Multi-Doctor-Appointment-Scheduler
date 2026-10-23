const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_scheduler';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Fails fast if cluster is unreachable
    });

    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Reconnection & connection lifecycle monitors
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB connection lost. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB connection re-established.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database Error] Ongoing MongoDB error:', err.message);
    });

    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to establish initial connection to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
