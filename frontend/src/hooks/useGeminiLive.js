import { useRef, useState, useCallback } from 'react';
import { GeminiLiveSession, buildTeachingInstruction } from '../services/geminiLiveService';
import useAuthStore from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch a short-lived ephemeral token from the backend.
 * The backend generates it using the real API key — never exposed client-side.
 */
async function fetchLiveToken(authToken) {
  const res = await fetch(`${API_BASE}/gemini/live-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `Token fetch failed (${res.status})`);
  }

  const data = await res.json();
  return data.token;
}

/**
 * useGeminiLive
 * React hook for managing a Gemini Live real-time audio teaching session.
 *
 * The Live API handles real-time audio I/O and turn detection.
 * When the Live model fires tool calls, they're routed to the backend hybrid
 * executor (/api/gemini/execute-tool) where a standard generative model handles:
 *   • Structured Mermaid code (schema-constrained JSON output)
 *   • Real-time web search (Google Search grounding)
 *   • Image generation (Cloudinary pipeline)
 *   • Structured quiz questions
 * The real results are sent back to the Live session so Sage speaks about them.
 *
 * @param {object} opts
 * @param {string}   opts.moduleTitle
 * @param {string}   opts.moduleTopic
 * @param {string}   opts.content        - lesson content (first 12k chars used)
 * @param {string}   opts.teachingLevel  - dummy | beginner | intermediate | advanced
 * @param {string}   opts.userName
 * @param {string}   opts.moduleId       - passed to hybrid executor for image gen
 * @param {string}   opts.documentId     - passed to hybrid executor for image gen
 * @param {Function} opts.onToolCall     - called optimistically when tool fires (loading state)
 * @param {Function} opts.onToolResult   - called with real result after hybrid execution
 */
export default function useGeminiLive({
  moduleTitle,
  moduleTopic,
  content,
  teachingLevel,
  userName,
  moduleId,
  documentId,
  onToolCall,
  onToolResult,
} = {}) {
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
      moduleTitle:    contextOverride.moduleTitle    ?? moduleTitle,
      moduleTopic:    contextOverride.moduleTopic    ?? moduleTopic,
      content:        contextOverride.content        ?? content,
      teachingLevel:  contextOverride.teachingLevel  ?? teachingLevel,
      userName:       contextOverride.userName       ?? userName,
      moduleId:       contextOverride.moduleId       ?? moduleId,
      documentId:     contextOverride.documentId     ?? documentId,
    };

    // Resolve the JWT once — passed to GeminiLiveSession for hybrid tool calls
    const authToken = useAuthStore.getState().getAccessToken() || '';

    // Build system instruction locally (used in the WS setup message)
    const systemInstruction = buildTeachingInstruction(resolvedContext);

    let liveToken;
    try {
      liveToken = await fetchLiveToken(authToken);
    } catch (err) {
      console.error('[useGeminiLive] Token fetch failed:', err);
      setError(err.message || 'Could not get session token.');
      setState('error');
      return;
    }

    const session = new GeminiLiveSession({
      token: liveToken,
      authToken,                          // JWT for /api/gemini/execute-tool
      systemInstruction,
      toolContext: {                       // forwarded to backend hybrid executor
        moduleTitle:  resolvedContext.moduleTitle,
        moduleTopic:  resolvedContext.moduleTopic,
        moduleId:     resolvedContext.moduleId,
        documentId:   resolvedContext.documentId,
      },
      onTranscript:    (text) => setTranscript(prev => prev + text),
      onUserTranscript:(text) => setUserTranscript(prev => (prev ? prev + ' ' + text : text)),
      onStateChange:   (newState) => setState(newState),
      onError: (msg) => {
        setError(msg);
        setState('error');
      },
      onToolCall:   (call)         => onToolCall?.(call),
      onToolResult: (toolResult)   => onToolResult?.(toolResult),
    });

    sessionRef.current = session;

    try {
      await session.start();
    } catch {
      // errors already surfaced via onError
    }
  }, [moduleTitle, moduleTopic, content, teachingLevel, userName, moduleId, documentId, onToolCall, onToolResult]);

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
    isActive:     state !== 'idle' && state !== 'ended' && state !== 'error',
    isConnecting: state === 'connecting',
    isSpeaking:   state === 'teaching',
    isListening:  state === 'listening',
    transcript,
    userTranscript,
    error,
    start,
    stop,
    sendTextInterruption,
  };
}
