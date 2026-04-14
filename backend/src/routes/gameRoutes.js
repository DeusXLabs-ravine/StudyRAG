const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { requireFeature } = require('../middleware/tierAuth');

router.post('/generate', requireFeature('games'), gameController.generate);
router.post('/submit', gameController.submit);
router.get('/stats', gameController.getStats);
router.get('/achievements', gameController.getAchievements);

module.exports = router;
