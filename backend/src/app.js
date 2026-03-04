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

app.get('/api/cache-stats', (req, res) => {
  const { requestQueue } = require('./config/gemini');
  res.json({
    caches: getAllCacheStats(),
    geminiQueue: requestQueue ? requestQueue.getStats() : null,
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
app.use('/api/diagrams', diagramRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/medical', medicalResourceRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/simulations', simulationRoutes);

// Strict rate limit for expensive generation endpoints
app.use('/api/diagrams/generate', generationLimiter);
app.use('/api/medical/enrich', generationLimiter);
app.use('/api/games/generate', generationLimiter);
app.use('/api/simulations/generate-params', generationLimiter);

// ─── Static & SPA Fallback ───────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
  }));
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
