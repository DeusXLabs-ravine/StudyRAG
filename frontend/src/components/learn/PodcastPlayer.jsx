import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, List, Radio } from 'lucide-react';
import useGeminiPodcast from '../../hooks/useGeminiPodcast';
import useAuthStore from '../../store/authStore';

// ── Per-host equalizer — bars are deterministic so they animate smoothly ───────
// No Math.random() in render; heights derived from index so they're stable.
function HostEqualizer({ active, color, bars = 28, seed = 0 }) {
  const barParams = useMemo(() =>
    Array.from({ length: bars }, (_, i) => {
      const x = i + seed * 3.7;
      return {
        h: 6 + Math.abs(Math.sin(x * 0.55) * 22 + Math.cos(x * 0.31) * 10),
        dur: 0.38 + Math.abs(Math.sin(x * 1.1)) * 0.28,
        delay: Math.abs(Math.cos(x * 0.7)) * 0.18,
      };
    }),
    [bars, seed]
  );

  return (
    <div className="flex items-end gap-[2px]" style={{ height: 48 }}>
      {barParams.map(({ h, dur, delay }, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width: 3, backgroundColor: color, originY: 1 }}
          animate={active
            ? { scaleY: [0.12, h / 28, 0.08, h / 22, 0.15, h / 32, 0.1], opacity: [0.5, 1, 0.7, 1, 0.6] }
            : { scaleY: 0.1, opacity: 0.15 }
          }
          transition={active
            ? { duration: dur, repeat: Infinity, repeatType: 'mirror', delay, ease: 'easeInOut' }
            : { duration: 0.4, ease: 'easeOut' }
          }
        />
      ))}
    </div>
  );
}

