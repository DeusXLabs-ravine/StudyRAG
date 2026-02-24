const supabase = require('../config/database');
const { authCache } = require('../config/cache');

const MAX_AUTH_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function isNetworkError(err) {
  const msg = err?.message || err?.cause?.message || '';
  return msg.includes('fetch failed') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('socket') ||
    msg.includes('other side closed') ||
    err?.cause?.code === 'UND_ERR_SOCKET';
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or invalid authorization header' } });
  }

  const token = authHeader.slice(7);

  // Check cache first — avoids DB call for every request
  const cached = authCache.get(token);
  if (cached) {
    req.user = cached;
    req.userId = cached.id;
    next();
    return;
  }

  // Retry on transient network errors
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: { message: 'Invalid or expired token' } });
      }
      const userData = { id: user.id, email: user.email };
      authCache.set(token, userData);
      req.user = userData;
      req.userId = user.id;
      next();
      return;
    } catch (err) {
      if (isNetworkError(err) && attempt < MAX_AUTH_RETRIES) {
        console.warn(`[Auth] Network error (attempt ${attempt + 1}/${MAX_AUTH_RETRIES + 1}), retrying...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      // Network error after all retries — return 503 not 401 (don't log user out)
      if (isNetworkError(err)) {
        console.error(`[Auth] Network error after ${MAX_AUTH_RETRIES + 1} attempts:`, err.message);
        return res.status(503).json({ error: { message: 'Service temporarily unavailable. Please retry.' } });
      }
      return res.status(401).json({ error: { message: 'Authentication failed' } });
    }
  }
}

module.exports = { requireAuth };
