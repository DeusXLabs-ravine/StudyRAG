import { useEffect, useRef, useState } from 'react';
import useBuddyStore from '../../store/buddyStore';

/**
 * Tiny mic-level meter. Subscribes to window.__buddyMicStream (set by
 * GeminiLiveSession._initMic) so we don't open a second mic stream. Renders
 * four bars scaled by RMS volume while listening. Falls back to a gentle
 * idle animation (CSS) if no stream is present yet.
 */
function useMicLevel(active) {
  const [levels, setLevels] = useState([0.15, 0.15, 0.15, 0.15]);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) { try { ctxRef.current.close(); } catch {} ctxRef.current = null; }
      return;
    }
    const stream = typeof window !== 'undefined' ? window.__buddyMicStream : null;
    if (!stream) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser);

    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      // Sample 4 frequency bands for a tiny equalizer feel.
      const bands = [0, 4, 12, 28];
      const next = bands.map((offset) => {
        let sum = 0;
        const span = 4;
        for (let i = 0; i < span; i++) sum += buf[offset + i] || 0;
        // Map 0..255 → 0.1..1 with a gentle floor.
        return Math.min(1, Math.max(0.1, (sum / span) / 180));
      });
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { ctx.close(); } catch {}
      ctxRef.current = null;
    };
  }, [active]);

  return levels;
}

export default function BuddyStatusPill() {
  const status = useBuddyStore(s => s.live.status);
  const elapsed = useBuddyStore(s => s.live.elapsedSec);
  const isLive = status === 'listening' || status === 'speaking';
  const levels = useMicLevel(status === 'listening');

  const fmt = (s) => {
    if (!s && s !== 0) return '';
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const LABEL = {
    idle:       { text: 'Ready',      dot: 'bg-stone-300',                 ring: 'ring-stone-100', text_c: 'text-stone-600' },
    connecting: { text: 'Connecting', dot: 'bg-stone-400 animate-pulse',   ring: 'ring-stone-100', text_c: 'text-stone-700' },
    listening:  { text: 'Listening',  dot: 'bg-emerald-500',               ring: 'ring-emerald-100', text_c: 'text-emerald-700' },
    speaking:   { text: 'Speaking',   dot: 'bg-stone-700',                 ring: 'ring-stone-100', text_c: 'text-stone-800' },
    ended:      { text: 'Ended',      dot: 'bg-stone-400',                 ring: 'ring-stone-100', text_c: 'text-stone-500' },
    error:      { text: 'Error',      dot: 'bg-red-500',                   ring: 'ring-red-100',   text_c: 'text-red-700' },
  }[status] || { text: status, dot: 'bg-stone-400', ring: 'ring-stone-100', text_c: 'text-stone-600' };

  return (
    <div
      className={[
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[12px]',
        'bg-white/70 backdrop-blur-sm border border-stone-200/60 ring-1',
        LABEL.ring,
        LABEL.text_c,
      ].join(' ')}
    >
      {status === 'listening' ? (
        <span className="buddy-wave buddy-wave--active text-emerald-500" aria-hidden="true">
          {levels.map((lvl, i) => (
            <span key={i} style={{ ['--lvl']: lvl }} />
          ))}
        </span>
      ) : status === 'speaking' ? (
        <span className="buddy-wave text-stone-700" aria-hidden="true">
          <span /><span /><span /><span />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${LABEL.dot}`} />
      )}
      <span className="font-semibold tracking-tight">{LABEL.text}</span>
      {isLive && (
        <span className="text-stone-400 tabular-nums">· {fmt(elapsed)}</span>
      )}
    </div>
  );
}
