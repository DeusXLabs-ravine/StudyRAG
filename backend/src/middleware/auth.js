const supabase = require('../config/database');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or invalid authorization header' } });
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Authentication failed' } });
  }
}

module.exports = { requireAuth };
