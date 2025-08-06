const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return sendErrorResponse(res, 400, 'Please enter all fields');
    }

    try {
        // Check if user exists
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) {
            return sendErrorResponse(res, 400, 'User already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            sendErrorResponse(res, 400, 'Invalid user data');
        }
    } catch (error) {
        sendErrorResponse(res, 500, 'Server error during registration', error);
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return sendErrorResponse(res, 400, 'Please enter all fields');
    }

    try {
        // Check for user by username or email
        const user = await User.findOne({ $or: [{ username }, { email: username }] });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            sendErrorResponse(res, 401, 'Invalid credentials');
        }
    } catch (error) {
        sendErrorResponse(res, 500, 'Server error during login', error);
    }
};

module.exports = { register, login };
