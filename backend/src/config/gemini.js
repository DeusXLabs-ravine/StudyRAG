const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiApiKey, geminiApiKeys } = require('./env');

// ─── GeminiKeyPool: Round-Robin Multi-Key Management ──────────

class GeminiKeyPool {
  constructor(apiKeys) {
    this.entries = apiKeys.map(key => ({
      key: key.slice(0, 8) + '...',
      genAI: new GoogleGenerativeAI(key),
      rateLimitedUntil: 0,
    }));
    this.index = 0;
    this.cooldownMs = 60_000;
  }

  getClient() {
    const now = Date.now();
    const total = this.entries.length;
    for (let i = 0; i < total; i++) {
      const entry = this.entries[this.index % total];
      this.index = (this.index + 1) % total;
      if (entry.rateLimitedUntil <= now) return entry;
    }
    // All keys are rate-limited — return the one whose cooldown expires soonest
    const soonest = [...this.entries].sort((a, b) => a.rateLimitedUntil - b.rateLimitedUntil)[0];
    const waitMs = soonest.rateLimitedUntil - now;
    console.warn(`[GeminiKeyPool] All keys rate-limited, soonest available in ${Math.ceil(waitMs / 1000)}s`);
    return soonest;
  }

  markRateLimited(entry) {
    entry.rateLimitedUntil = Date.now() + this.cooldownMs;
    console.warn(`[GeminiKeyPool] Key ${entry.key} rate-limited, cooldown ${this.cooldownMs}ms`);
  }
}

// ─── Priority Request Queue ───────────────────────────────────
// Limits concurrent Gemini API calls to prevent overload at scale.
// Priority 0 = user-facing (interactive), 1 = background (generation).

class GeminiRequestQueue {
  constructor(maxConcurrent = 15) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = []; // { fn, resolve, reject, priority }
    this.stats = { enqueued: 0, completed: 0, errored: 0, peakConcurrent: 0 };
  }

  /**
   * Execute an async function with concurrency control.
   * @param {Function} fn - Async function to execute
   * @param {number} priority - 0 = high (user-facing), 1 = low (background)
   */
  async execute(fn, priority = 0) {
    this.stats.enqueued++;
    if (this.running < this.maxConcurrent) {
      return this._run(fn);
    }
    // Queue the request, sorted by priority (lower = higher priority)
    return new Promise((resolve, reject) => {
      const item = { fn, resolve, reject, priority };
      // Insert in priority order (binary search for efficiency)
      let lo = 0, hi = this.queue.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (this.queue[mid].priority <= priority) lo = mid + 1;
        else hi = mid;
      }
      this.queue.splice(lo, 0, item);
    });
  }

  async _run(fn) {
    this.running++;
    if (this.running > this.stats.peakConcurrent) {
      this.stats.peakConcurrent = this.running;
    }
    try {
      const result = await fn();
      this.stats.completed++;
      return result;
    } catch (err) {
      this.stats.errored++;
      throw err;
    } finally {
      this.running--;
      this._drain();
    }
  }

  _drain() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      this._run(fn).then(resolve, reject);
    }
  }

  getStats() {
    return {
      ...this.stats,
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// ─── Initialize Pool & Queue ──────────────────────────────────

const keys = geminiApiKeys && geminiApiKeys.length > 0 ? geminiApiKeys : (geminiApiKey ? [geminiApiKey] : []);

if (keys.length === 0) {
  console.warn('WARNING: No GEMINI_API_KEY(s) set. AI features will not work.');
}

const keyPool = keys.length > 0 ? new GeminiKeyPool(keys) : null;

// Concurrency limit: ~15 per key (Gemini rate limit is ~15 RPM for free, 1500 for paid)
const maxConcurrent = Math.max(15, keys.length * 15);
const requestQueue = new GeminiRequestQueue(maxConcurrent);

if (keys.length > 0) {
  console.log(`[GeminiKeyPool] ${keys.length} key(s), max ${maxConcurrent} concurrent requests`);
}

// Model tiers (with fallbacks for high-demand periods)
const MODELS = {
  fast: 'gemini-3-flash-preview',
  standard: 'gemini-3-flash-preview',
  advanced: 'gemini-3-pro-preview',
  imageGen: 'gemini-3-pro-image-preview',
};

const FALLBACK_MODELS = {
  fast: ['gemini-2.5flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
  standard: ['gemini-2.5-flash', 'gemini-1.5-flash'],
  advanced: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
};

// ─── Model Getters ────────────────────────────────────────────

function getGenerativeModel(tier = 'standard') {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  const modelName = MODELS[tier] || MODELS.standard;
  return entry.genAI.getGenerativeModel({ model: modelName });
}

function getSearchGroundedModel(tier = 'standard') {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  const modelName = MODELS[tier] || MODELS.standard;
  return entry.genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} }],
  });
}

