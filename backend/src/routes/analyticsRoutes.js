const express = require('express');
const router = express.Router();
const {
  getOverview,
  getTopics,
  getQuizTrend,
  getActivity,
  getWeakAreas,
  getSettings,
  updateSettings,
} = require('../controllers/analyticsController');

const {
  recordLearningInteraction,
  getEffectiveLearningStyle,
  getEffectiveLearningPace,
  getUserLearningStyle,
  getUserLearningPace,
  detectLearningStyle,
  detectLearningPace,
} = require('../services/userProfileService');

router.get('/overview', getOverview);
router.get('/topics', getTopics);
router.get('/quiz-trend', getQuizTrend);
router.get('/activity', getActivity);
router.get('/weak-areas', getWeakAreas);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ─── Learning Style & Pace Endpoints ──────────────────────

// Record a learning interaction signal (for auto-detection)
router.post('/learning-interaction', async (req, res, next) => {
  try {
    const { contentType, engagement } = req.body;
    if (!contentType) {
      return res.status(400).json({ error: 'contentType is required' });
    }
    await recordLearningInteraction(contentType, engagement || 'view', req.user?.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Get the user's adaptive learning profile (style + pace, resolved)
router.get('/learning-profile', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const [effectiveStyle, effectivePace, preferredStyle, preferredPace, detectedStyle, detectedPace] = await Promise.all([
      getEffectiveLearningStyle(userId),
      getEffectiveLearningPace(userId),
      getUserLearningStyle(userId),
      getUserLearningPace(userId),
      detectLearningStyle(userId),
      detectLearningPace(userId),
    ]);

    res.json({
      learningStyle: effectiveStyle,
      learningPace: effectivePace,
      preferences: {
        style: preferredStyle,
        pace: preferredPace,
      },
      detected: {
        style: detectedStyle,
        pace: detectedPace,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
