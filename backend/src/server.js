const cluster = require('node:cluster');
const os = require('node:os');
const { nodeEnv } = require('./config/env');

// In production, fork workers to use all CPU cores.
// In development, run single process for easier debugging.
const USE_CLUSTERING = nodeEnv === 'production' && process.env.DISABLE_CLUSTERING !== 'true';
const WORKER_COUNT = Math.min(os.cpus().length, 8); // Cap at 8 workers

if (USE_CLUSTERING && cluster.isPrimary) {
  console.log(`[Cluster] Primary ${process.pid} starting ${WORKER_COUNT} workers...`);

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Cluster] Worker ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Restarting...`);
    cluster.fork();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Cluster] SIGTERM received — shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].process.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 5000);
  });
} else {
  // Single worker (or dev mode)
  require('./config/database');

  const app = require('./app');
  const { port } = require('./config/env');
  const { WebSocketServer } = require('ws');
  const { handleLiveConnection } = require('./services/geminiLiveProxy');

  const server = app.listen(port, '0.0.0.0', () => {
    const mode = cluster.isWorker ? `[Worker ${cluster.worker.id}]` : '[Single Mode]';
    console.log(`[Server] ${mode} StudyRAG Backend listening on port ${port} [${nodeEnv}]`);
    if (!cluster.isWorker) {
      console.log(`[Database] Connecting to Supabase (PostgreSQL)...`);
    }
  });

  // WebSocket server for Gemini Live proxy — mounted on the same HTTP server
  // so Railway's single port handles both HTTP and WS upgrades transparently.
  const wss = new WebSocketServer({ server, path: '/live' });
  wss.on('connection', handleLiveConnection);
  wss.on('error', (err) => console.error('[WSS] Server error:', err.message));


  // Graceful shutdown for individual workers
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received — closing connections...');
    server.close(() => {
      console.log('[Server] Connections closed. Exiting.');
      process.exit(0);
    });
    // Force exit after 10s if connections don't close
    setTimeout(() => process.exit(1), 10000);
  });
}
