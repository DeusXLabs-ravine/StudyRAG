import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, GraduationCap, Volume2, VolumeX, AlertCircle, Send, Loader2 } from 'lucide-react';
import useGeminiLive from '../../hooks/useGeminiLive';

// ── Waveform visualizer ────────────────────────────────────────────────────

function AudioWave({ active, color = '#6366f1' }) {
  const bars = 28;
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 56 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          style={{ width: 3, borderRadius: 4, background: color }}
          animate={active ? {
            height: [6, Math.random() * 38 + 8, 6],
            opacity: [0.5, 1, 0.5],
          } : { height: 4, opacity: 0.25 }}
          transition={active ? {
            duration: 0.6 + (i % 5) * 0.1,
            repeat: Infinity,
            repeatType: 'mirror',
            delay: (i % 7) * 0.05,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ── Mic pulse indicator ────────────────────────────────────────────────────

function MicPulse({ active }) {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      {active && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-400/20"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-400/15"
            animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
          />
        </>
      )}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
        active
          ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40'
          : 'bg-white/10 border border-white/20'
      }`}>
        {active ? (
          <Mic className="h-6 w-6 text-white" />
        ) : (
          <MicOff className="h-6 w-6 text-white/40" />
        )}
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connecting: { label: 'Connecting...', color: 'text-amber-300', dot: 'bg-amber-400' },
  ready:      { label: 'Starting...',   color: 'text-blue-300',  dot: 'bg-blue-400' },
  teaching:   { label: 'Sage is speaking', color: 'text-indigo-300', dot: 'bg-indigo-400' },
  listening:  { label: 'Listening for you', color: 'text-emerald-300', dot: 'bg-emerald-400' },
  thinking:   { label: 'Thinking...', color: 'text-purple-300', dot: 'bg-purple-400' },
  error:      { label: 'Connection issue', color: 'text-red-300', dot: 'bg-red-400' },
};

function StatusBadge({ state }) {
  const cfg = STATUS_CONFIG[state] || STATUS_CONFIG.connecting;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
      <span className={`text-xs font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

// ── Transcript display ─────────────────────────────────────────────────────

function TranscriptDisplay({ transcript, isSpeaking }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (!transcript) return null;

  return (
    <div className="max-h-48 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <p className="text-white/80 text-sm leading-relaxed font-medium whitespace-pre-wrap">
        {transcript}
        {isSpeaking && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block w-[2px] h-4 bg-indigo-400 ml-1 align-middle rounded"
          />
        )}
      </p>
      <div ref={bottomRef} />
    </div>
  );
}

// ── Main GeminiLiveTeacher component ──────────────────────────────────────

/**
 * GeminiLiveTeacher
 * Full-screen teaching overlay powered by Gemini Live API.
 *
 * Props:
 * - isOpen         boolean
 * - onClose        () => void
 * - moduleTitle    string
 * - moduleTopic    string
 * - content        string  (module text content)
 * - teachingLevel  string
 * - userName       string
 * - contextLabel   string  (e.g. "Module 3: Photosynthesis")
 */
export default function GeminiLiveTeacher({
  isOpen,
  onClose,
  moduleTitle = '',
  moduleTopic = '',
  content = '',
  teachingLevel = 'intermediate',
  userName = '',
  contextLabel = '',
}) {
  const [interruptInput, setInterruptInput] = useState('');
  const [showInterrupt, setShowInterrupt] = useState(false);
  const inputRef = useRef(null);

  const {
    state,
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    transcript,
    error,
    start,
    stop,
    sendTextInterruption,
  } = useGeminiLive({ moduleTitle, moduleTopic, content, teachingLevel, userName });

  // Auto-start when opened
  useEffect(() => {
    if (isOpen && state === 'idle') {
      start();
    }
    // Cleanup on close
    if (!isOpen && isActive) {
      stop();
    }
  }, [isOpen]);

  // Focus interrupt input when shown
  useEffect(() => {
    if (showInterrupt) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showInterrupt]);

  const handleClose = () => {
    stop();
    onClose();
  };

  const handleSendInterrupt = () => {
    const text = interruptInput.trim();
    if (!text) return;
    sendTextInterruption(text);
    setInterruptInput('');
    setShowInterrupt(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(5, 7, 20, 0.85)' }}
        >
          {/* Ambient background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
              }}
            />
          </div>

          {/* Main card */}
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className="relative w-full max-w-lg rounded-[2.5rem] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15,10,40,0.98) 0%, rgba(20,15,60,0.98) 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-8 pt-8 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-black text-base leading-none">Sage Live</h2>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">AI Teaching Session</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-white/50" />
              </button>
            </div>

            {/* Context label */}
            {(contextLabel || moduleTitle) && (
              <div className="px-8 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <span className="text-indigo-300 text-[11px] font-bold truncate max-w-[280px]">
                    {contextLabel || moduleTitle}
                  </span>
                </div>
              </div>
            )}

            {/* Central visualizer */}
            <div className="flex flex-col items-center justify-center px-8 py-8 gap-6">
              {/* Waveform */}
              <div className="w-full">
                <AudioWave active={isSpeaking} color={isSpeaking ? '#6366f1' : '#374151'} />
              </div>

              {/* Status */}
              <StatusBadge state={state} />

              {/* Mic pulse */}
              <MicPulse active={isListening} />

              {/* Hint text */}
              <p className="text-white/30 text-xs text-center font-medium max-w-xs leading-relaxed">
                {isConnecting
                  ? 'Establishing secure audio connection...'
                  : isSpeaking
                    ? 'Sage is explaining — speak anytime to interrupt'
                    : isListening
                      ? 'Your mic is live — ask a question or say "continue"'
                      : 'Getting ready...'}
              </p>
            </div>

            {/* Transcript */}
            <div className="px-8 pb-2">
              <TranscriptDisplay transcript={transcript} isSpeaking={isSpeaking} />
            </div>

            {/* Error state */}
            {state === 'error' && error && (
              <div className="mx-8 mb-4 p-3 rounded-2xl flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Bottom actions */}
            <div className="px-8 pb-8 space-y-3">
              {/* Text interrupt input */}
              <AnimatePresence>
                {showInterrupt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-2 rounded-2xl mb-3"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        ref={inputRef}
                        value={interruptInput}
                        onChange={e => setInterruptInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendInterrupt()}
                        placeholder="Type a question or interruption..."
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none px-2 py-1 font-medium"
                      />
                      <button
                        onClick={handleSendInterrupt}
                        disabled={!interruptInput.trim()}
                        className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        <Send className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons row */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInterrupt(v => !v)}
                  disabled={!isActive || isConnecting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{
                    background: showInterrupt ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                    border: showInterrupt ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: showInterrupt ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {isConnecting ? 'Connecting...' : (showInterrupt ? 'Hide Input' : 'Type a Question')}
                </button>

                <button
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: 'rgba(252,165,165,0.8)',
                  }}
                >
                  <X className="h-4 w-4" />
                  End Session
                </button>
              </div>

              {/* Mic tip */}
              <p className="text-center text-white/20 text-[10px] font-medium">
                🎙 Speak anytime — Sage will hear you automatically
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
