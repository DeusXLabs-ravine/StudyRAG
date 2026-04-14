const express = require('express');
const { speak, streamSpeak, listVoices } = require('../controllers/ttsController');
const { enforceUsageCap } = require('../middleware/tierAuth');

const router = express.Router();

router.get('/voices', listVoices);
router.post('/speak', enforceUsageCap('tts'), speak);          // Legacy: returns full WAV (for caching)
router.post('/speak/stream', enforceUsageCap('tts'), streamSpeak); // Streaming: audio starts immediately

module.exports = router;
