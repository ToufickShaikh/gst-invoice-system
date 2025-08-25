// backend/server.js
// Entry point for starting the backend server
const app = require('./app.js');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

console.log('Starting GST Invoice Backend...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Using default localhost');
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET is not set. Authentication tokens will fail verification. Set JWT_SECRET in your environment or .env.production for PM2.');
} else {
    console.log('JWT_SECRET is set (length:', String(process.env.JWT_SECRET).length, 'characters)');
}

// Connect to MongoDB with error handling
connectDB().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    console.log('Server will continue without database connection...');
});

const PORT = process.env.PORT || 3000;

// Start the Express server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend server is running on port ${PORT}`);
    console.log(`✅ CORS enabled for: http://localhost:5173, http://localhost:3000, http://localhost:${PORT}`);
    console.log(`✅ Health check available at: http://localhost:${PORT}/api/health`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});