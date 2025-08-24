// backend/app.js
// Enhanced Enterprise-Grade Express app setup for GST Invoice System
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Enhanced middleware and optimizations
const {
  productionStack,
  developmentStack,
  publicStack,
  authStack,
  errorHandler,
  dbHealthCheck
} = require('./middleware/performanceMiddleware');
const { cacheManager, cacheMiddleware, cacheConfig } = require('./utils/cacheManager');
const { createIndexes } = require('./utils/databaseOptimization');

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
const companyRoutes = require('./routes/companyRoutes');
const cashDrawerRoutes = require('./routes/cashDrawerRoutes');
const enterpriseRoutes = require('./routes/enterpriseRoutes');

const app = express();

// Trust proxy for accurate client IP detection
app.set('trust proxy', 1);

// Environment-specific middleware stacks
if (process.env.NODE_ENV === 'production') {
  app.use(...productionStack);
} else {
  app.use(...developmentStack);
}

// Enhanced CORS configuration
const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://shaikhcarpets.vercel.app',
    'http://185.52.53.253',
    'https://185.52.53.253'
];
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (no Origin header)
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'X-Request-ID']
}));

// Enhanced body parsing with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Database health check for all routes
app.use(dbHealthCheck);

// Health check routes (no auth required)
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: '🚀 Enhanced GST Billing Backend is running!',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        features: [
            'Advanced Caching',
            'Rate Limiting',
            'Performance Monitoring',
            'Database Optimization',
            'Security Headers',
            'Compression'
        ]
    });
});

// Enhanced API health check with system metrics
app.get('/api/health', async (req, res) => {
    const mongoose = require('mongoose');
    const cacheStats = cacheManager.getStats();
    
    res.json({
        status: 'healthy',
        message: 'All systems operational',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        database: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            name: mongoose.connection.name
        },
        cache: cacheStats,
        performance: {
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            cpu: process.cpuUsage()
        }
    });
});

// Cache statistics endpoint (development only)
if (process.env.NODE_ENV === 'development') {
    app.get('/api/cache/stats', (req, res) => {
        res.json(cacheManager.getStats());
    });
    
    app.delete('/api/cache/clear', async (req, res) => {
        await cacheManager.clear();
        res.json({ message: 'Cache cleared successfully' });
    });
}

// API Routes with authentication stack for protected routes
app.use('/api/auth', ...authStack, authRoutes);

// Protected API routes with caching
app.use('/api/customers', 
    cacheMiddleware(cacheConfig.customers.ttl, cacheConfig.customers.key),
    customerRoutes
);

app.use('/api/items',
    cacheMiddleware(cacheConfig.items.ttl, cacheConfig.items.key),
    itemRoutes
);

app.use('/api/billing',
    cacheMiddleware(cacheConfig.invoices.ttl, cacheConfig.invoices.key),
    billingRoutes
);

// Other routes (with appropriate caching)
app.use('/api/gst', gstRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/cash-drawer', cashDrawerRoutes);

// Enterprise features with enhanced security
app.use('/api/enterprise', ...authStack, enterpriseRoutes);

// Public routes with public stack
app.use('/invoices', ...publicStack, express.static('invoices'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `${req.method} ${req.originalUrl} is not a valid endpoint`,
        availableRoutes: [
            'GET /api/health',
            'GET /api/customers',
            'GET /api/items',
            'GET /api/billing',
            'POST /api/auth/login'
        ]
    });
});

// Enhanced global error handler
app.use(errorHandler);

// Initialize database optimizations
const initializeOptimizations = async () => {
    try {
        console.log('🚀 Initializing database optimizations...');
        await createIndexes();
        console.log('✅ All optimizations initialized successfully');
    } catch (error) {
        console.error('❌ Optimization initialization failed:', error);
    }
};

// Initialize on startup
if (process.env.NODE_ENV === 'production') {
    initializeOptimizations();
}

module.exports = app;
