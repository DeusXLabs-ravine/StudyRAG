const { synthesizeSpeech, AVAILABLE_VOICES } = require('../services/ttsService');

async function speak(req, res, next) {
  try {
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required and must be a non-empty string' });
    }

    const wavBuffer = await synthesizeSpeech(text.trim(), voiceId);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.send(wavBuffer);
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
}

function listVoices(req, res) {
  res.json({ voices: AVAILABLE_VOICES });
}

module.exports = { speak, listVoices };
