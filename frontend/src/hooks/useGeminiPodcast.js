import { useRef, useState, useCallback } from 'react';
import { resolvePodcastHosts } from '../services/geminiLiveService';
import api from '../services/api';

// ── Module-level session cache ─────────────────────────────────────────────────
// Persists across component unmount/remount within the same page session.
// No size limit (unlike localStorage), so large WAV base64 is safe here.
// key  → episodeCacheKey (string)
// value → { audioBase64: string, transcript: string, hostAName, hostBName }
const _episodeCache = new Map();

function episodeCacheKey(moduleId, moduleTopic, moduleTitle, teachingLevel) {
  const id = moduleId != null ? String(moduleId) : (moduleTopic || moduleTitle || 'default');
  return `episode:${id}:${teachingLevel || 'intermediate'}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseTranscriptLines(transcript, hostAName, hostBName) {
  if (!transcript) return [];
  const lines = [];
  const raw = transcript.split('\n');

  for (const raw_line of raw) {
    const line = raw_line.trim();
    if (!line) continue;

    const prefixA = hostAName + ':';
    const prefixB = hostBName + ':';

    if (line.startsWith(prefixA)) {
      lines.push({ host: 'A', name: hostAName, text: line.slice(prefixA.length).trim() });
    } else if (line.startsWith(prefixB)) {
      lines.push({ host: 'B', name: hostBName, text: line.slice(prefixB.length).trim() });
    } else if (lines.length > 0) {
      lines[lines.length - 1].text += ' ' + line;
    }
  }

  return lines.filter(l => l.text.length > 0);
}

function base64ToBlob(b64, mimeType = 'audio/wav') {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export default function useGeminiPodcast({
  moduleTitle,
  moduleTopic,
  content,
  userName,
  interests = [],
  moduleId,
  documentId,
  teachingLevel = 'intermediate',
} = {}) {
  const [state, setState] = useState('idle');
  const [lines, setLines] = useState([]);
  const [activeHost, setActiveHost] = useState(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const linesRef = useRef([]);
  const hostsRef = useRef(null);

  // ── Cleanup audio element ──────────────────────────────────────────────────
  const _destroyAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // ── Wire audio element events + start playback ─────────────────────────────
  const _setupAudio = useCallback((audioBase64, transcript, hostA, hostB) => {
    const parsed = parseTranscriptLines(transcript, hostA.name, hostB.name);
    linesRef.current = parsed;
    setLines(parsed);

    const blob = base64ToBlob(audioBase64, 'audio/wav');
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    setAudioUrl(url);

    const audio = new Audio(url);
    audioRef.current = audio;

    // Character-weighted host tracking via timeupdate
    audio.addEventListener('timeupdate', () => {
      const { duration, currentTime } = audio;
      if (!duration || !linesRef.current.length) return;

      const totalChars = linesRef.current.reduce((sum, l) => sum + l.text.length, 0);
      const currentChars = (currentTime / duration) * totalChars;

      let charCount = 0;
      for (let i = 0; i < linesRef.current.length; i++) {
        charCount += linesRef.current[i].text.length;
        if (charCount >= currentChars) {
          const line = linesRef.current[i];
          setActiveHost(line.host);
          setCurrentLineIndex(i);
          break;
        }
      }
    });

    audio.addEventListener('play', () => setState('playing'));
    audio.addEventListener('pause', () => setState('paused'));
    audio.addEventListener('ended', () => {
      setState('ready');
      setActiveHost(null);
      setCurrentLineIndex(-1);
    });
    audio.addEventListener('error', () => {
      setError('Audio playback failed');
      setState('error');
    });

    return audio;
  }, []);

  // ── Start — generate (or restore from session cache) + auto-play ──────────
  const start = useCallback(async () => {
    _destroyAudio();
    linesRef.current = [];
    setLines([]);
    setActiveHost(null);
    setCurrentLineIndex(-1);
    setAudioUrl(null);
    setError(null);

    const hosts = resolvePodcastHosts(interests);
    hostsRef.current = hosts;
    const { hostA, hostB } = hosts;

    const cacheKey = episodeCacheKey(moduleId, moduleTopic, moduleTitle, teachingLevel);

    // ── Check session-memory cache first (fast, no network, no size limit) ──
    const cached = _episodeCache.get(cacheKey);
    if (cached) {
      try {
        setState('ready'); // skip the generating spinner entirely
        const audio = _setupAudio(cached.audioBase64, cached.transcript, hostA, hostB);
        await audio.play();
        return;
      } catch (err) {
        // Cache entry may be corrupt — fall through to network
        _episodeCache.delete(cacheKey);
      }
    }

    // ── Cache miss — generate from backend ────────────────────────────────
    setState('generating');

    try {
      const resp = await api.post('/podcast/generate', {
        moduleTitle,
        moduleTopic,
        content: content?.slice(0, 6000) ?? '',
        userName,
        teachingLevel,
        hostAName: hostA.name,
        hostAVoice: hostA.voice,
        hostAStyle: hostA.style,
        hostADomain: hostA.analogyDomain,
        hostBName: hostB.name,
        hostBVoice: hostB.voice,
        hostBStyle: hostB.style,
        hostBDomain: hostB.analogyDomain,
      }, { timeout: 180_000 });

      const { transcript, audioBase64 } = resp.data;

      // Store in session cache (in-memory, no size limit)
      _episodeCache.set(cacheKey, { transcript, audioBase64 });

      setState('ready');
      const audio = _setupAudio(audioBase64, transcript, hostA, hostB);
      await audio.play();

    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to generate podcast';
      setError(msg);
      setState('error');
    }
  }, [moduleTitle, moduleTopic, content, userName, interests, moduleId, teachingLevel, _destroyAudio, _setupAudio]);

  // ── Stop ──────────────────────────────────────────────────────────────────
  // NOTE: We intentionally do NOT clear the session cache on stop —
  // re-opening the player should restore instantly from memory.
  const stop = useCallback(() => {
    _destroyAudio();
    linesRef.current = [];
    hostsRef.current = null;
    setState('idle');
    setActiveHost(null);
    setCurrentLineIndex(-1);
    setLines([]);
    setAudioUrl(null);
    setError(null);
  }, [_destroyAudio]);

  // ── Toggle play/pause ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, []);

  // ── Restart ───────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  }, []);

  // ── Ask a question (visual-only in pre-recorded mode) ────────────────────
  const askQuestion = useCallback((text) => {
    if (!text?.trim()) return;
    const entry = { host: 'listener', name: userName || 'You', text: text.trim() };
    linesRef.current = [...linesRef.current, entry];
    setLines(prev => [...prev, entry]);
  }, [userName]);

  const hosts = hostsRef.current ?? resolvePodcastHosts(interests);

  return {
    state,
    isActive:     state !== 'idle' && state !== 'error',
    isConnecting: false,
    isGenerating: state === 'generating',
    isPlaying:    state === 'playing',
    isPaused:     state === 'paused',
    isReady:      state === 'ready',
    lines,
    activeHost,
    currentLineIndex,
    audioUrl,
    hosts,
    error,
    start,
    stop,
    togglePlay,
    restart,
    askQuestion,
  };
}
