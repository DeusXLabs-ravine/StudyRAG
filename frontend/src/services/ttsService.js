import api from './api';
import useAuthStore from '../store/authStore';

// In-memory audio cache: "voiceId:textHash" → Blob
const audioCache = new Map();
const MAX_CACHE_ENTRIES = 50;

function cacheKey(text, voiceId) {
  return `${voiceId}:${text.length}:${text.slice(0, 100)}`;
}

/**
 * Fetch speech audio with caching (non-streaming, full WAV).
 * Used for short texts and replaying cached audio.
 */
export async function fetchSpeechAudio(text, voiceId) {
  const key = cacheKey(text, voiceId);

  if (audioCache.has(key)) {
    return audioCache.get(key);
  }

  const { data } = await api.post('/tts/speak', { text, voiceId }, {
    responseType: 'blob',
    timeout: 120000,
  });

  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = audioCache.keys().next().value;
    audioCache.delete(firstKey);
  }
  audioCache.set(key, data);

  return data;
}

/**
 * Stream TTS audio — returns an object with controls for progressive playback.
 * Audio starts playing within ~200ms instead of waiting for full generation.
 *
 * @param {string} text - Full text to speak
 * @param {string} voiceId - Voice ID
 * @param {AbortSignal} signal - AbortController signal to cancel
 * @returns {{ response: Response }}
 */
export async function fetchSpeechStream(text, voiceId, signal) {
  const token = useAuthStore.getState().getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/tts/speak/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, voiceId }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS stream failed (${response.status})`);
  }

  return response;
}

/**
 * Strip Markdown syntax so TTS reads clean prose.
 */
export function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split text into chunks suitable for TTS.
 * Used by the legacy (non-streaming) path as fallback.
 */
export function splitTextIntoChunks(rawText, maxChunkLength = 800) {
  const text = stripMarkdown(rawText);
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const blocks = paragraphs.length > 1
    ? paragraphs
    : text.split(/\n/).map(l => l.trim()).filter(Boolean);

  const chunks = [];
  let current = '';

  for (const block of blocks) {
    if (current.length + block.length + 1 <= maxChunkLength) {
      current += (current ? ' ' : '') + block;
    } else {
      if (current) {
        chunks.push(current);
        current = '';
      }

      if (block.length <= maxChunkLength) {
        current = block;
      } else {
        const sentencePattern = /[^.!?]*[.!?]+[\s)"]*/g;
        const sentences = block.match(sentencePattern);

        if (sentences) {
          let sentenceGroup = '';
          for (const s of sentences) {
            if (sentenceGroup.length + s.length > maxChunkLength && sentenceGroup) {
              chunks.push(sentenceGroup.trim());
              sentenceGroup = '';
            }
            sentenceGroup += s;
          }
          const matched = sentences.join('');
          const remainder = block.slice(matched.length).trim();
          if (remainder) sentenceGroup += ' ' + remainder;
          if (sentenceGroup.trim()) current = sentenceGroup.trim();
        } else {
          chunks.push(block);
        }
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

/**
 * Prefetch all TTS audio chunks in the background (legacy path).
 */
export function prefetchAllChunks(rawText, voiceId) {
  const chunks = splitTextIntoChunks(rawText);
  let cancelled = false;

  (async () => {
    for (const chunk of chunks) {
      if (cancelled) break;
      try {
        await fetchSpeechAudio(chunk, voiceId);
      } catch {
        // Silently ignore prefetch errors
      }
    }
  })();

  return () => { cancelled = true; };
}

/**
 * Fetch available TTS voices.
 */
export async function fetchVoices() {
  const { data } = await api.get('/tts/voices');
  return data.voices;
}
