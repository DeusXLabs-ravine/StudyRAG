import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/**
 * Web Speech API hook for speech-to-text input.
 * Degrades gracefully — isSupported will be false in unsupported browsers.
 *
 * @param {Object} options
 * @param {Function} options.onTranscript - Called with transcribed text
 * @param {boolean} [options.continuous=false] - Keep listening after result
 */
export default function useVoiceInput({ onTranscript, continuous = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => !!SpeechRecognition);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript?.trim())
        .filter(Boolean)
        .join(' ');

      if (transcript) {
        onTranscript?.(transcript);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [continuous, onTranscript]);

  const stop = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, isSupported, start, stop, toggle };
}
