import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchSpeechAudio, fetchSpeechStream, splitTextIntoChunks, stripMarkdown } from '../services/ttsService';
import useSettingsStore from '../store/settingsStore';

const SAMPLE_RATE = 24000;
const WAV_HEADER_SIZE = 44;

export default function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);
  const audioCtxRef = useRef(null);
  const stoppedRef = useRef(false);
  // Legacy fallback refs
  const audioRef = useRef(null);
  const blobUrlsRef = useRef([]);
  const chunksRef = useRef([]);
  const chunkIndexRef = useRef(0);
  const prefetchRef = useRef(new Map());
  const getVoiceId = useSettingsStore(state => state.getVoiceId);

  const cleanupAudioCtx = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const cleanupLegacy = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
    blobUrlsRef.current = [];
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    prefetchRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (abortRef.current) abortRef.current.abort();
      cleanupAudioCtx();
      cleanupLegacy();
    };
  }, [cleanupAudioCtx, cleanupLegacy]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanupAudioCtx();
    cleanupLegacy();
    setIsPlaying(false);
    setIsLoading(false);
  }, [cleanupAudioCtx, cleanupLegacy]);

  /**
   * Convert a Uint8Array of 16-bit little-endian PCM to a Float32 AudioBuffer and schedule it.
   */
  const schedulePCM = useCallback((audioCtx, pcmData, startTime) => {
    const samples = Math.floor(pcmData.length / 2);
    if (samples === 0) return startTime;

    const audioBuffer = audioCtx.createBuffer(1, samples, SAMPLE_RATE);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const lo = pcmData[i * 2];
      const hi = pcmData[i * 2 + 1];
      const int16 = (hi << 8) | lo;
      channelData[i] = (int16 > 32767 ? int16 - 65536 : int16) / 32768;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const t = Math.max(startTime, audioCtx.currentTime);
    source.start(t);
    return t + audioBuffer.duration;
  }, []);

  /**
   * Streaming TTS — audio starts within ~200ms.
   * Reads the streaming response, decodes PCM, schedules playback progressively.
   */
  const speakStream = useCallback(async (text) => {
    const voiceId = getVoiceId();
    const cleanText = stripMarkdown(text);
    if (!cleanText) return;

    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsLoading(true);

    try {
      const response = await fetchSpeechStream(cleanText, voiceId, abortController.signal);
      if (stoppedRef.current) return;

      const reader = response.body.getReader();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      // Schedule PCM in ~0.4s chunks for smooth gapless playback
      const SCHEDULE_BYTES = Math.floor(SAMPLE_RATE * 0.4) * 2; // 0.4s of 16-bit mono
      let pendingBytes = new Uint8Array(0);
      let scheduledEnd = audioCtx.currentTime + 0.05; // Tiny initial buffer
      let bytesSkipped = 0;
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done || stoppedRef.current) break;

        let data = value;

        // Skip WAV header (first 44 bytes)
        if (bytesSkipped < WAV_HEADER_SIZE) {
          const remaining = WAV_HEADER_SIZE - bytesSkipped;
          if (data.length <= remaining) {
            bytesSkipped += data.length;
            continue;
          }
          data = data.slice(remaining);
          bytesSkipped = WAV_HEADER_SIZE;
        }

        // Accumulate
        const combined = new Uint8Array(pendingBytes.length + data.length);
        combined.set(pendingBytes);
        combined.set(data, pendingBytes.length);
        pendingBytes = combined;

        // Schedule complete chunks
        while (pendingBytes.length >= SCHEDULE_BYTES) {
          const chunk = pendingBytes.slice(0, SCHEDULE_BYTES);
          pendingBytes = pendingBytes.slice(SCHEDULE_BYTES);
          scheduledEnd = schedulePCM(audioCtx, chunk, scheduledEnd);

          if (!started) {
            started = true;
            setIsPlaying(true);
            setIsLoading(false);
          }
        }
      }

      // Schedule remaining bytes
      if (pendingBytes.length >= 2 && !stoppedRef.current) {
        const finalLen = pendingBytes.length - (pendingBytes.length % 2);
        if (finalLen > 0) {
          scheduledEnd = schedulePCM(audioCtx, pendingBytes.slice(0, finalLen), scheduledEnd);
          if (!started) {
            started = true;
            setIsPlaying(true);
            setIsLoading(false);
          }
        }
      }

      // Wait for playback to finish
      if (!stoppedRef.current && scheduledEnd > audioCtx.currentTime) {
        await new Promise(resolve => {
          const wait = (scheduledEnd - audioCtx.currentTime) * 1000 + 100;
          const timer = setTimeout(() => {
            if (!stoppedRef.current) setIsPlaying(false);
            resolve();
          }, wait);

          const check = setInterval(() => {
            if (stoppedRef.current) {
              clearTimeout(timer);
              clearInterval(check);
              resolve();
            }
          }, 200);
        });
      } else if (!stoppedRef.current) {
        setIsPlaying(false);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[TTS] Streaming failed, falling back to chunked:', err.message);
      cleanupAudioCtx();
      if (!stoppedRef.current) {
        await speakChunked(text);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [getVoiceId, cleanupAudioCtx, schedulePCM]);

  /**
   * Legacy chunked fallback — splits into chunks, plays sequentially.
   */
  const speakChunked = useCallback(async (text) => {
    const voiceId = getVoiceId();
    const chunks = splitTextIntoChunks(text);
    if (!chunks?.length) return;
    chunksRef.current = chunks;
    prefetchRef.current.clear();

    setIsLoading(true);

    if (!chunks[0]) {
      setIsLoading(false);
      return;
    }
    prefetchRef.current.set(0, fetchSpeechAudio(chunks[0], voiceId));
    if (chunks.length > 1) prefetchRef.current.set(1, fetchSpeechAudio(chunks[1], voiceId));

    const playChunk = async (index) => {
      if (stoppedRef.current || index >= chunksRef.current.length) {
        setIsPlaying(false);
        return;
      }
      chunkIndexRef.current = index;

      for (let i = index + 1; i < Math.min(index + 3, chunks.length); i++) {
        if (!prefetchRef.current.has(i)) {
          prefetchRef.current.set(i, fetchSpeechAudio(chunks[i], voiceId));
        }
      }

      try {
        const blob = await (prefetchRef.current.get(index) || fetchSpeechAudio(chunks[index], voiceId));
        if (stoppedRef.current) return;

        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.push(url);

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.addEventListener('ended', () => { if (!stoppedRef.current) playChunk(index + 1); });
        audio.addEventListener('error', () => { if (!stoppedRef.current) playChunk(index + 1); });

        await audio.play();
        setIsPlaying(true);
      } catch {
        if (!stoppedRef.current) playChunk(index + 1);
      } finally {
        setIsLoading(false);
      }
    };

    await playChunk(0);
  }, [getVoiceId]);

  const speak = useCallback(async (text) => {
    stop();
    stoppedRef.current = false;
    await speakStream(text);
  }, [stop, speakStream]);

  const toggle = useCallback((text) => {
    if (isPlaying) stop();
    else speak(text);
  }, [isPlaying, stop, speak]);

  return { isPlaying, isLoading, speak, stop, toggle };
}