// ── Host portrait — editorial feel, not a generic card ─────────────────────────
function HostPortrait({ name, isSpeaking, color, side, initial }) {
  const isLeft = side === 'left';
  return (
    <div className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}>
      {/* Name label */}
      <div className={`flex items-center gap-2 mb-4 ${isLeft ? '' : 'flex-row-reverse'}`}>
        <motion.div
          animate={{ opacity: isSpeaking ? 1 : 0, scale: isSpeaking ? 1 : 0.6 }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          transition={{ duration: 0.3 }}
        />
        <p className="text-[11px] font-black tracking-[0.35em] uppercase" style={{ color: isSpeaking ? color : 'rgba(255,255,255,0.3)' }}>
          {isSpeaking ? 'ON AIR' : 'STANDBY'}
        </p>
      </div>

      {/* Avatar ring */}
      <motion.div
        animate={isSpeaking
          ? { boxShadow: `0 0 0 2px ${color}, 0 0 40px ${color}55`, scale: 1.03 }
          : { boxShadow: `0 0 0 1px rgba(255,255,255,0.08)`, scale: 1 }
        }
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-[140px] h-[170px] rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}18 0%, #0A0A14 100%)` }}
      >
        {/* Geometric letter fill */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black select-none"
            style={{
              fontSize: 72,
              color,
              opacity: isSpeaking ? 0.22 : 0.09,
              lineHeight: 1,
              letterSpacing: '-0.05em',
              transition: 'opacity 0.5s',
            }}
          >
            {initial}
          </span>
        </div>

        {/* Subtle grid lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
          <defs>
            <pattern id={`grid-${initial}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${initial})`} />
        </svg>

        {/* Speaking gradient sweep */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${color}00 40%, ${color}28 100%)`,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Host name */}
      <div className={`mt-4 ${isLeft ? '' : 'text-right'}`}>
        <p className="text-white font-black text-lg tracking-tight leading-none">{name}</p>
        <p className="text-[10px] tracking-[0.25em] uppercase mt-1" style={{ color: `${color}80` }}>HOST</p>
      </div>

      {/* Per-host equalizer — only animates when this host is speaking */}
      <div className="mt-5">
        <HostEqualizer active={isSpeaking} color={color} bars={24} seed={isLeft ? 1 : 5} />
      </div>
    </div>
  );
}

// ── Transcript side panel ──────────────────────────────────────────────────────
function TranscriptPanel({ lines, currentLineIndex, hosts, colorA, colorB }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIndex]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
        <List className="h-3.5 w-3.5 text-white/30" />
        <span className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">Transcript</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
        {lines.map((line, i) => {
          const isA = line.host === 'A';
          const color = isA ? colorA : colorB;
          const isActive = i === currentLineIndex;

          return (
            <div
              key={i}
              ref={isActive ? activeRef : null}
              className="transition-all duration-300"
              style={{ opacity: isActive ? 1 : 0.28 }}
            >
              <p
                className="text-[9px] font-black tracking-[0.25em] uppercase mb-1"
                style={{ color }}
              >
                {line.name}
              </p>
              <p className="text-[13px] leading-relaxed text-white/90">
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Generating state ───────────────────────────────────────────────────────────
function GeneratingState({ colorA, colorB }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      {/* Animated waveform placeholder */}
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              backgroundColor: i < 20 ? colorA : colorB,
              originY: 1,
            }}
            animate={{ scaleY: [0.1, 0.3 + (i % 5) * 0.14, 0.1] }}
            transition={{ duration: 0.7 + (i % 7) * 0.09, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">Producing Episode</p>
        <p className="text-[11px] text-white/20">Gemini is scripting and voicing your hosts…</p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PodcastPlayer({
  isOpen, onClose,
  moduleTitle = '', moduleTopic = '',
  content = '', documentId = null, moduleId = null,
  teachingLevel = 'intermediate',
  activeSectionPodcast = null,
}) {
  const { profile } = useAuthStore();
  const userName = profile?.displayName || profile?.email?.split('@')[0] || '';
  const interests = profile?.interests || [];

  const [showTranscript, setShowTranscript] = useState(true);

  // ── Section podcast mode: pre-generated audio URL ─────────────────────────
  const isSectionMode = !!activeSectionPodcast?.audioUrl;
  const [sectionIsPlaying, setSectionIsPlaying] = useState(false);
  const [sectionIsPaused, setSectionIsPaused] = useState(false);
  const sectionAudioRef = useRef(null);

  // Set up section audio element when entering section mode
  useEffect(() => {
    if (!isOpen || !isSectionMode) return;

    const audio = new Audio(activeSectionPodcast.audioUrl);
    sectionAudioRef.current = audio;
    audio.addEventListener('play', () => { setSectionIsPlaying(true); setSectionIsPaused(false); });
    audio.addEventListener('pause', () => { setSectionIsPlaying(false); setSectionIsPaused(true); });
    audio.addEventListener('ended', () => { setSectionIsPlaying(false); setSectionIsPaused(false); });
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.src = '';
      sectionAudioRef.current = null;
      setSectionIsPlaying(false);
      setSectionIsPaused(false);
    };
  }, [isOpen, isSectionMode, activeSectionPodcast?.audioUrl]);

  const toggleSectionPlay = () => {
    const audio = sectionAudioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const restartSection = () => {
    const audio = sectionAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  };

  const {
    state, isGenerating, isPlaying, isPaused, isReady,
    lines, activeHost, currentLineIndex,
    hosts, error,
    start, stop, togglePlay, restart,
  } = useGeminiPodcast({
    moduleTitle, moduleTopic, content,
    userName, interests, moduleId, documentId, teachingLevel,
  });

  useEffect(() => {
    // Skip normal auto-start when in section mode
    if (isSectionMode) return;
    if (isOpen && state === 'idle') start();
    // On close: pause but keep the audio alive so re-opening is instant.
    // The audio element stays in memory (session cache handles it).
    if (!isOpen && isPlaying) togglePlay();
  }, [isOpen, isSectionMode]);

  // Close: pause the audio but keep it alive in the session cache.
  // Next time the player opens, it restores instantly without re-generating.
  const handleClose = () => {
    if (isSectionMode) {
      sectionAudioRef.current?.pause();
    } else if (isPlaying) {
      togglePlay(); // pause
    }
    onClose();
  };

  if (!isOpen) return null;

  const colorA = '#C084FC';   // warm violet
  const colorB = '#34D399';   // cool emerald

  // ── Section mode: pre-generated episode ───────────────────────────────────
  if (isSectionMode) {
    const sp = activeSectionPodcast;
    const sectionTitle = sp.heading || `Section ${(sp.section_index ?? 0) + 1} Podcast`;
    const sectionTopic = sp.topic || '';

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
        style={{ background: '#07070E', fontFamily: "'Geist', 'Inter', sans-serif" }}
      >
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: sectionIsPlaying
                ? `radial-gradient(ellipse 70% 60% at 50% 50%, ${colorA}1A 0%, transparent 70%)`
                : 'none',
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px',
            }}
          />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-8 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Radio className="h-4 w-4 text-white/20" />
            <span className="text-[11px] font-black tracking-[0.45em] text-white/30 uppercase">Section Episode</span>
            {(sectionIsPlaying || sectionIsPaused) && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-black tracking-[0.25em] uppercase px-2 py-0.5 rounded-full"
                style={{
                  color: sectionIsPlaying ? colorA : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${sectionIsPlaying ? colorA + '50' : 'rgba(255,255,255,0.1)'}`,
                  background: sectionIsPlaying ? colorA + '12' : 'transparent',
                  transition: 'all 0.5s ease',
                }}
              >
                {sectionIsPlaying ? '● LIVE' : '⏸ PAUSED'}
              </motion.span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.12)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10 px-8 min-h-0">
          {/* Episode info */}
          <div className="text-center max-w-xs">
            <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mb-2">Now Playing</p>
            <h1 className="text-white font-black text-xl leading-tight tracking-tight">{sectionTitle}</h1>
            {sectionTopic && <p className="text-white/30 text-sm mt-1">{sectionTopic}</p>}
            {sp.duration_secs && (
              <p className="text-[11px] text-white/20 mt-2">
                {Math.floor(sp.duration_secs / 60)}m {sp.duration_secs % 60}s
              </p>
            )}
          </div>

          {/* Waveform visualizer */}
          <div className="flex items-end gap-[2px]" style={{ height: 48 }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{ width: 3, backgroundColor: colorA, originY: 1 }}
                animate={sectionIsPlaying
                  ? { scaleY: [0.1, 0.3 + (i % 5) * 0.14, 0.1] }
                  : { scaleY: 0.1, opacity: 0.15 }
                }
                transition={sectionIsPlaying
                  ? { duration: 0.7 + (i % 7) * 0.09, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }
                  : { duration: 0.4, ease: 'easeOut' }
                }
              />
            ))}
          </div>

          {/* Hosts row (static, no speaking state) */}
          <div className="flex items-center gap-12">
            <HostPortrait name="Alex" isSpeaking={false} color={colorA} side="left" initial="A" />
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-px h-12 bg-white/5" />
              <span className="text-white/10 font-black text-xl">×</span>
              <div className="w-px h-12 bg-white/5" />
            </div>
            <HostPortrait name="Jamie" isSpeaking={false} color={colorB} side="right" initial="J" />
          </div>
        </div>

        {/* Bottom controls */}
        <div
          className="relative z-10 flex items-center justify-center gap-10 px-8 py-7 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Restart */}
          <button
            onClick={restartSection}
            disabled={!sectionIsPlaying && !sectionIsPaused}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all disabled:opacity-20"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            title="Restart"
          >
            <RotateCcw className="h-4 w-4 text-white/40" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={toggleSectionPlay}
            className="relative flex items-center justify-center w-16 h-16 rounded-full transition-all active:scale-95 group"
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={sectionIsPlaying ? {
                boxShadow: `0 0 0 2px ${colorA}, 0 0 28px ${colorA}44`,
              } : {
                boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
              }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="absolute inset-[3px] rounded-full"
              animate={{ background: sectionIsPlaying ? colorA : 'rgba(255,255,255,0.12)' }}
              transition={{ duration: 0.5 }}
            />
            <div className="relative z-10">
              {sectionIsPlaying
                ? <Pause className="h-5 w-5 fill-current text-black" />
                : <Play className="h-5 w-5 fill-current text-white ml-0.5" />
              }
            </div>
          </button>

          {/* Spacer to keep button centered */}
          <div className="w-10 h-10" />
        </div>
      </motion.div>
    );
  }

  const speakingA = isPlaying && activeHost === 'A';
  const speakingB = isPlaying && activeHost === 'B';
  const bgColorA = speakingA ? colorA : 'transparent';
  const bgColorB = speakingB ? colorB : 'transparent';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: '#07070E', fontFamily: "'Geist', 'Inter', sans-serif" }}
    >
      {/* ── Ambient background — shifts per speaker ───────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: speakingA
              ? `radial-gradient(ellipse 70% 60% at 20% 50%, ${colorA}1A 0%, transparent 70%)`
              : speakingB
                ? `radial-gradient(ellipse 70% 60% at 80% 50%, ${colorB}1A 0%, transparent 70%)`
                : 'none',
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Static noise grain */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
        {/* Vertical divider line */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: showTranscript ? 'calc(100% - 340px)' : '50%',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent)',
            transition: 'left 0.4s ease',
          }}
        />
      </div>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Radio className="h-4 w-4 text-white/20" />
          <span className="text-[11px] font-black tracking-[0.45em] text-white/30 uppercase">The Study Break</span>
          {(isPlaying || isPaused) && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-black tracking-[0.25em] uppercase px-2 py-0.5 rounded-full"
              style={{
                color: isPlaying ? (speakingA ? colorA : colorB) : 'rgba(255,255,255,0.3)',
                border: `1px solid ${isPlaying ? (speakingA ? colorA + '50' : colorB + '50') : 'rgba(255,255,255,0.1)'}`,
                background: isPlaying ? (speakingA ? colorA + '12' : colorB + '12') : 'transparent',
                transition: 'all 0.5s ease',
              }}
            >
              {isPlaying ? '● LIVE' : '⏸ PAUSED'}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="text-[10px] font-black tracking-[0.2em] uppercase transition-all px-3 py-1.5 rounded-lg"
            style={{
              color: showTranscript ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
              background: showTranscript ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: showTranscript ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
            }}
          >
            Script
          </button>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.12)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex min-h-0">

        {/* Left: studio / hosts */}
        <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8 min-h-0">

          {/* Episode info */}
          <div className="text-center max-w-xs">
            <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mb-2">Now Playing</p>
            <h1 className="text-white font-black text-xl leading-tight tracking-tight">
              {moduleTitle || 'Study Break Episode'}
            </h1>
            {moduleTopic && (
              <p className="text-white/30 text-sm mt-1">{moduleTopic}</p>
            )}
          </div>

          {/* Hosts */}
          {isGenerating ? (
            <GeneratingState colorA={colorA} colorB={colorB} />
          ) : (
            <div className="flex items-end gap-16">
              {/* Host A */}
              <HostPortrait
                name={hosts?.hostA?.name || 'Alex'}
                isSpeaking={speakingA}
                color={colorA}
                side="left"
                initial={(hosts?.hostA?.name || 'A')[0].toUpperCase()}
              />

              {/* Center divider */}
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="w-px h-12 bg-white/5" />
                <span className="text-white/10 font-black text-xl">×</span>
                <div className="w-px h-12 bg-white/5" />
              </div>

              {/* Host B */}
              <HostPortrait
                name={hosts?.hostB?.name || 'Jamie'}
                isSpeaking={speakingB}
                color={colorB}
                side="right"
                initial={(hosts?.hostB?.name || 'J')[0].toUpperCase()}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 py-3 rounded-xl text-[12px] text-red-400 font-medium max-w-sm text-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Right: transcript panel */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-80 flex-shrink-0 border-l flex flex-col"
              style={{
                borderColor: 'rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.012)',
              }}
            >
              <TranscriptPanel
                lines={lines}
                currentLineIndex={currentLineIndex}
                hosts={hosts}
                colorA={colorA}
                colorB={colorB}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center justify-center gap-10 px-8 py-7 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Restart */}
        <button
          onClick={restart}
          disabled={!isReady && !isPlaying && !isPaused}
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all disabled:opacity-20"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          title="Restart"
        >
          <RotateCcw className="h-4 w-4 text-white/40" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={isGenerating || (!isReady && !isPlaying && !isPaused)}
          className="relative flex items-center justify-center w-16 h-16 rounded-full transition-all active:scale-95 disabled:opacity-30 group"
        >
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={isPlaying ? {
              boxShadow: `0 0 0 2px ${speakingA ? colorA : colorB}, 0 0 28px ${speakingA ? colorA : colorB}44`,
            } : {
              boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
            }}
            transition={{ duration: 0.5 }}
          />
          {/* Fill */}
          <motion.div
            className="absolute inset-[3px] rounded-full"
            animate={{
              background: isPlaying
                ? (speakingA ? colorA : colorB)
                : 'rgba(255,255,255,0.12)',
            }}
            transition={{ duration: 0.5 }}
          />
          {/* Icon */}
          <div className="relative z-10">
            {isGenerating
              ? <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              : isPlaying
                ? <Pause className="h-5 w-5 fill-current" style={{ color: speakingA || speakingB ? '#000' : 'white' }} />
                : <Play className="h-5 w-5 fill-current text-white ml-0.5" />
            }
          </div>
        </button>

        {/* Spacer to keep button centered */}
        <div className="w-10 h-10" />
      </div>
    </motion.div>
  );
}
