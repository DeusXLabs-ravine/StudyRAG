const express = require('express');
const { speak, streamSpeak, listVoices, ttsCacheGuard } = require('../controllers/ttsController');
const { enforceUsageCap } = require('../middleware/tierAuth');

const router = express.Router();

// ttsCacheGuard runs BEFORE enforceUsageCap on purpose: audio that has already
// been synthesized is served straight from R2 and must not spend the student's
// monthly TTS allowance a second time. Only genuine misses reach the meter.
router.get('/voices', listVoices);
router.post('/speak', ttsCacheGuard, enforceUsageCap('tts'), speak);          // Legacy: returns full WAV (for caching)
router.post('/speak/stream', ttsCacheGuard, enforceUsageCap('tts'), streamSpeak); // Streaming: audio starts immediately

module.exports = router;
