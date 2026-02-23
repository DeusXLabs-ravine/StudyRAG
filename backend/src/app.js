const express = require('express');
const cors = require('cors');
const path = require('path');
const { allowedOrigins } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');

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

const app = express();

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (requireAuth applied per-route inside authRoutes)
app.use('/api/auth', authRoutes);

// Protect all other /api routes with auth middleware
app.use('/api', requireAuth);

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

// Static file serving and SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (req, res, next) => {
    // Only fallback for non-API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
