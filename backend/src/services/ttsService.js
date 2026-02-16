const { geminiApiKey } = require('../config/env');

const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
const DEFAULT_VOICE = 'Kore';
const MAX_TEXT_LENGTH = 5000;

// Available Gemini TTS voices for students to choose from
const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore', description: 'Warm, clear female voice' },
  { id: 'Puck', name: 'Puck', description: 'Friendly, upbeat male voice' },
  { id: 'Charon', name: 'Charon', description: 'Deep, calm male voice' },
  { id: 'Aoede', name: 'Aoede', description: 'Bright, expressive female voice' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong, confident male voice' },
  { id: 'Leda', name: 'Leda', description: 'Gentle, soothing female voice' },
];

/**
 * Build a WAV header for raw PCM data.
 * Gemini TTS returns 24kHz, 16-bit mono PCM.
 */
function buildWavHeader(pcmLength) {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmLength;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // fmt chunk size
  buffer.writeUInt16LE(1, 20);        // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

/**
 * Generate speech audio from Gemini TTS API.
 * Returns a Buffer containing a complete WAV file.
 */
async function synthesizeSpeech(text, voiceName = DEFAULT_VOICE) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const truncated = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH)
    : text;

  const response = await fetch(
    `${GEMINI_TTS_URL}?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: truncated }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini TTS error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const audioData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) {
    throw new Error('No audio data in Gemini TTS response');
  }

  // Decode base64 PCM and wrap in WAV
  const pcmBuffer = Buffer.from(audioData, 'base64');
  const wavHeader = buildWavHeader(pcmBuffer.length);
  return Buffer.concat([wavHeader, pcmBuffer]);
}

module.exports = { synthesizeSpeech, DEFAULT_VOICE, AVAILABLE_VOICES };
