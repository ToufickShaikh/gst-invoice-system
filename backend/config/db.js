// backend/config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        // Try both environment variable names and fallback to localhost
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gst-invoice';
        console.log('Attempting to connect to MongoDB...');
        console.log('Using URI:', mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB');

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