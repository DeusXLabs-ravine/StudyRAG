const express = require('express');
const { speak, streamSpeak, listVoices } = require('../controllers/ttsController');

const router = express.Router();

router.get('/voices', listVoices);
router.post('/speak', speak);          // Legacy: returns full WAV (for caching)
router.post('/speak/stream', streamSpeak); // Streaming: audio starts immediately

module.exports = router;