function getEmbeddingModel() {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  return entry.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
}

function getImageGenerationModel() {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  return entry.genAI.getGenerativeModel({
    model: MODELS.imageGen,
    generationConfig: { responseModalities: ['image', 'text'] },
  });
}

function selectModelTier(contentHints = {}) {
  const { hasMath, hasScience, hasCode, isComplex, isAptitudeTest } = contentHints;
  if (isAptitudeTest || hasMath || hasCode || isComplex) return 'advanced';
  if (hasScience) return 'advanced';
  return 'standard';
}

async function generateContentWithVision(imageBuffer, mimeType, prompt, tier = 'standard') {
  const model = getGenerativeModel(tier);
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
  ]);
  return result.response.text();
}

// ─── Retry Wrapper with Queue Integration ─────────────────────

/**
 * Execute an async function through the request queue with retry on 429/503.
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Max retry attempts (default 3)
 * @param {number} priority - 0 = user-facing, 1 = background
 */
async function withRetryOnRateLimit(fn, maxRetries = 3, priority = 0) {
  return requestQueue.execute(async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isRateLimit = err?.status === 429 ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('429') ||
          err?.code === 429;

        const isOverloaded = err?.status === 503 ||
          err?.message?.includes('503') ||
          err?.message?.includes('Service Unavailable') ||
          err?.message?.includes('high demand') ||
          err?.message?.includes('UNAVAILABLE') ||
          err?.message?.includes('overloaded');

        if ((isRateLimit || isOverloaded) && attempt < maxRetries && keyPool) {
          // Mark all entries that are likely rate-limited for this model
          // (we can't know which key fn() used internally, so mark the most recently
          // rotated entry — getClient() advances the index, so the previous one was used)
          if (isRateLimit) {
            const total = keyPool.entries.length;
            const usedIdx = (keyPool.index - 1 + total) % total;
            keyPool.markRateLimited(keyPool.entries[usedIdx]);
          }
          const waitMs = isOverloaded ? 2000 * (attempt + 1) : 1000 * (attempt + 1);
          console.warn(`[GeminiKeyPool] ${isOverloaded ? '503 overloaded' : 'Rate limited'}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw err;
      }
    }
  }, priority);
}

/**
 * Execute with automatic model fallback on 503/overload errors.
 * Tries the primary model first, then each fallback in order.
 * @param {Function} fnFactory - (modelName) => async () => result
 * @param {string} tier - 'fast' | 'standard' | 'advanced'
 * @param {number} priority - 0 = user-facing, 1 = background
 */
async function withModelFallback(fnFactory, tier = 'fast', priority = 0) {
  const primary = MODELS[tier] || MODELS.standard;
  const fallbacks = FALLBACK_MODELS[tier] || [];
  const allModels = [primary, ...fallbacks];

  for (let i = 0; i < allModels.length; i++) {
    const modelName = allModels[i];
    try {
      return await requestQueue.execute(async () => {
        return await fnFactory(modelName)();
      }, priority);
    } catch (err) {
      const isOverloaded = err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('Service Unavailable') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('overloaded');

      const isRateLimit = err?.status === 429 ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('429');

      if ((isOverloaded || isRateLimit) && i < allModels.length - 1) {
        console.warn(`[GeminiKeyPool] Model ${modelName} unavailable (${err.status || '?'}), falling back to ${allModels[i + 1]}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
}

// ─── Backward Compat ──────────────────────────────────────────

const genAI = keyPool ? new Proxy({}, {
  get(_, prop) {
    return keyPool.getClient().genAI[prop];
  },
}) : null;

module.exports = {
  genAI,
  keyPool,
  requestQueue,
  getGenerativeModel,
  getSearchGroundedModel,
  getEmbeddingModel,
  getImageGenerationModel,
  selectModelTier,
  generateContentWithVision,
  withRetryOnRateLimit,
  withModelFallback,
  MODELS,
  FALLBACK_MODELS,
};
