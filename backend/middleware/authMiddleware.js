const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return sendErrorResponse(res, 401, 'Not authorized, user not found');
            }

            next();
        } catch (error) {
            console.error('[AUTH] Token verification failed:', error);
            sendErrorResponse(res, 401, 'Not authorized, token failed', error);
        }
    } else {
        sendErrorResponse(res, 401, 'Not authorized, no token');
    }
};

module.exports = { protect };