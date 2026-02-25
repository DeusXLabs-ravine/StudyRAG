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

const app = express();

// ─── Performance Middleware ───────────────────────────────────

// Gzip/Brotli compression — reduces response size ~80% for JSON/text
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Request timeout — longer for document upload/processing, standard for everything else
app.use((req, res, next) => {
  // Document upload/processing endpoints get 10 minutes (1K+ page docs need time)
  if (req.path.startsWith('/api/documents') && (req.method === 'POST' || req.method === 'PUT')) {
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

app.use(express.json({ limit: '200mb' })); // Large enough for 1K+ page document uploads
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────

// Global rate limit: 200 req/min per IP (generous for normal use)
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Strict rate limit for expensive endpoints (LLM generation)
const generationLimiter = rateLimit({
  windowMs: 60_000,
  max: 20, // 20 generation requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation rate limit reached. Please wait a moment.' },
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

// Apply strict rate limit to expensive generation endpoints
app.use('/api/diagrams/generate', generationLimiter);
app.use('/api/medical/enrich', generationLimiter);
app.use('/api/games/generate', generationLimiter);

// ─── Static & SPA Fallback ───────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath, {
    maxAge: '1d', // Browser cache static assets for 1 day
    etag: true,
  }));
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
