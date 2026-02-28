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
  imageGen: [
    'gemini-3-pro-image-preview',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
  ],
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

function getUrlContextModel(tier = 'standard') {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  const modelName = MODELS[tier] || MODELS.standard;
  return entry.genAI.getGenerativeModel({
    model: modelName,
    tools: [{ urlContext: {} }],
  });
}

function getSearchAndUrlModel(tier = 'standard') {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  const modelName = MODELS[tier] || MODELS.standard;
  return entry.genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} }, { urlContext: {} }],
  });
}

/**
 * Run Gemini Deep Research via REST API (Interactions API).
 * Returns { text, sources } or null if unavailable/failed.
 * This is async — it polls until complete or timeout.
 */
async function runDeepResearch(prompt, { timeoutMs = 600_000, pollIntervalMs = 5_000 } = {}) {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  const rawKey = geminiApiKeys?.find(k => k.slice(0, 8) === entry.key.replace('...', '')) || geminiApiKey;
  if (!rawKey) throw new Error('Could not resolve raw API key for Deep Research');

  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  // Step 1: Create the interaction
  const createRes = await fetch(`${baseUrl}/interactions?key=${rawKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'deep-research-pro-preview-12-2025',
      userInput: { text: prompt },
      background: true,
      store: true,
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`Deep Research create failed (${createRes.status}): ${errBody}`);
  }

  const interaction = await createRes.json();
  const interactionId = interaction.name || interaction.id;
  if (!interactionId) throw new Error('Deep Research: no interaction ID returned');

  console.log(`[DeepResearch] Started interaction ${interactionId}`);

  // Step 2: Poll until complete
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const pollRes = await fetch(`${baseUrl}/${interactionId}?key=${rawKey}`);
    if (!pollRes.ok) {
      console.warn(`[DeepResearch] Poll failed (${pollRes.status}), retrying...`);
      continue;
    }

    const state = await pollRes.json();
    const status = state.status || state.state;

    if (status === 'COMPLETED' || status === 'completed') {
      // Extract text and sources from the response
      const outputText = state.outputText || state.response?.text || '';
      const sources = (state.groundingMetadata?.groundingChunks || [])
        .filter(c => c.web?.uri)
        .map(c => ({ title: c.web.title || '', url: c.web.uri }));

      console.log(`[DeepResearch] Completed in ${Math.round((Date.now() - startTime) / 1000)}s, ${sources.length} sources`);
      return { text: outputText, sources };
    }

    if (status === 'FAILED' || status === 'failed') {
      throw new Error(`Deep Research failed: ${state.error?.message || 'unknown error'}`);
    }

    // Still running — continue polling
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed % 30 === 0) {
      console.log(`[DeepResearch] Still running... (${elapsed}s elapsed)`);
    }
  }

  throw new Error(`Deep Research timed out after ${timeoutMs / 1000}s`);
}

function getEmbeddingModel() {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();
  return entry.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
}

// Track which image model works to avoid wasting retries on unavailable models
let _workingImageModel = null;
let _failedImageModels = new Set();

function getImageGenerationModel() {
  if (!keyPool) throw new Error('Gemini API key not configured');
  const entry = keyPool.getClient();

  // If we already know a working model, use it directly
  if (_workingImageModel) {
    return entry.genAI.getGenerativeModel({
      model: _workingImageModel,
      generationConfig: { responseModalities: ['image', 'text'] },
    });
  }

  // Return the first non-failed model in the priority list
  const candidates = MODELS.imageGen.filter(m => !_failedImageModels.has(m));
  const modelName = candidates[0] || MODELS.imageGen[MODELS.imageGen.length - 1];
  return entry.genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseModalities: ['image', 'text'] },
  });
}

function markImageModelFailed(modelName) {
  _failedImageModels.add(modelName);
  console.warn(`[GeminiImageGen] Model "${modelName}" marked unavailable, will try next fallback`);
}

function markImageModelWorking(modelName) {
  if (_workingImageModel !== modelName) {
    _workingImageModel = modelName;
    console.log(`[GeminiImageGen] Using "${modelName}" for image generation`);
  }
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
  getUrlContextModel,
  getSearchAndUrlModel,
  runDeepResearch,
  getEmbeddingModel,
  getImageGenerationModel,
  markImageModelFailed,
  markImageModelWorking,
  selectModelTier,
  generateContentWithVision,
  withRetryOnRateLimit,
  withModelFallback,
  MODELS,
  FALLBACK_MODELS,
};
