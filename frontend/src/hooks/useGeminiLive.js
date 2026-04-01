import { useRef, useState, useCallback } from 'react';
import { GeminiLiveSession, buildTeachingInstruction } from '../services/geminiLiveService';
import useAuthStore from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch a short-lived ephemeral token from the backend.
 * The backend generates it using the real API key — never exposed client-side.
 */
async function fetchLiveToken(systemInstruction) {
  const token = useAuthStore.getState().getAccessToken();
  const res = await fetch(`${API_BASE}/gemini/live-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ systemInstruction }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `Token fetch failed (${res.status})`);
  }

  const data = await res.json();
  return data.token; // the ephemeral token value
}

/**
 * useGeminiLive
 * React hook for managing a Gemini Live real-time audio teaching session.
 */
export default function useGeminiLive({ moduleTitle, moduleTopic, content, teachingLevel, userName, onToolCall } = {}) {
  const sessionRef = useRef(null);
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [error, setError] = useState(null);

  const start = useCallback(async (contextOverride = {}) => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }

    setTranscript('');
    setUserTranscript('');
    setError(null);
    setState('connecting');

    const resolvedContext = {
      moduleTitle: contextOverride.moduleTitle ?? moduleTitle,
      moduleTopic: contextOverride.moduleTopic ?? moduleTopic,
      content: contextOverride.content ?? content,
      teachingLevel: contextOverride.teachingLevel ?? teachingLevel,
      userName: contextOverride.userName ?? userName,
    };

    const systemInstruction = buildTeachingInstruction(resolvedContext);

    let token;
    try {
      token = await fetchLiveToken(systemInstruction);
    } catch (err) {
      console.error('[useGeminiLive] Token fetch failed:', err);
      setError(err.message || 'Could not get session token.');
      setState('error');
      return;
    }

    const session = new GeminiLiveSession({
      token,
      systemInstruction,
      onTranscript: (text) => setTranscript(prev => prev + text),
      onUserTranscript: (text) => setUserTranscript(prev => (prev ? prev + ' ' + text : text)),
      onStateChange: (newState) => setState(newState),
      onError: (msg) => {
        setError(msg);
        setState('error');
      },
      onToolCall: (call) => onToolCall?.(call),
    });

    sessionRef.current = session;

    try {
      await session.start();
    } catch {
      // errors already surfaced via onError
    }
  }, [moduleTitle, moduleTopic, content, teachingLevel, userName, onToolCall]);

  const stop = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setState('idle');
  }, []);

  const sendTextInterruption = useCallback((text) => {
    sessionRef.current?.sendTextTurn(text);
  }, []);

  return {
    state,
    isActive: state !== 'idle' && state !== 'ended' && state !== 'error',
    isConnecting: state === 'connecting',
    isSpeaking: state === 'teaching',
    isListening: state === 'listening',
    transcript,
    userTranscript,
    error,
    start,
    stop,
    sendTextInterruption,
  };
}
