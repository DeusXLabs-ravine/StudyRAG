import { useRef, useState, useCallback } from 'react';
import { GeminiLiveSession, buildTeachingInstruction } from '../services/geminiLiveService';

// ── API key pool — mirrors backend rotation ────────────────────────────────
const GEMINI_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
  import.meta.env.VITE_GEMINI_API_KEY_5,
  import.meta.env.VITE_GEMINI_API_KEY_6,
  import.meta.env.VITE_GEMINI_API_KEY_7,
  import.meta.env.VITE_GEMINI_API_KEY_8,
].filter(Boolean); // drop any undefined keys

// Round-robin counter shared across all hook instances (module scope)
let _keyIndex = 0;
function getNextApiKey() {
  if (GEMINI_KEYS.length === 0) return '';
  const key = GEMINI_KEYS[_keyIndex % GEMINI_KEYS.length];
  _keyIndex = (_keyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

/**
 * useGeminiLive
 * React hook for managing a Gemini Live teaching session.
 *
 * @param {object} opts
 * @param {string} opts.moduleTitle     - Title of the current module/topic
 * @param {string} opts.moduleTopic     - Topic category
 * @param {string} opts.content         - Full text content to teach
 * @param {string} [opts.teachingLevel] - beginner | intermediate | advanced
 * @param {string} [opts.userName]      - Student name for personalization
 */
export default function useGeminiLive({ moduleTitle, moduleTopic, content, teachingLevel, userName } = {}) {
  const sessionRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | connecting | ready | teaching | listening | thinking | ended | error
  const [transcript, setTranscript] = useState(''); // cumulative Gemini speaking transcript
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
    });

    sessionRef.current = session;

    try {
      await session.start();
    } catch (err) {
      // error already handled via onError callback
    }
  }, [moduleTitle, moduleTopic, content, teachingLevel, userName]);

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
