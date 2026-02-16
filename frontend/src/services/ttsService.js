import api from './api';

// In-memory audio cache: "voiceId:textHash" → Blob
const audioCache = new Map();
const MAX_CACHE_ENTRIES = 50;

function cacheKey(text, voiceId) {
  // Simple hash: use first 100 chars + length for uniqueness without crypto overhead
  return `${voiceId}:${text.length}:${text.slice(0, 100)}`;
}

/**
 * Fetch speech audio with caching.
 * Returns an audio Blob (WAV).
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

  // Evict oldest entries if cache is full
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = audioCache.keys().next().value;
    audioCache.delete(firstKey);
  }
  audioCache.set(key, data);

  return data;
}

/**
 * Strip Markdown syntax so TTS reads clean prose.
 */
function stripMarkdown(text) {
  return text
    // Remove code blocks (``` ... ```)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code (`...`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Convert links [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headings markers (# ## ### etc) but keep the text
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    // Convert bullet/numbered list markers to natural pauses
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove blockquotes marker
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse multiple newlines into double
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split text into chunks suitable for TTS.
 * First strips Markdown, then splits on paragraph/sentence boundaries.
 */
export function splitTextIntoChunks(rawText, maxChunkLength = 800) {
  const text = stripMarkdown(rawText);

  // Split on any blank line (paragraph break)
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  // If no paragraph breaks, split on single newlines
  const blocks = paragraphs.length > 1
    ? paragraphs
    : text.split(/\n/).map(l => l.trim()).filter(Boolean);

  const chunks = [];
  let current = '';

  for (const block of blocks) {
    // If adding this block stays under the limit, accumulate
    if (current.length + block.length + 1 <= maxChunkLength) {
      current += (current ? ' ' : '') + block;
    } else {
      // Flush current if it has content
      if (current) {
        chunks.push(current);
        current = '';
      }

      // If the block itself is small enough, start a new accumulation
      if (block.length <= maxChunkLength) {
        current = block;
      } else {
        // Split oversized block on sentence boundaries
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
          // Capture any remaining text after the last sentence match
          const matched = sentences.join('');
          const remainder = block.slice(matched.length).trim();
          if (remainder) {
            sentenceGroup += ' ' + remainder;
          }
          if (sentenceGroup.trim()) {
            current = sentenceGroup.trim();
          }
        } else {
          // No sentence boundaries found — just use the whole block
          chunks.push(block);
        }
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Filter out empty chunks
  return chunks.filter(c => c.length > 0);
}

/**
 * Prefetch all TTS audio chunks for a given text in the background.
 * Fetches sequentially with low priority to avoid overwhelming the backend.
 * Returns a cleanup function to abort remaining fetches.
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
