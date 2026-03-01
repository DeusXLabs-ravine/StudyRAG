const { synthesizeSpeech, synthesizeSpeechStream, AVAILABLE_VOICES } = require('../services/ttsService');

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

/**
 * Streaming TTS endpoint — audio starts playing within ~200ms.
 * Streams PCM audio wrapped in a WAV container as chunks arrive from Gemini.
 */
async function streamSpeak(req, res, next) {
  try {
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required and must be a non-empty string' });
    }

    // Set headers for streaming audio
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await synthesizeSpeechStream(text.trim(), voiceId, res);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      // Headers already sent (mid-stream failure) — just end the response
      console.error('[TTS Stream] Error mid-stream:', error.message);
      res.end();
    }
  }
}

function listVoices(req, res) {
  res.json({ voices: AVAILABLE_VOICES });
}

module.exports = { speak, streamSpeak, listVoices };
