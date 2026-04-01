import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, GraduationCap, Volume2, VolumeX, AlertCircle, Send, Loader2, Brain, Sparkles, MessageSquare, Zap, Search, Image as ImageIcon, BookOpen } from 'lucide-react';
import mermaid from 'mermaid';
import useGeminiLive from '../../hooks/useGeminiLive';
import { generateDiagramForTopic, getGeneratedDiagramImageUrl } from '../../services/diagramService';
import { sendQuery } from '../../services/chatService';

// Initialize mermaid
mermaid.initialize({ startOnLoad: true, theme: 'neutral' });

function DiagramDisplay({ code, title }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && code) {
      mermaid.render('mermaid-svg', code).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      });
    }
  }, [code]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xl w-full max-w-md my-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-3 w-3 text-primary fill-current" />
        <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">{title || 'Sage Whiteboard'}</h4>
      </div>
      <div ref={ref} className="overflow-auto flex justify-center" />
    </motion.div>
  );
}

function IllustrationDisplay({ prompt, url, loading }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-4 rounded-3xl border border-purple-100 shadow-xl w-full max-w-sm my-4 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3 w-3 text-purple-500 fill-current" />
        <h4 className="text-[10px] font-black uppercase text-purple-500 tracking-widest">Sage Visualization</h4>
      </div>
      
      <div className="relative aspect-video rounded-2xl bg-purple-50 flex items-center justify-center overflow-hidden border border-purple-100/50">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            <p className="text-[9px] font-bold text-purple-300 uppercase tracking-tighter">Painting concepts...</p>
          </div>
        ) : url ? (
          <img src={url} alt="Educational illustration" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-purple-200" />
        )}
      </div>
      {prompt && <p className="mt-3 text-[10px] text-gray-400 italic leading-tight px-1">"{prompt}"</p>}
    </motion.div>
  );
}

