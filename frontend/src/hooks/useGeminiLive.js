import { useRef, useState, useCallback } from 'react';
import { GeminiLiveSession, buildTeachingInstruction } from '../services/geminiLiveService';
import { resolveLiveWsUrl } from '../services/apiBase';
import useAuthStore from '../store/authStore';

/**
 * useGeminiLive
 * Manages a Gemini Live real-time audio teaching session via our backend proxy.
 * The backend handles the @google/genai SDK connection — no API keys in the browser.
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
    if (state === 'connecting') {
      console.warn('[useGeminiLive] Connection already in progress, ignoring duplicate start.');
      return;
    }

    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }

    setTranscript('');
    setUserTranscript('');
    setError(null);
    setState('connecting');

    const ctx = {
      moduleTitle:   contextOverride.moduleTitle   ?? moduleTitle,
      moduleTopic:   contextOverride.moduleTopic   ?? moduleTopic,
      content:       contextOverride.content       ?? content,
      teachingLevel: contextOverride.teachingLevel ?? teachingLevel,
      userName:      contextOverride.userName      ?? userName,
      moduleId:      contextOverride.moduleId      ?? moduleId,
      documentId:    contextOverride.documentId    ?? documentId,
    };

    const authToken = useAuthStore.getState().getAccessToken() || '';
    const wsUrl = resolveLiveWsUrl({
      envApiUrl: import.meta.env.VITE_API_URL,
    });
    const systemInstruction = buildTeachingInstruction(ctx);

    const session = new GeminiLiveSession({
      wsUrl,
      authToken,
      systemInstruction,
      toolContext: {
        moduleTitle:  ctx.moduleTitle,
        moduleTopic:  ctx.moduleTopic,
        moduleId:     ctx.moduleId,
        documentId:   ctx.documentId,
      },
      onTranscript:    (text) => setTranscript(prev => prev + text),
      onUserTranscript:(text) => setUserTranscript(prev => prev ? prev + ' ' + text : text),
      onStateChange:   (s) => setState(s),
      onError:         (msg) => { setError(msg); setState('error'); },
      onToolCall:      (call) => onToolCall?.(call),
      onToolResult:    (res)  => onToolResult?.(res),
    });

    sessionRef.current = session;
    try { await session.start(); } catch { /* surfaced via onError */ }
  }, [moduleTitle, moduleTopic, content, teachingLevel, userName, moduleId, documentId, onToolCall, onToolResult]);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
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
