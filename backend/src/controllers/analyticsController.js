const analytics = require('../services/analyticsService');

async function getOverview(req, res, next) {
  try {
    const overview = await analytics.getOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

async function getTopics(req, res, next) {
  try {
    const topics = await analytics.getTopicMastery();
    res.json({ topics });
  } catch (error) {
    next(error);
  }
}

async function getQuizTrend(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const trend = await analytics.getQuizScoreTrend(limit);
    res.json({ trend });
  } catch (error) {
    next(error);
  }
}

async function getActivity(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const timeline = await analytics.getActivityTimeline(days);
    res.json({ timeline: Object.values(timeline) });
  } catch (error) {
    next(error);
  }
}

async function getWeakAreas(req, res, next) {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.6;
    const weakAreas = await analytics.getWeakTopics(threshold);
    res.json({ weakAreas });
  } catch (error) {
    next(error);
  }
}

async function getSettings(req, res, next) {
  try {
    const settings = await analytics.getUserSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    await analytics.updateUserSetting(key, value);
    res.json({ key, value });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOverview, getTopics, getQuizTrend, getActivity, getWeakAreas, getSettings, updateSettings };
