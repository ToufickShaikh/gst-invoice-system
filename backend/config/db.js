// backend/config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        // Use local MongoDB only
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gst_invoice_system';
        console.log('Attempting to connect to MongoDB...');
        console.log('Using URI: Local MongoDB');

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Connected successfully');
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('This may cause 502 errors on API endpoints');
        // Don't exit process - let the app run without DB for basic health checks
        throw err;
    }
};

module.exports = connectDB;