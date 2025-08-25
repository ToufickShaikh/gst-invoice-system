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
// Allow configuring limits via environment variables and whitelist internal/trusted IPs
const RATE_API_WINDOW_MS = Number(process.env.RATE_API_WINDOW_MS) || 1 * 60 * 1000; // default 1 minute
const RATE_API_MAX = Number(process.env.RATE_API_MAX) || 100; // default 100 requests per window
const RATE_PUBLIC_MAX = Number(process.env.RATE_PUBLIC_MAX) || 200;
const RATE_AUTH_MAX = Number(process.env.RATE_AUTH_MAX) || 5;

// Build whitelist from env var (comma separated IPs) and allow internal proxy header bypass
const buildWhitelist = () => {
  const raw = process.env.RATE_LIMIT_WHITELIST || '';
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
};
const RATE_WHITELIST = buildWhitelist();

const isWhitelisted = (req) => {
  // Allow bypass via explicit header (used by trusted proxies) or by IP whitelist
  try {
    const internalHeader = (req.get('x-internal-request') || '').toString();
    if (internalHeader === '1') return true;
    const forwardedFor = req.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(s => s.trim());
      for (const ip of ips) if (RATE_WHITELIST.has(ip)) return true;
    }
    if (RATE_WHITELIST.has(req.ip)) return true;
  } catch (e) {
    // ignore
  }
  return false;
};

// Build exempt paths from env or defaults. These are regex strings matched against req.originalUrl
const buildExemptPaths = () => {
  const raw = process.env.RATE_LIMIT_EXEMPT_PATHS || '';
  if (!raw) {
    // sensible defaults: portal-link creation, invoice delete, dashboard-stats
    return [
      '/api/billing/invoices/.+/portal-link',
      '/api/billing/invoices/.+',
      '/api/billing/dashboard-stats',
      // v2 equivalents
      '/api/invoices/.+/portal-link',
      '/api/invoices/.+',
      '/api/invoices/customers/.+/payments'
    ];
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};
const RATE_EXEMPT_PATHS = buildExemptPaths().map(p => new RegExp(p));

const isExemptPath = (req) => {
  try {
    const url = req.originalUrl || req.url || '';
    return RATE_EXEMPT_PATHS.some(rx => rx.test(url));
  } catch (e) {
    return false;
  }
};

const rateLimiters = {
  // Strict rate limiting for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: RATE_AUTH_MAX, // configurable
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
    windowMs: RATE_API_WINDOW_MS,
    max: RATE_API_MAX,
  skip: (req) => isWhitelisted(req) || isExemptPath(req), // skip limiter for trusted/internal sources or exempted paths
    message: {
      error: 'API rate limit exceeded',
      retryAfter: `${Math.ceil(RATE_API_WINDOW_MS / 1000)} seconds`
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Lenient rate limiting for public endpoints
  public: rateLimit({
    windowMs: RATE_API_WINDOW_MS,
    max: RATE_PUBLIC_MAX,
  skip: (req) => isWhitelisted(req) || isExemptPath(req),
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

    // Headers are already set in the main middleware, don't set them again here
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
  securityMiddleware,
  requestOptimization
  ]
};