function KnowledgeCard({ query, results, loading }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xl w-full max-w-md my-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-emerald-500 fill-current" />
          <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">External Research</h4>
        </div>
        {loading && <Loader2 className="h-3 w-3 text-emerald-400 animate-spin" />}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-700 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 italic">
          <Search className="h-3 w-3 inline mr-2 opacity-40" />
          {query}
        </p>
        
        {!loading && results?.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {results.slice(0, 3).map((res, i) => (
              <a 
                key={i} 
                href={res.url} 
                target="_blank" 
                rel="noreferrer"
                className="block p-2.5 rounded-xl hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 group"
              >
                <p className="text-[11px] font-bold text-emerald-700 truncate group-hover:underline">{res.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 opacity-80">{res.snippet || res.url}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Waveform visualizer ────────────────────────────────────────────────────

function AudioWave({ active, color = '#3b82f6' }) {
  const bars = 32;
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 60 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          style={{ width: 4, borderRadius: 4, background: color }}
          animate={active ? {
            height: [8, Math.random() * 45 + 10, 8],
            opacity: [0.6, 1, 0.6],
          } : { height: 4, opacity: 0.2 }}
          transition={active ? {
            duration: 0.5 + (i % 4) * 0.1,
            repeat: Infinity,
            repeatType: 'mirror',
            delay: (i % 8) * 0.04,
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
    <div className="relative flex items-center justify-center w-16 h-16">
      {active && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10"
            animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          />
        </>
      )}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
        active
          ? 'bg-primary shadow-xl shadow-primary/30'
          : 'bg-gray-100 border border-gray-200'
      }`}>
        {active ? (
          <Mic className="h-7 w-7 text-white" />
        ) : (
          <MicOff className="h-7 w-7 text-gray-400" />
        )}
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connecting: { label: 'Connecting to Sage...', color: 'text-amber-600', dot: 'bg-amber-500', bg: 'bg-amber-50' },
  ready:      { label: 'Initializing Audio...',   color: 'text-blue-600',  dot: 'bg-blue-500', bg: 'bg-blue-50' },
  teaching:   { label: 'Sage is explaining', color: 'text-primary-700', dot: 'bg-primary-500', bg: 'bg-primary-50' },
  listening:  { label: 'Listening to you', color: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  thinking:   { label: 'Sage is thinking...', color: 'text-indigo-600', dot: 'bg-indigo-500', bg: 'bg-indigo-50' },
  error:      { label: 'Connection Lost', color: 'text-red-600', dot: 'bg-red-500', bg: 'bg-red-50' },
};

function StatusBadge({ state }) {
  const cfg = STATUS_CONFIG[state] || STATUS_CONFIG.connecting;
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full ${cfg.bg} border border-current/10 transition-all duration-500`}>
      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} animate-pulse shadow-sm`} />
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

// ── Dialogue Transcript display ──────────────────────────────────────────────

function DialogueDisplay({ transcript, userTranscript, isSpeaking, isListening }) {
  const bottomRef = useRef(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, userTranscript]);

  if (!transcript && !userTranscript) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-gray-300 gap-3 italic">
        <Sparkles className="h-5 w-5 opacity-20" />
        <p className="text-xs">Your live teaching session will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-48 overflow-y-auto px-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      {/* User portion (if active) */}
      {userTranscript && (
        <div className="flex justify-end">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
             <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">You</span>
             </div>
             <p className="text-gray-700 text-sm font-medium leading-relaxed">{userTranscript}</p>
          </div>
        </div>
      )}

      {/* Sage portion */}
      {transcript && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] shadow-sm">
             <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sage</span>
             </div>
             <p className="text-gray-800 text-sm font-medium leading-relaxed">
               {transcript}
               {isSpeaking && (
                 <motion.span
                   animate={{ opacity: [1, 0] }}
                   transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                   className="inline-block w-[2px] h-4 bg-primary/40 ml-1 align-middle rounded"
                 />
               )}
             </p>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Main GeminiLiveTeacher component ──────────────────────────────────────

export default function GeminiLiveTeacher({
  isOpen,
  onClose,
  moduleTitle = '',
  moduleTopic = '',
  content = '',
  teachingLevel = 'intermediate',
  userName = '',
  contextLabel = '',
  documentId = null,
  moduleId = null,
}) {
  const [interruptInput, setInterruptInput] = useState('');
  const [showInterrupt, setShowInterrupt] = useState(false);
  const [toolData, setToolData] = useState(null); // { type: 'diagram'|'illustration'|'research', loading: bool, ... }
  const [isLightningRound, setIsLightningRound] = useState(false);
  const inputRef = useRef(null);

  const onToolCall = useCallback(async (call) => {
    const fc = call.functionCalls[0];
    console.log(`[SageTool] Executing: ${fc.name}`, fc.args);

    if (fc.name === 'render_diagram') {
      setToolData({ type: 'diagram', code: fc.args.code, title: fc.args.title });
    } 
    
    else if (fc.name === 'generate_illustration') {
      setToolData({ type: 'illustration', loading: true, prompt: fc.args.prompt });
      try {
        const result = await generateDiagramForTopic({
          topic: fc.args.prompt,
          moduleId,
          documentId,
          diagramType: 'image'
        });
        const imageUrl = await getGeneratedDiagramImageUrl(result.id);
        setToolData({ type: 'illustration', loading: false, prompt: fc.args.prompt, url: imageUrl });
      } catch (err) {
        console.error('Illustration failed', err);
        setToolData(null);
      }
    }

    else if (fc.name === 'search_external_knowledge') {
      setToolData({ type: 'research', loading: true, query: fc.args.query });
      try {
        const result = await sendQuery(fc.args.query, documentId);
        setToolData({ type: 'research', loading: false, query: fc.args.query, results: result.webSources || [] });
      } catch (err) {
        console.error('Research failed', err);
        setToolData(null);
      }
    }

    else if (fc.name === 'start_lightning_round') {
      setIsLightningRound(true);
      setTimeout(() => setIsLightningRound(false), 12000);
    }
  }, [documentId, moduleId]);

  const {
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
  } = useGeminiLive({ moduleTitle, moduleTopic, content, teachingLevel, userName, onToolCall });

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
          style={{ backdropFilter: 'blur(32px)', backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
        >
          {/* Main card - Sleek White Design */}
          <motion.div
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border border-gray-100"
            style={{
              boxShadow: '0 32px 120px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)',
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {/* Header / Top bar */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 shadow-sm">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-gray-900 font-black text-lg leading-none tracking-tight">Sage Live</h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">Personal AI Tutor</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Context label */}
            {(contextLabel || moduleTitle) && (
              <div className="px-8 pb-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
                  <GraduationCap className="h-4 w-4 text-primary/60" />
                  <span className="text-gray-600 text-[11px] font-black truncate max-w-[280px]">
                    {contextLabel || moduleTitle}
                  </span>
                </div>
              </div>
            )}

            {/* Central visualizer area */}
            <div className="flex flex-col items-center justify-center px-8 py-10 gap-8 relative">
              {isLightningRound && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-0 flex items-center gap-2 bg-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg z-10"
                >
                  <Zap className="h-3 w-3 fill-current" />
                  Lightning Round!
                </motion.div>
              )}

              {/* Waveform visualizer */}
              <div className="w-full relative py-2">
                 {/* Ambient decorative circle */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                   <div className="w-48 h-48 rounded-full border-4 border-primary animate-pulse" />
                </div>
                <AudioWave active={isSpeaking} color={isSpeaking ? (isLightningRound ? '#f59e0b' : '#3b82f6') : '#e2e8f0'} />
              </div>

              {/* Status Indicator */}
              <StatusBadge state={state} />

              {/* Interaction visualizer */}
              <div className="flex flex-col items-center gap-4">
                 <MicPulse active={isListening} />
                 
                 <p className="text-gray-400 text-[11px] text-center font-bold max-w-[240px] leading-relaxed uppercase tracking-wider">
                  {isConnecting
                    ? 'Connecting to secure channel...'
                    : isSpeaking
                      ? (isLightningRound ? 'Sage is firing questions!' : 'Sage is explaining — Speak anytime to interrupt')
                      : isListening
                        ? 'Mic active — Ask a question or say "continue"'
                        : 'Calibrating AI voice...'}
                </p>
              </div>
            </div>

            {/* Multimodal Tool Display (Diagrams, Illustrations, Research) */}
            <AnimatePresence mode="wait">
              {toolData?.type === 'diagram' && (
                <div key="diagram" className="px-8 flex justify-center w-full">
                  <DiagramDisplay code={toolData.code} title={toolData.title} />
                </div>
              )}
              {toolData?.type === 'illustration' && (
                <div key="illustration" className="px-8 flex justify-center w-full">
                  <IllustrationDisplay prompt={toolData.prompt} url={toolData.url} loading={toolData.loading} />
                </div>
              )}
              {toolData?.type === 'research' && (
                <div key="research" className="px-8 flex justify-center w-full">
                  <KnowledgeCard query={toolData.query} results={toolData.results} loading={toolData.loading} />
                </div>
              )}
            </AnimatePresence>

            {/* Transcript Area */}
            <div className="px-8 pb-4">
              <div className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100/50">
                <DialogueDisplay 
                  transcript={transcript} 
                  userTranscript={userTranscript} 
                  isSpeaking={isSpeaking} 
                  isListening={isListening} 
                />
              </div>
            </div>

            {/* Error Message */}
            {state === 'error' && error && (
              <div className="mx-8 mb-4 p-4 rounded-2xl flex items-center gap-4 bg-red-50 border border-red-100">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-red-900 text-xs font-black uppercase tracking-widest mb-0.5">Connection Problem</p>
                  <p className="text-red-600 text-xs font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Bottom actions row */}
            <div className="px-8 pb-10 space-y-4">
              {/* Text interruption drawer */}
              <AnimatePresence>
                {showInterrupt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl mb-4 bg-gray-50 border border-gray-100 shadow-inner focus-within:border-primary/30 transition-all">
                      <MessageSquare className="h-4 w-4 text-gray-400 ml-2" />
                      <input
                        ref={inputRef}
                        value={interruptInput}
                        onChange={e => setInterruptInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendInterrupt()}
                        placeholder="Type a question or comment..."
                        className="flex-1 bg-transparent text-gray-700 text-sm placeholder:text-gray-300 outline-none font-medium"
                      />
                      <button
                        onClick={handleSendInterrupt}
                        disabled={!interruptInput.trim()}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowInterrupt(v => !v)}
                  disabled={!isActive || isConnecting}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-40 border ${
                    showInterrupt 
                      ? 'bg-primary/5 border-primary text-primary' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {isConnecting ? 'Syncing...' : (showInterrupt ? 'Hide Input' : 'Type Question')}
                </button>

                <button
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all"
                >
                  <X className="h-4 w-4" />
                  End Session
                </button>
              </div>

              {/* Informational tip */}
              <p className="text-center text-gray-300 text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2">
                <Sparkles className="h-3 w-3" />
                Sage will hear you automatically while the mic is active
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
