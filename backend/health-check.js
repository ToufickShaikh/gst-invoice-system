// Simple health check for deployment troubleshooting
const express = require('express');
const cors = require('cors');

const app = express();

// Basic CORS setup
app.use(cors({
    origin: [
        'https://shaikhgst.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000',
        '*'  // Allow all origins for testing
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Enhanced health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'GST Billing Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
    });
});

// CORS preflight handler
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Test API endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'API is working',
        cors: 'enabled',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Health check server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Access from: ${JSON.stringify([
        'https://shaikhgst.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ])}`);
});

module.exports = app;
