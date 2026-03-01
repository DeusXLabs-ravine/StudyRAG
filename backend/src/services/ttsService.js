const { geminiApiKeys, geminiApiKey } = require('../config/env');

const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
];
const DEFAULT_VOICE = 'Kore';
const MAX_TEXT_LENGTH = 8000;
const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore', description: 'Warm, clear female voice' },
  { id: 'Puck', name: 'Puck', description: 'Friendly, upbeat male voice' },
  { id: 'Charon', name: 'Charon', description: 'Deep, calm male voice' },
  { id: 'Aoede', name: 'Aoede', description: 'Bright, expressive female voice' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong, confident male voice' },
  { id: 'Leda', name: 'Leda', description: 'Gentle, soothing female voice' },
];

// Track which TTS model works (same pattern as image gen)
let _workingTTSModel = null;
let _failedTTSModels = new Set();

function getApiKey() {
  // Round-robin through available keys
  const keys = geminiApiKeys?.length ? geminiApiKeys : (geminiApiKey ? [geminiApiKey] : []);
  if (keys.length === 0) throw new Error('Gemini API key not configured');
  return keys[Math.floor(Math.random() * keys.length)];
}

function getTTSModel() {
  if (_workingTTSModel) return _workingTTSModel;
  const candidates = TTS_MODELS.filter(m => !_failedTTSModels.has(m));
  return candidates[0] || TTS_MODELS[0];
}

/**
 * Build a WAV header for raw PCM data.
 * Gemini TTS returns 24kHz, 16-bit mono PCM.
 */
function buildWavHeader(pcmLength) {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmLength, 40);
  return buffer;
}

/**
 * Non-streaming TTS — returns a complete WAV buffer.
 * Used as fallback when streaming isn't supported.
 */
async function synthesizeSpeech(text, voiceName = DEFAULT_VOICE) {
  const apiKey = getApiKey();
  const model = getTTSModel();
  const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: truncated }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    // Try fallback model
    if (response.status === 429 || response.status === 503) {
      _failedTTSModels.add(model);
      console.warn(`[TTS] Model ${model} failed (${response.status}), will try fallback next time`);
    }
    throw new Error(`Gemini TTS error (${response.status}): ${errorText}`);
  }

  _workingTTSModel = model;
  const json = await response.json();
  const audioData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error('No audio data in Gemini TTS response');

  const pcmBuffer = Buffer.from(audioData, 'base64');
  return Buffer.concat([buildWavHeader(pcmBuffer.length), pcmBuffer]);
}

/**
 * Streaming TTS — pipes PCM audio chunks to a writable stream as they arrive.
 * Uses Gemini's streamGenerateContent endpoint for real-time audio.
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice ID
 * @param {import('stream').Writable | import('http').ServerResponse} output - Where to write audio
 * @returns {Promise<void>}
 */
async function synthesizeSpeechStream(text, voiceName = DEFAULT_VOICE, output) {
  const apiKey = getApiKey();
  const model = getTTSModel();
  const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;

  // Use the streaming endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: truncated }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    if (response.status === 429 || response.status === 503) {
      _failedTTSModels.add(model);
    }
    throw new Error(`Gemini TTS stream error (${response.status}): ${errorText}`);
  }

  _workingTTSModel = model;

  // Write WAV header with max size (we don't know total length upfront).
  // 0xFFFFFFFF signals "unknown length" — browsers/players handle this fine for streaming.
  const wavHeader = buildWavHeader(0xFFFFFFFF - 36);
  output.write(wavHeader);

  // Parse the SSE stream and extract PCM audio chunks
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (lines starting with "data: ")
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const chunk = JSON.parse(jsonStr);
          const audioData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            const pcmChunk = Buffer.from(audioData, 'base64');
            totalBytes += pcmChunk.length;
            // Write PCM directly — header is already sent
            if (!output.destroyed) {
              output.write(pcmChunk);
            }
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new Error('No audio data received from streaming TTS');
  }
}

module.exports = { synthesizeSpeech, synthesizeSpeechStream, DEFAULT_VOICE, AVAILABLE_VOICES, SAMPLE_RATE };
