const { responseCache } = require('../config/cache');

/**
 * Express middleware that caches GET responses in-memory.
 * Cache key: method + URL + userId (per-user isolation).
 *
 * @param {number} ttlMs - Cache TTL in milliseconds (default 2 min)
 */
function cacheResponse(ttlMs = 2 * 60_000) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const userId = req.user?.id || 'anon';
    const cacheKey = `res:${userId}:${req.originalUrl}`;

    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Monkey-patch res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        responseCache.set(cacheKey, body, ttlMs);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

module.exports = { cacheResponse };
