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

router.get('/overview', getOverview);
router.get('/topics', getTopics);
router.get('/quiz-trend', getQuizTrend);
router.get('/activity', getActivity);
router.get('/weak-areas', getWeakAreas);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
