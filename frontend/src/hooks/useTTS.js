import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchSpeechAudio, splitTextIntoChunks } from '../services/ttsService';
import useSettingsStore from '../store/settingsStore';

export default function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  const blobUrlsRef = useRef([]);
  const chunksRef = useRef([]);
  const chunkIndexRef = useRef(0);
  const stoppedRef = useRef(false);
  const prefetchRef = useRef(new Map()); // index → Promise<Blob>
  const getVoiceId = useSettingsStore(state => state.getVoiceId);

  const revokeAllUrls = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      revokeAllUrls();
    };
  }, [revokeAllUrls]);

  // Prefetch upcoming chunks (next 2)
  const prefetchChunks = useCallback((startIndex, voiceId) => {
    const chunks = chunksRef.current;
    for (let i = startIndex; i < Math.min(startIndex + 2, chunks.length); i++) {
      if (!prefetchRef.current.has(i)) {
        prefetchRef.current.set(i, fetchSpeechAudio(chunks[i], voiceId));
      }
    }
  }, []);

  // Play a specific chunk by index, then chain to next
  const playChunk = useCallback(async (index, voiceId) => {
    if (stoppedRef.current || index >= chunksRef.current.length) {
      setIsPlaying(false);
      return;
    }

    chunkIndexRef.current = index;

    // Prefetch upcoming chunks while this one plays
    prefetchChunks(index + 1, voiceId);

    try {
      // Use prefetched blob if available, otherwise fetch
      const blobPromise = prefetchRef.current.get(index) || fetchSpeechAudio(chunksRef.current[index], voiceId);
      const blob = await blobPromise;

      if (stoppedRef.current) return;

      const url = URL.createObjectURL(blob);
      blobUrlsRef.current.push(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        if (!stoppedRef.current) {
          playChunk(index + 1, voiceId);
        }
      });

      audio.addEventListener('error', () => {
        if (!stoppedRef.current) {
          // Try to continue with next chunk on error
          playChunk(index + 1, voiceId);
        }
      });

      await audio.play();
    } catch (err) {
      console.error(`TTS chunk ${index} error:`, err.message);
      if (!stoppedRef.current) {
        // Try next chunk
        playChunk(index + 1, voiceId);
      }
    }
  }, [prefetchChunks]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    prefetchRef.current.clear();
    revokeAllUrls();
    setIsPlaying(false);
    setIsLoading(false);
  }, [revokeAllUrls]);

  const speak = useCallback(async (text) => {
    stop();
    stoppedRef.current = false;

    const voiceId = getVoiceId();
    const chunks = splitTextIntoChunks(text);
    chunksRef.current = chunks;
    prefetchRef.current.clear();

    setIsLoading(true);

    // Start fetching first chunk, and prefetch chunk 2 in parallel
    prefetchRef.current.set(0, fetchSpeechAudio(chunks[0], voiceId));
    if (chunks.length > 1) {
      prefetchRef.current.set(1, fetchSpeechAudio(chunks[1], voiceId));
    }

    try {
      const blob = await prefetchRef.current.get(0);
      if (stoppedRef.current) return;

      const url = URL.createObjectURL(blob);
      blobUrlsRef.current.push(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        if (!stoppedRef.current) {
          playChunk(1, voiceId);
        }
      });

      audio.addEventListener('error', () => {
        setIsPlaying(false);
      });

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('TTS error:', err.message);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [stop, getVoiceId, playChunk]);

  const toggle = useCallback((text) => {
    if (isPlaying) {
      stop();
    } else {
      speak(text);
    }
  }, [isPlaying, stop, speak]);

  return { isPlaying, isLoading, speak, stop, toggle };
}
