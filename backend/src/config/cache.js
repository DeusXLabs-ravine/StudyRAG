/**
 * Lightweight LRU cache for StudyRAG.
 * No external dependencies — uses a Map with TTL-based eviction.
 * Designed for single-process caching (works with clustering via per-worker cache).
 */

class LRUCache {
  /**
   * @param {Object} opts
   * @param {number} opts.max - Maximum entries (default 1000)
   * @param {number} opts.ttlMs - Default TTL in ms (default 5 minutes)
   * @param {string} opts.name - Cache name for logging
   */
  constructor({ max = 1000, ttlMs = 5 * 60 * 1000, name = 'cache' } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.name = name;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      this.misses++;
      return undefined;
    }
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key, value, ttlMs) {
    // Delete first to update position
    this.map.delete(key);
    // Evict oldest if at capacity
    if (this.map.size >= this.max) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.ttlMs),
    });
  }

  del(key) {
    this.map.delete(key);
  }

  /** Delete all entries whose key starts with the given prefix. */
  invalidatePrefix(prefix) {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      name: this.name,
      size: this.map.size,
      max: this.max,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : 'N/A',
    };
  }
}

// ─── Pre-configured cache instances ───────────────────────────

/** Auth token cache — short TTL, validates user tokens without DB hit */
const authCache = new LRUCache({ max: 5000, ttlMs: 60_000, name: 'auth' }); // 1 min

/** User profile cache — teaching level, interests, learning style */
const profileCache = new LRUCache({ max: 5000, ttlMs: 5 * 60_000, name: 'profile' }); // 5 min

/** Document metadata cache */
const documentCache = new LRUCache({ max: 2000, ttlMs: 10 * 60_000, name: 'document' }); // 10 min

/** Module data cache */
const moduleCache = new LRUCache({ max: 2000, ttlMs: 5 * 60_000, name: 'module' }); // 5 min

/** Embedding cache — caches query→embedding mappings to avoid re-calling Gemini */
const embeddingCache = new LRUCache({ max: 5000, ttlMs: 60 * 60_000, name: 'embedding' }); // 1 hour

/** Response cache — for GET endpoint responses */
const responseCache = new LRUCache({ max: 3000, ttlMs: 2 * 60_000, name: 'response' }); // 2 min

/** Flashcard deck/list cache */
const flashcardCache = new LRUCache({ max: 2000, ttlMs: 5 * 60_000, name: 'flashcard' }); // 5 min

/** Get all cache stats for monitoring */
function getAllCacheStats() {
  return [
    authCache.stats(),
    profileCache.stats(),
    documentCache.stats(),
    moduleCache.stats(),
    embeddingCache.stats(),
    responseCache.stats(),
    flashcardCache.stats(),
  ];
}

module.exports = {
  LRUCache,
  authCache,
  profileCache,
  documentCache,
  moduleCache,
  embeddingCache,
  responseCache,
  flashcardCache,
  getAllCacheStats,
};
