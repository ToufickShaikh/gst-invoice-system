// backend/server.js
// Entry point for starting the backend server
const app = require('./app.js');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

dotenv.config(); // Load environment variables from .env file

logger.info('Starting GST Invoice Backend...');
logger.info('Environment:', process.env.NODE_ENV || 'development');
logger.debug('MongoDB URI present:', !!process.env.MONGODB_URI);

// Connect to MongoDB with error handling
connectDB().catch(err => {
    logger.error('Failed to connect to MongoDB:', err);
    logger.warn('Server will continue without database connection...');
});

const PORT = process.env.PORT || 3000;

// Start the Express server
const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`✅ Backend server is running on port ${PORT}`);
    logger.debug(`CORS allowed for local dev and port ${PORT}`);
    logger.debug(`Health check available at: http://localhost:${PORT}/api/health`);
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