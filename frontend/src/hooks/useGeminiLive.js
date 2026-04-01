import { useRef, useState, useCallback } from 'react';
import { GeminiLiveSession, buildTeachingInstruction } from '../services/geminiLiveService';

const GEMINI_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
  import.meta.env.VITE_GEMINI_API_KEY_5,
  import.meta.env.VITE_GEMINI_API_KEY_6,
  import.meta.env.VITE_GEMINI_API_KEY_7,
  import.meta.env.VITE_GEMINI_API_KEY_8,
].filter(Boolean);

let _keyIndex = 0;
function getNextApiKey() {
  if (GEMINI_KEYS.length === 0) return '';
  const key = GEMINI_KEYS[_keyIndex % GEMINI_KEYS.length];
  _keyIndex = (_keyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

/**
 * useGeminiLive
 * React hook for managing a Gemini Live teaching session with multimodal tools.
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
    }

    setTranscript('');
    setUserTranscript('');
    setError(null);
    setState('connecting');

    const systemInstruction = buildTeachingInstruction({
      moduleTitle: contextOverride.moduleTitle || moduleTitle,
      moduleTopic: contextOverride.moduleTopic || moduleTopic,
      content: contextOverride.content || content,
      teachingLevel: contextOverride.teachingLevel || teachingLevel,
      userName: contextOverride.userName || userName,
    });

    const session = new GeminiLiveSession({
      apiKey: getNextApiKey(),
      systemInstruction,
      onTranscript: (text) => {
        setTranscript(prev => prev + text);
      },
      onUserTranscript: (text) => {
        setUserTranscript(prev => prev + ' ' + text);
      },
      onStateChange: (newState) => {
        setState(newState);
      },
      onError: (msg) => {
        setError(msg);
        setState('error');
      },
      onToolCall: (call) => {
        onToolCall?.(call);
      }
    });

    sessionRef.current = session;

    try {
      await session.start();
    } catch (err) {}
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

  const isActive = state !== 'idle' && state !== 'ended' && state !== 'error';
  const isConnecting = state === 'connecting';
  const isSpeaking = state === 'teaching';
  const isListening = state === 'listening';

  return {
    state,
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    transcript,
    userTranscript,
    error,
    start,
    stop,
    sendTextInterruption,
  };
}
