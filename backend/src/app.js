const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
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

const app = express();

// ─── Performance Middleware ───────────────────────────────────

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Request timeout — longer for document upload/processing
app.use((req, res, next) => {
  if (req.path.startsWith('/documents') && (req.method === 'POST' || req.method === 'PUT')) {
    res.setTimeout(600000); // 10 min for uploads
  } else {
    res.setTimeout(120000); // 2 min for everything else
  }
  next();
});

// ─── CORS ─────────────────────────────────────────────────────

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Trust proxy when behind Railway/Nginx/Cloudflare
app.set('trust proxy', 1);

app.use(express.json({ limit: '200mb' }));
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

app.use(globalLimiter);

// ─── Health & Monitoring ──────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

app.get('/cache-stats', (req, res) => {
  const { requestQueue } = require('./config/gemini');
  res.json({
    caches: getAllCacheStats(),
    geminiQueue: requestQueue ? requestQueue.getStats() : null,
  });
});

// ─── Webhooks (no auth — verified via webhook secret) ────────

app.use('/webhooks', webhookRoutes);

// ─── Auth routes (requireAuth applied per-route inside authRoutes) ──

app.use('/auth', authRoutes);

// Protect all remaining routes with auth middleware
app.use(requireAuth);

// ─── Application Routes ───────────────────────────────────────

app.use('/documents', documentRoutes);
app.use('/modules', moduleRoutes);
app.use('/chat', chatRoutes);
app.use('/quiz', quizRoutes);
app.use('/flashcards', flashcardRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/aptitude', aptitudeRoutes);
app.use('/exam', examRoutes);
app.use('/solver', solverRoutes);
app.use('/tts', ttsRoutes);
app.use('/diagrams', diagramRoutes);
app.use('/courses', courseRoutes);
app.use('/medical', medicalResourceRoutes);
app.use('/games', gameRoutes);
app.use('/simulations', simulationRoutes);

// Strict rate limit for expensive generation endpoints
app.use('/diagrams/generate', generationLimiter);
app.use('/medical/enrich', generationLimiter);
app.use('/games/generate', generationLimiter);
app.use('/simulations/generate-params', generationLimiter);

// ─── Static & SPA Fallback ───────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
  }));
  app.get('/{*path}', (req, res, next) => {
    // Don't serve SPA for API routes
    if (req.path.startsWith('/auth') || req.path.startsWith('/documents') ||
        req.path.startsWith('/modules') || req.path.startsWith('/chat') ||
        req.path.startsWith('/webhooks') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
