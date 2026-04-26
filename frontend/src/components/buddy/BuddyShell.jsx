import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
  Settings,
  X,
  Phone,
  RotateCcw,
  Brain,
  BookMarked,
  Waves,
  MessageCircle,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import BuddyOrb from './BuddyOrb';
import BuddyTranscript from './BuddyTranscript';
import BuddyToolbar from './BuddyToolbar';
import BuddyStatusPill from './BuddyStatusPill';
import BuddyDocumentPicker from './BuddyDocumentPicker';
import BuddyPDFViewer from './BuddyPDFViewer';
import useBuddy from '../../hooks/useBuddy';
import useBuddyStore from '../../store/buddyStore';

const MODES = {
  feynman: {
    label: 'Feynman',
    blurb: 'You explain, Buddy quizzes back.',
    Icon: Brain,
    iconColor: 'text-stone-500',
  },
  exam_prep: {
    label: 'Exam Prep',
    blurb: 'Go over questions & explain answers.',
    Icon: GraduationCap,
    iconColor: 'text-amber-500',
  },
  cofocus: {
    label: 'Co-focus',
    blurb: 'Side by side on a document.',
    Icon: BookMarked,
    iconColor: 'text-stone-500',
  },
  ambient: {
    label: 'Ambient',
    blurb: 'Quiet company while you study.',
    Icon: Waves,
    iconColor: 'text-stone-500',
  },
  freeform: {
    label: 'Freeform',
    blurb: 'Just talk — no structure.',
    Icon: MessageCircle,
    iconColor: 'text-stone-500',
  },
};

