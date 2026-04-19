const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { allowedOrigins } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');
const { getAllCacheStats } = require('./config/cache');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const chatRoutes = require('./routes/chatRoutes');
const quizRoutes = require('./routes/quizRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aptitudeRoutes = require('./routes/aptitudeRoutes');
const examRoutes = require('./routes/examRoutes');
const solverRoutes = require('./routes/solverRoutes');
const ttsRoutes = require('./routes/ttsRoutes');
const diagramRoutes = require('./routes/diagramRoutes');
const courseRoutes = require('./routes/courseRoutes');
const medicalResourceRoutes = require('./routes/medicalResourceRoutes');
const gameRoutes = require('./routes/gameRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const geminiRoutes = require('./routes/geminiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const podcastRoutes = require('./routes/podcastRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const widgetRoutes = require('./routes/widgetRoutes');

const app = express();

// ─── Performance Middleware ───────────────────────────────────

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    // Never compress SSE streams — compression buffers output, breaking streaming
    if (req.path === '/api/chat/stream' || req.path === '/chat/stream') return false;
    return compression.filter(req, res);
  },
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/documents') && (req.method === 'POST' || req.method === 'PUT')) {
    res.setTimeout(600000);
  } else {
    res.setTimeout(120000);
  }
  next();
});

// ─── CORS ─────────────────────────────────────────────────────

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Keep TCP connections alive to eliminate per-request TLS/TCP setup overhead
app.use((_req, res, next) => {
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=60');
  next();
});

app.set('trust proxy', 1);

app.use(express.json({
  limit: '200mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "We're experiencing high demand right now. Please try again in a minute." } },
});

const generationLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Lots of people are studying right now! Please wait a moment and try again." } },
});

app.use('/api', globalLimiter);

// ─── Health & Monitoring ──────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

// Ultra-lightweight ping for latency measurement — no auth, no processing
app.get('/api/ping', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ pong: true, t: Date.now() });
});

app.get('/api/cache-stats', (req, res) => {
  const { requestQueue } = require('./config/gemini');
  res.json({
    caches: getAllCacheStats(),
    geminiQueue: requestQueue ? requestQueue.getStats() : null,
  });
});

app.get('/live', (_req, res) => {
  res.status(426).json({
    error: {
      message: 'This endpoint requires a WebSocket upgrade.',
    },
  });
});

// ─── Webhooks (no auth — verified via webhook secret) ────────

app.use('/webhooks', webhookRoutes);
app.use('/api/webhooks', webhookRoutes);

// ─── Auth routes (requireAuth applied per-route inside authRoutes) ──

app.use('/api/auth', authRoutes);

// Protect all other /api routes with auth middleware
app.use('/api', requireAuth);

// ─── Application Routes ───────────────────────────────────────
// Generation-heavy endpoints get their own rate limiter BEFORE the route handler.

app.use('/api/documents', documentRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/aptitude', aptitudeRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/solver', solverRoutes);
app.use('/api/tts', ttsRoutes);
// Generation limiters applied per-router before the handler is registered
app.use('/api/diagrams/generate', generationLimiter);
app.use('/api/diagrams', diagramRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/medical/enrich', generationLimiter);
app.use('/api/medical', medicalResourceRoutes);
app.use('/api/games/generate', generationLimiter);
app.use('/api/games', gameRoutes);
app.use('/api/simulations/generate-params', generationLimiter);
app.use('/api/simulations', simulationRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/podcast/generate', generationLimiter);
app.use('/api/podcast', podcastRoutes);

// OCR scan — bounded by the generation limiter since each call invokes a
// vision provider. Requires auth (applied above via requireAuth).
app.use('/api/documents/ocr', generationLimiter);
app.use('/api/documents/ocr', ocrRoutes);

// Widget content — lightweight; global limiter is enough.
app.use('/api/widgets', widgetRoutes);

// ─── Static & SPA Fallback ───────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');

  // Vite hashes asset filenames — serve with long-lived immutable cache.
  // Anything under /assets/ is safe to cache for 1 year.
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
    etag: false,       // not needed with immutable
    lastModified: false,
  }));

  // Apple Pay domain verification file (Paystack).
  // Paystack strictly requires Content-Type: application/text.
  // We load the file into memory at boot from the first path that resolves —
  // this removes any runtime path-resolution ambiguity in the container.
  const applePayCandidates = [
    path.join(__dirname, '../.well-known/apple-developer-merchantid-domain-association'),
    path.join(__dirname, '../../backend/.well-known/apple-developer-merchantid-domain-association'),
    path.join(__dirname, '../../frontend/dist/.well-known/apple-developer-merchantid-domain-association'),
    path.join(__dirname, '../../frontend/public/.well-known/apple-developer-merchantid-domain-association'),
    path.join(process.cwd(), 'backend/.well-known/apple-developer-merchantid-domain-association'),
    path.join(process.cwd(), '.well-known/apple-developer-merchantid-domain-association'),
  ];

  let applePayBuffer = null;
  let applePaySource = null;
  for (const p of applePayCandidates) {
    try {
      if (fs.existsSync(p)) {
        applePayBuffer = fs.readFileSync(p);
        applePaySource = p;
        break;
      }
    } catch { /* try next */ }
  }
  if (applePayBuffer) {
    console.log('[ApplePay] Loaded verification file from', applePaySource, `(${applePayBuffer.length} bytes)`);
  } else {
    console.error('[ApplePay] Verification file NOT FOUND. Tried:', applePayCandidates);
  }

  app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => {
    res.set('Content-Type', 'application/text');
    res.set('Cache-Control', 'public, max-age=300');
    if (!applePayBuffer) {
      return res.status(404).send('verification file not found');
    }
    res.send(applePayBuffer);
  });

  // All other static files (index.html, robots.txt, etc.) — short cache.
  app.use(express.static(distPath, {
    maxAge: '5m',
    etag: true,
    dotfiles: 'allow',
  }));

  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhooks') || req.path.startsWith('/live') || req.path.startsWith('/.well-known')) {
      return next();
    }
    // index.html must not be cached aggressively (contains no hash)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
