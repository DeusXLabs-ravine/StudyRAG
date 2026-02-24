const { generateGame, GAME_TYPES } = require('../services/gameGeneratorService');
const { submitGameResult, getUserGameStats } = require('../services/gamificationService');
const supabase = require('../config/database');

async function generate(req, res, next) {
  try {
    const { moduleId, gameType, difficulty } = req.body;

    if (!moduleId) {
      return res.status(400).json({ error: 'moduleId is required' });
    }

    const gameData = await generateGame(moduleId, gameType || null, difficulty || 'medium');
    res.json(gameData);
  } catch (err) {
    // Return user-friendly error for AI service issues
    const msg = err?.message || '';
    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
      return res.status(503).json({ error: 'The AI service is experiencing high demand right now. Please try again in a moment!' });
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few seconds and try again.' });
    }
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { gameType, score, correct, total, combo, timeMs } = req.body;

    if (!gameType || correct === undefined || total === undefined) {
      return res.status(400).json({ error: 'gameType, correct, and total are required' });
    }

    const result = await submitGameResult(userId, {
      gameType,
      score: score || 0,
      correct: correct || 0,
      total: total || 0,
      combo: combo || 0,
      timeMs: timeMs || 0,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const stats = await getUserGameStats(userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function getAchievements(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, submit, getStats, getAchievements };