export default function BuddyShell({ onExit, onSettings, onOpenSage }) {
  const { start, stop, sendText, sendPageUpdate } = useBuddy();
  const [muted, setMuted] = useState(false);
  const [coReadHidden, setCoReadHidden] = useState(false); // lets users hide the PDF mid-session

  const status = useBuddyStore(s => s.live.status);
  const mood = useBuddyStore(s => s.live.mood);
  const profile = useBuddyStore(s => s.profile);
  const sessionGoal = useBuddyStore(s => s.sessionContext.sessionGoal);
  const documentId = useBuddyStore(s => s.sessionContext.documentId);
  const documentTitle = useBuddyStore(s => s.sessionContext.documentTitle);
  const documentIsPdf = useBuddyStore(s => s.sessionContext.documentIsPdf);
  const setSessionContext = useBuddyStore(s => s.setSessionContext);
  const lastError = useBuddyStore(s => s.live.lastError);
  const sageHandoff = useBuddyStore(s => s.live.sageHandoff);

  useEffect(() => () => stop(), [stop]);

  const isPreSession = status === 'idle' || status === 'ended' || status === 'error';
  const isLive = !isPreSession;
  const canCoRead = Boolean(documentId);
  // By default, show the PDF whenever one is picked. Users can hide via the
  // toolbar toggle and it stays hidden for the rest of the session.
  const showCoRead = canCoRead && !coReadHidden;

  // Whenever the user picks a fresh doc, reveal the PDF again.
  useEffect(() => {
    setCoReadHidden(false);
  }, [documentId]);

  const handleHangUp = () => {
    stop();
    onExit?.();
  };

  const toggleMute = () => {
    setMuted(m => {
      const next = !m;
      try {
        const micStream = window.__buddyMicStream;
        if (micStream) {
          micStream.getAudioTracks().forEach(t => { t.enabled = !next; });
        }
      } catch { /* noop */ }
      return next;
    });
  };

  const acceptSageHandoff = () => {
    const reason = sageHandoff?.reason || '';
    stop();
    onOpenSage?.(reason);
  };

  const handlePageChange = useCallback((n) => {
    setSessionContext({ pageNumber: n });
    sendPageUpdate?.(n);
  }, [sendPageUpdate, setSessionContext]);

  // Use status as mood hint when it adds information (listening = green glow, speaking = blue glow)
  const activeMood = !isLive ? 'neutral' : status === 'listening' ? 'listening' : status === 'speaking' ? 'speaking' : mood;
  const goal = MODES[sessionGoal] || MODES.freeform;

  return (
    <div
      className="buddy-ambient relative min-h-[calc(100vh-4rem)]"
      data-buddy-mood={activeMood}
    >
      {/* Header */}
      <header className="relative z-10 bg-white/60 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleHangUp}
              aria-label="Close Buddy session"
              className="h-9 w-9 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-medium">Study Buddy</span>
              <h1 className="text-sm font-semibold text-stone-900 truncate flex items-center gap-1.5">
                {profile?.name || 'Buddy'}
                <goal.Icon className={`w-3.5 h-3.5 ${goal.iconColor}`} />
                <span className="text-stone-400 font-normal text-[13px]">· {goal.label}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCoRead && (
              <button
                type="button"
                onClick={() => setCoReadHidden(h => !h)}
                aria-pressed={showCoRead}
                className={[
                  'hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors',
                  showCoRead
                    ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                    : 'bg-white/80 text-stone-700 border-stone-200 hover:bg-stone-50',
                ].join(' ')}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {showCoRead ? 'Hide PDF' : 'Study together'}
              </button>
            )}
            <BuddyStatusPill />
            {onSettings && (
              <button
                type="button"
                onClick={onSettings}
                aria-label="Buddy settings"
                className="h-9 w-9 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main body — single layout that scales from "setup only" to "setup + live"
          and pairs with a PDF pane whenever a PDF is picked. */}
      <main
        className={[
          'relative z-10 px-4 pb-8 pt-6 sm:pt-8 mx-auto',
          showCoRead ? 'max-w-6xl' : 'max-w-3xl',
        ].join(' ')}
      >
        <div
          className={[
            'flex gap-6',
            showCoRead ? 'lg:flex-row flex-col' : 'flex-col items-center',
          ].join(' ')}
        >
          {/* Document pane — PDF viewer for PDFs, context card for other types. */}
          {showCoRead && (
            <div className="flex-1 min-w-0 lg:h-[calc(100vh-10rem)] h-[55vh] min-h-[360px]">
              {documentIsPdf ? (
                <BuddyPDFViewer
                  documentId={documentId}
                  documentTitle={documentTitle}
                  onPageChange={handlePageChange}
                  onClose={() => setCoReadHidden(true)}
                />
              ) : (
                <div className="flex flex-col h-full rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-100 bg-white/70">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500 font-medium">Studying together</p>
                      <p className="text-sm font-medium text-stone-900 truncate" title={documentTitle}>
                        {documentTitle || 'Document'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoReadHidden(true)}
                      aria-label="Close document panel"
                      className="h-8 w-8 grid place-items-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-stone-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-700 mb-1">{documentTitle}</p>
                      <p className="text-[13px] text-stone-500 max-w-xs leading-relaxed">
                        Buddy has this document in mind for your session. Ask anything about it — quotes, summaries, key points.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right (or center) column — orb, setup card pre-session, transcript live. */}
          <div
            className={[
              'flex flex-col items-center',
              showCoRead ? 'lg:w-[420px] w-full' : 'w-full max-w-md',
            ].join(' ')}
          >
            <BuddyOrb size={isPreSession ? 196 : (showCoRead ? 220 : 260)} />
            {isPreSession ? (
              <p className="mt-4 text-[13px] text-stone-500 tracking-wide">
                {profile?.name || 'Buddy'} is ready when you are
              </p>
            ) : (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                {status === 'listening' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[12px] font-semibold text-emerald-700 tracking-wide">Speak now — Buddy is listening</span>
                  </div>
                ) : status === 'speaking' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                    <span className="buddy-wave text-stone-500" aria-hidden="true"><span /><span /><span /><span /></span>
                    <span className="text-[12px] font-medium text-stone-600">Buddy is speaking — interrupt anytime</span>
                  </div>
                ) : (
                  <p className="text-[13px] text-stone-500 text-center max-w-md">{goal.blurb}</p>
                )}
              </div>
            )}

            {isPreSession ? (
              /* Single setup card: mode + document + start, grouped so the picker
                 has a clear home instead of floating as its own row. */
              <section className="mt-7 w-full rounded-2xl border border-stone-200/60 bg-white/80 backdrop-blur-md shadow-[0_2px_16px_rgba(28,25,23,0.06),0_1px_2px_rgba(28,25,23,0.04)] p-4 sm:p-5" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(250,247,242,0.92) 100%)' }}>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-stone-500 font-medium mb-2.5">
                  How you want to study
                </div>
                <div role="tablist" aria-label="Session mode" className="grid grid-cols-2 gap-1.5">
                  {Object.entries(MODES).map(([key, m]) => {
                    const active = sessionGoal === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSessionContext({ sessionGoal: key })}
                        className={[
                          'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12.5px] font-medium border cursor-pointer transition-all duration-200',
                          active
                            ? 'bg-stone-900 text-white border-stone-900 shadow-[0_2px_8px_rgba(28,25,23,0.2)]'
                            : 'bg-white/80 text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300 hover:shadow-sm',
                        ].join(' ')}
                      >
                        <m.Icon className={`w-3.5 h-3.5 ${active ? 'text-white/90' : 'text-stone-500'}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-[12px] text-stone-500 leading-snug">{goal.blurb}</p>

                <div className="mt-4 pt-4 border-t border-stone-100">
                  <BuddyDocumentPicker />
                </div>

                <button
                  type="button"
                  onClick={() => start()}
                  disabled={!profile?.id}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-[0.99] shadow-[0_4px_12px_rgba(28,25,23,0.25)] hover:shadow-[0_6px_16px_rgba(28,25,23,0.30)]"
                >
                  {status === 'error' || status === 'ended' ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Start session
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Start session
                    </>
                  )}
                </button>
                {status === 'connecting' && (
                  <p className="mt-3 text-center text-[12px] text-stone-500">
                    Connecting to {profile?.name || 'your buddy'}…
                  </p>
                )}
              </section>
            ) : (
              <div
                className={[
                  'mt-5 w-full rounded-2xl bg-white/75 backdrop-blur-sm border border-stone-200/70 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden flex flex-col',
                  showCoRead ? 'h-[calc(100vh-22rem)] min-h-[220px]' : 'h-[34vh] min-h-[240px] max-w-2xl',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-500" />
                  </span>
                  <span className="text-[10.5px] uppercase tracking-[0.14em] text-stone-500 font-medium">Transcript</span>
                  {documentTitle && !showCoRead && (
                    <span className="ml-auto text-[11px] text-stone-600 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full truncate max-w-[50%]">
                      {documentTitle}
                    </span>
                  )}
                </div>
                <BuddyTranscript className="flex-1" />
              </div>
            )}

            {canCoRead && (
              <button
                type="button"
                onClick={() => setCoReadHidden(h => !h)}
                className={[
                  'sm:hidden mt-4 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors',
                  showCoRead
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white/80 text-stone-700 border-stone-200',
                ].join(' ')}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {showCoRead ? 'Hide PDF' : 'Study together'}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {lastError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 mx-auto px-3 py-2 rounded-lg bg-red-50 text-red-700 text-[13px] border border-red-200 max-w-md"
              role="alert"
            >
              {lastError}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer toolbar — only once session is live */}
      {isLive && (
        <footer className="sticky bottom-0 left-0 right-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-white/80 via-white/60 to-transparent backdrop-blur-sm">
          <BuddyToolbar
            muted={muted}
            onToggleMute={toggleMute}
            onHangUp={handleHangUp}
            onSendText={sendText}
            onAcceptSageHandoff={onOpenSage ? acceptSageHandoff : null}
          />
          <div className="mt-2 text-center text-[11px] text-gray-500">
            Everything you say stays private. Buddy only remembers what you save.
          </div>
        </footer>
      )}
    </div>
  );
}
