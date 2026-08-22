const { synthesizeSpeech, synthesizeSpeechStream, AVAILABLE_VOICES } = require('../services/ttsService');
const ttsCache = require('../services/ttsCache');

// Cached audio is immutable — the key is a hash of the text and voice.
const IMMUTABLE = 'private, max-age=31536000, immutable';

/**
 * Serve previously synthesized audio, before any quota is charged.
 *
 * Mounted ahead of enforceUsageCap deliberately: replaying audio that already
 * exists is not a new synthesis and must not consume the student's monthly TTS
 * allowance. On a miss this falls through to the metered synthesis path and
 * leaves the computed key on the request so the result can be stored.
 */
async function ttsCacheGuard(req, res, next) {
  try {
    const { text, voiceId } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) return next();

    const key = ttsCache.buildKey(text.trim(), voiceId);
    const etag = ttsCache.etagFor(key);
    req.ttsCacheKey = key;

    // Cheapest possible hit: the browser already holds this audio.
    if (req.headers['if-none-match'] === etag) {
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', IMMUTABLE);
      return res.status(304).end();
    }

    const cached = await ttsCache.lookup(key);
    if (!cached) return next();

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', cached.length);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', IMMUTABLE);
    res.setHeader('X-TTS-Cache', 'hit');
    return res.send(cached);
  } catch (err) {
    // A cache failure must never block playback — fall through and synthesize.
    console.warn(`[TTS] cache guard failed: ${err.message}`);
    return next();
  }
}

async function speak(req, res, next) {
  try {
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required and must be a non-empty string' });
    }

    const wavBuffer = await synthesizeSpeech(text.trim(), voiceId);

    const key = req.ttsCacheKey || ttsCache.buildKey(text.trim(), voiceId);
    ttsCache.store(key, wavBuffer); // fire-and-forget

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.setHeader('ETag', ttsCache.etagFor(key));
    res.setHeader('Cache-Control', IMMUTABLE);
    res.setHeader('X-TTS-Cache', 'miss');
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
    res.setHeader('X-TTS-Cache', 'miss');

    // Tee the stream: the student still gets audio chunk-by-chunk, while we
    // accumulate the same bytes so this synthesis can be cached and never paid
    // for twice. Only .write() and .destroyed are used by the synthesizer.
    const key = req.ttsCacheKey || ttsCache.buildKey(text.trim(), voiceId);
    const chunks = [];
    const sink = {
      write(chunk) {
        chunks.push(Buffer.from(chunk));
        return res.write(chunk);
      },
      get destroyed() {
        return res.destroyed;
      },
    };

    await synthesizeSpeechStream(text.trim(), voiceId, sink);
    res.end();

    if (!res.destroyed && chunks.length) {
      ttsCache.store(key, Buffer.concat(chunks)); // fire-and-forget
    }
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

module.exports = { speak, streamSpeak, listVoices, ttsCacheGuard };
