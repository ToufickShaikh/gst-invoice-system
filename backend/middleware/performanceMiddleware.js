const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const compression = require('compression');
const { cacheManager, cacheMiddleware, cacheConfig } = require('../utils/cacheManager');

/**
 * Advanced Performance Middleware Suite
 * Implements rate limiting, compression, caching, and security
 */

// Rate limiting configurations
const rateLimiters = {
  // Strict rate limiting for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many authentication attempts',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      });
    }
  }),

  // General API rate limiting
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      error: 'API rate limit exceeded',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Lenient rate limiting for public endpoints
  public: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  }),

  // File upload rate limiting
  upload: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    message: 'Too many file uploads, please try again later.'
  })
};

// Speed limiting (slow down responses after threshold)
const speedLimiters = {
  api: slowDown({
    windowMs: 1 * 60 * 1000, // 1 minute
    delayAfter: 50, // Start slowing down after 50 requests
    delayMs: () => 100, // Add 100ms delay per request after threshold (v2 syntax)
    maxDelayMs: 2000, // Max 2 second delay
    validate: { delayMs: false } // Disable deprecation warning
  })
};

// Compression middleware with optimization
const compressionMiddleware = compression({
  // Compression level (6 is good balance of speed/compression)
  level: 6,
  // Don't compress responses below 1KB
  threshold: 1024,
  // Compression filter
  filter: (req, res) => {
    // Don't compress if content is already compressed
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter
    return compression.filter(req, res);
  }
});

// Advanced security headers
const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request optimization middleware
const requestOptimization = (req, res, next) => {
  // Add request timing
  req.startTime = Date.now();

  // Optimize response headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Add response timing header before response is sent
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    
    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
    
    return originalSend.call(this, data);
  };

  next();
};

// Database connection optimization middleware
const dbHealthCheck = (req, res, next) => {
  const mongoose = require('mongoose');
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'Service temporarily unavailable'
    });
  }
  
  next();
};

// Memory usage monitoring (development only)
const memoryMonitoring = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  const memUsage = process.memoryUsage();
  const mbUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  res.setHeader('X-Memory-Usage', `${mbUsed}MB`);
  
  // Warn if memory usage is high
  if (mbUsed > 200) {
    console.warn(`High memory usage: ${mbUsed}MB`);
  }
  
  next();
};

// Enhanced error handling middleware
const errorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || Date.now().toString();
  
  // Log error with context
  console.error('Request Error:', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  // Default error response
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  // Security: Don't leak internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    error: true,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
};

// Performance monitoring middleware
const performanceMonitoring = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    const metrics = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Math.round(duration),
      contentLength: res.get('content-length') || 0,
      userAgent: req.headers['user-agent']
    };

    // Store metrics for analytics (could send to monitoring service)
    if (process.env.NODE_ENV === 'development') {
      console.log('Request Metrics:', metrics);
    }

    // Add performance headers
    res.setHeader('X-Response-Time', `${Math.round(duration)}ms`);
  });

  next();
};

// Cache invalidation helpers
const cacheInvalidation = {
  invalidateInvoices: async () => {
    await cacheManager.invalidatePattern('invoices');
    await cacheManager.invalidatePattern('dashboard');
  },

  invalidateCustomers: async () => {
    await cacheManager.invalidatePattern('customers');
    await cacheManager.invalidatePattern('dashboard');
  },

  invalidateItems: async () => {
    await cacheManager.invalidatePattern('items');
  }
};

module.exports = {
  rateLimiters,
  speedLimiters,
  compressionMiddleware,
  securityMiddleware,
  requestOptimization,
  dbHealthCheck,
  memoryMonitoring,
  errorHandler,
  performanceMonitoring,
  cacheInvalidation,
  
  // Convenience middleware stacks
  developmentStack: [
    requestOptimization,
    memoryMonitoring,
    performanceMonitoring,
    compressionMiddleware
  ],

  productionStack: [
    securityMiddleware,
    requestOptimization,
    performanceMonitoring,
    compressionMiddleware,
    rateLimiters.api,
    speedLimiters.api
  ],

  publicStack: [
    rateLimiters.public,
    compressionMiddleware,
    performanceMonitoring
  ],

  authStack: [
    rateLimiters.auth,
    securityMiddleware,
    requestOptimization
  ]
};
