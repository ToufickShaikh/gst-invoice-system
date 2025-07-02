// backend/app.js
// Main Express app setup for GST Invoice System backend
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// Import route handlers
const authRoutes = require('./routes/authRoutes.js');
const customerRoutes = require('./routes/customerRoutes.js');
const itemRoutes = require('./routes/itemRoutes.js');
const billingRoutes = require('./routes/billingRoutes.js');

const app = express(); // Create Express app instance

// Middleware setup
app.use(cors({
    origin: [
        'https://shaikhgst.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true
})); // Enable CORS for Netlify, local dev, etc.
app.use(bodyParser.json()); // Parse JSON request bodies

// Health check route
app.get('/', (req, res) => {
    res.send('GST Billing Backend is running!');
});

// API Routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/customers', customerRoutes); // Customer management routes
app.use('/api/items', itemRoutes); // Item management routes
app.use('/api/billing', billingRoutes); // Billing/invoice routes

// Serve generated invoices as static files
app.use('/invoices', express.static('invoices'));

module.exports = app;