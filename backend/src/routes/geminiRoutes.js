const express = require('express');
const router = express.Router();
const { geminiApiKey, geminiApiKeys } = require('../config/env');

const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';
const EPHEMERAL_TOKEN_URL = `https://generativelanguage.googleapis.com/v1beta/${LIVE_MODEL}:generateEphemeralToken`;

/**
 * POST /api/gemini/live-token
 * Generates a short-lived ephemeral token for client-side Gemini Live WebSocket connections.
 * Keeps real API keys off the browser.
 *
 * Body: { systemInstruction?: string }
 * Returns: { token: string, expireTime: string, model: string }
 */
router.post('/live-token', async (req, res) => {
  const key = geminiApiKeys[0] || geminiApiKey;
  if (!key) {
    return res.status(500).json({ error: { message: 'Gemini API key not configured on server.' } });
  }

  const { systemInstruction } = req.body;
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  try {
    const body = {
      model: LIVE_MODEL,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
      expireTime,
    };

    if (systemInstruction) {
      body.config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(EPHEMERAL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[GeminiLive] Token generation failed:', data);
      return res.status(response.status).json({
        error: { message: data.error?.message || 'Failed to generate live session token.' },
      });
    }

    res.json({
      token: data.value,
      expireTime: data.expireTime || expireTime,
      model: LIVE_MODEL,
    });
  } catch (err) {
    console.error('[GeminiLive] Token endpoint error:', err);
    res.status(500).json({ error: { message: 'Internal error generating live token.' } });
  }
});

module.exports = router;
