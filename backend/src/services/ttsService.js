const { geminiApiKeys, geminiApiKey } = require('../config/env');

// Only these two models support responseModalities: ['AUDIO'] TTS
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
  { id: 'Kore',     name: 'Kore',     description: 'Firm, clear voice' },
  { id: 'Puck',     name: 'Puck',     description: 'Upbeat, friendly voice' },
  { id: 'Charon',   name: 'Charon',   description: 'Informative, calm voice' },
  { id: 'Aoede',    name: 'Aoede',    description: 'Breezy, expressive voice' },
  { id: 'Fenrir',   name: 'Fenrir',   description: 'Excitable, strong voice' },
  { id: 'Leda',     name: 'Leda',     description: 'Youthful, gentle voice' },
  { id: 'Zephyr',   name: 'Zephyr',   description: 'Bright, energetic voice' },
  { id: 'Sulafat',  name: 'Sulafat',  description: 'Warm, inviting voice' },
  { id: 'Achird',   name: 'Achird',   description: 'Friendly, approachable voice' },
  { id: 'Iapetus',  name: 'Iapetus',  description: 'Clear, precise voice' },
];

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

function getAllKeys() {
  const keys = geminiApiKeys?.length ? [...geminiApiKeys] : (geminiApiKey ? [geminiApiKey] : []);
  if (!keys.length) throw new Error('No Gemini API keys configured');
  // Shuffle to spread load across keys
  return keys.sort(() => Math.random() - 0.5);
}

/**
 * Single-speaker TTS — retries all models × all keys until one succeeds.
 * Returns a complete WAV buffer.
 */
async function synthesizeSpeech(text, voiceName = DEFAULT_VOICE) {
  const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const keys = getAllKeys();
  let lastError;

  for (const model of TTS_MODELS) {
    for (const apiKey of keys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: truncated }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          lastError = new Error(`TTS ${response.status} (${model})`);
          console.warn(`[TTS] ${model} key[...${apiKey.slice(-4)}] → ${response.status}: ${errText.slice(0, 120)}`);
          continue; // try next key/model
        }

        const json = await response.json();
        const audioData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
          lastError = new Error('No audio data in response');
          console.warn(`[TTS] ${model} returned no audio data`);
          continue;
        }

        console.log(`[TTS] ✓ ${model}`);
        const pcmBuffer = Buffer.from(audioData, 'base64');
        return Buffer.concat([buildWavHeader(pcmBuffer.length), pcmBuffer]);
      } catch (err) {
        lastError = err;
        console.warn(`[TTS] ${model} fetch error: ${err.message}`);
      }
    }
  }

  throw lastError || new Error('All TTS models and keys exhausted');
}

/**
 * Multi-speaker TTS — takes a transcript and two speaker configs.
 * Used by the podcast feature.
 * Returns a complete WAV buffer.
 *
 * @param {string} transcript - Full transcript with "Name: text" lines
 * @param {string} speakerAName - Exact name as used in transcript
 * @param {string} speakerAVoice - Voice ID for speaker A
 * @param {string} speakerBName - Exact name as used in transcript
 * @param {string} speakerBVoice - Voice ID for speaker B
 */
async function synthesizeMultiSpeakerSpeech(transcript, speakerAName, speakerAVoice, speakerBName, speakerBVoice) {
  const truncated = transcript.length > MAX_TEXT_LENGTH ? transcript.slice(0, MAX_TEXT_LENGTH) : transcript;
  const keys = getAllKeys();
  let lastError;

  const speechConfig = {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        { speaker: speakerAName, voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerAVoice } } },
        { speaker: speakerBName, voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerBVoice } } },
      ],
    },
  };

  for (const model of TTS_MODELS) {
    for (const apiKey of keys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: truncated }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          lastError = new Error(`Multi-TTS ${response.status} (${model})`);
          console.warn(`[TTS Multi] ${model} → ${response.status}: ${errText.slice(0, 120)}`);
          continue;
        }

        const json = await response.json();
        const audioData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
          lastError = new Error('No audio data in multi-speaker response');
          continue;
        }

        console.log(`[TTS Multi] ✓ ${model}`);
        const pcmBuffer = Buffer.from(audioData, 'base64');
        return Buffer.concat([buildWavHeader(pcmBuffer.length), pcmBuffer]);
      } catch (err) {
        lastError = err;
        console.warn(`[TTS Multi] ${model} fetch error: ${err.message}`);
      }
    }
  }

  throw lastError || new Error('All multi-speaker TTS attempts failed');
}

/**
 * Streaming TTS — streams WAV audio to a writable output.
 * Falls back to non-streaming if streamGenerateContent isn't supported for TTS.
 */
async function synthesizeSpeechStream(text, voiceName = DEFAULT_VOICE, output) {
  // Try streaming first, fall back to buffered
  const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const keys = getAllKeys();
  let lastError;

  for (const model of TTS_MODELS) {
    for (const apiKey of keys) {
      try {
        // Attempt SSE streaming
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
          const errText = await response.text().catch(() => '');
          lastError = new Error(`TTS Stream ${response.status} (${model})`);
          console.warn(`[TTS Stream] ${model} → ${response.status}: ${errText.slice(0, 120)}`);
          continue;
        }

        // Write WAV header with max/unknown length
        const wavHeader = buildWavHeader(0xFFFFFFFF - 36);
        output.write(wavHeader);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let totalBytes = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
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
                  if (!output.destroyed) output.write(pcmChunk);
                }
              } catch { /* skip malformed */ }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (totalBytes > 0) {
          console.log(`[TTS Stream] ✓ ${model} — ${totalBytes} bytes`);
          return;
        }

        // If streaming gave 0 bytes, fall back to buffered for this model/key
        lastError = new Error('Streaming returned 0 bytes — trying buffered');
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[TTS Stream] ${model} error: ${err.message}`);
      }
    }

    // Streaming failed for this model — try buffered as fallback
    try {
      console.log(`[TTS Stream] Falling back to buffered for ${model}`);
      const wavBuffer = await synthesizeSpeech(text, voiceName);
      if (!output.destroyed) output.write(wavBuffer);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All TTS stream attempts failed');
}

module.exports = {
  synthesizeSpeech,
  synthesizeSpeechStream,
  synthesizeMultiSpeakerSpeech,
  DEFAULT_VOICE,
  AVAILABLE_VOICES,
  SAMPLE_RATE,
};
