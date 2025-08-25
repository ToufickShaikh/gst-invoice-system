const Redis = require('redis');
const NodeCache = require('node-cache');

/**
 * Advanced Caching System with Redis and Memory Cache
 * Implements multiple cache layers for optimal performance
 */

class CacheManager {
  constructor() {
    // In-memory cache for frequently accessed data
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance
    });

    // Redis cache for distributed caching (if available)
    this.redisClient = null;
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              console.log('Redis server connection failed');
              return undefined; // Don't retry
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              return undefined; // Stop retrying after 1 hour
            }
            if (options.attempt > 10) {
              return undefined; // Stop after 10 attempts
            }
            return Math.min(options.attempt * 100, 3000); // Exponential backoff
          }
        });

        this.redisClient.on('error', (err) => {
          console.warn('Redis error, falling back to memory cache:', err.message);
        });

        this.redisClient.on('connect', () => {
          console.log('✅ Redis cache connected');
        });

        await this.redisClient.connect();
      }
    } catch (error) {
      console.warn('Redis initialization failed, using memory cache only:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Get value from cache with fallback hierarchy
   */
  async get(key) {
    try {
      // Try memory cache first (fastest)
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        return JSON.parse(memoryResult);
      }

      // Try Redis cache
      if (this.redisClient) {
        const redisResult = await this.redisClient.get(key);
        if (redisResult) {
          // Store in memory cache for future requests
          this.memoryCache.set(key, redisResult, 300);
          return JSON.parse(redisResult);
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in all cache layers
   */
  async set(key, value, ttl = 300) {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in memory cache
      this.memoryCache.set(key, serializedValue, ttl);

      // Set in Redis cache
      if (this.redisClient) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key) {
    try {
      this.memoryCache.del(key);
      if (this.redisClient) {
        await this.redisClient.del(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clear() {
    try {
      this.memoryCache.flushAll();
      if (this.redisClient) {
        await this.redisClient.flushAll();
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0
      },
      redis: {
        connected: !!this.redisClient?.isReady
      }
    };
  }

  /**
   * Cache wrapper for expensive operations
   */
  async cached(key, fetchFn, ttl = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fetchFn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern) {
    try {
      // Memory cache doesn't support patterns, so we clear related keys manually
      const keys = this.memoryCache.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern));
      matchingKeys.forEach(key => this.memoryCache.del(key));

      // Redis pattern deletion
      if (this.redisClient) {
        const redisKeys = await this.redisClient.keys(`*${pattern}*`);
        if (redisKeys.length > 0) {
          await this.redisClient.del(redisKeys);
        }
      }

      return true;
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
      return false;
    }
  }
}

// Singleton instance
const cacheManager = new CacheManager();

/**
 * Cache middleware for Express routes
 */
const cacheMiddleware = (ttl = 300, keyGenerator) => {
  return async (req, res, next) => {
    // Only cache GET responses. For non-GET (POST/PUT/DELETE) we must bypass
    // the cache so write operations reach the controller.
    if (String(req.method || '').toUpperCase() !== 'GET') {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Generate cache key for GET requests
    const cacheKey = keyGenerator ? 
      keyGenerator(req) : 
      `route:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      res.setHeader('X-Cache', 'MISS');

      // Override res.json to cache the response only for successful GET responses
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Only cache successful GET responses
        if (res.statusCode >= 400) {
          return originalJson(data);
        }

        // Cache successful GET responses
        cacheManager.set(cacheKey, data, ttl);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Specific cache keys and TTL configurations
 */
const cacheConfig = {
  dashboard: {
    ttl: 5 * 60, // 5 minutes
    key: (req) => `dashboard:${req.query.dateRange || 'default'}`
  },
  invoices: {
    ttl: 2 * 60, // 2 minutes
    key: (req) => `invoices:${JSON.stringify(req.query)}`
  },
  customers: {
    ttl: 10 * 60, // 10 minutes
    key: (req) => `customers:${JSON.stringify(req.query)}`
  },
  items: {
    ttl: 15 * 60, // 15 minutes
    key: (req) => `items:${JSON.stringify(req.query)}`
  },
  invoice_detail: {
    ttl: 5 * 60, // 5 minutes
    key: (req) => `invoice:${req.params.id}`
  }
};

module.exports = {
  cacheManager,
  cacheMiddleware,
  cacheConfig
};
