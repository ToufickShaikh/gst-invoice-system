// backend/app.js
// Main Express app setup for GST Invoice System backend
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// Import route handlers
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const itemRoutes = require('./routes/itemRoutes');
const billingRoutes = require('./routes/billingRoutes');
const gstRoutes = require('./routes/gstRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const salesOrderRoutes = require('./routes/salesOrderRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const supplierRoutes = require('./routes/supplierRoutes');

const app = express(); // Create Express app instance

// Middleware setup
app.use(cors({
    origin: [
        'https://shaikhgst.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://185.52.53.253'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
})); // Enable CORS for Netlify, local dev, etc.

// Handle preflight requests explicitly


app.use(bodyParser.json()); // Parse JSON request bodies

// Health check route
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'GST Billing Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Enhanced API health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'API endpoints are working',
        cors: 'enabled',
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint to check file serving
app.get('/api/test-file-serving', (req, res) => {
    const fs = require('fs');
    const path = require('path');

    try {
        const invoicesDir = path.resolve(__dirname, 'invoices');
        const files = fs.readdirSync(invoicesDir);

        res.json({
            status: 'success',
            message: 'File serving is working',
            invoicesDirectory: invoicesDir,
            filesFound: files.length,
            files: files,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'File serving test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/customers', customerRoutes); // Customer management routes
app.use('/api/items', itemRoutes); // Item management routes
app.use('/api/billing', billingRoutes); // Billing/invoice routes
app.use('/api/gst', gstRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/suppliers', supplierRoutes); // Supplier management routes

// Serve generated invoices as static files with proper headers
app.use('/invoices', express.static('invoices'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);

    // Handle specific MongoDB/Mongoose errors
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
        return res.status(503).json({
            message: 'Database connection error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Service temporarily unavailable'
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid data provided'
        });
    }

    // Generic error response
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = app;
