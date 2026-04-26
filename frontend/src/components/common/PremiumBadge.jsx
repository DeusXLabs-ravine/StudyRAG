import { Crown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * PremiumBadge — three variants for Pro gating:
 *   `chip`  — compact pill next to feature names ("Pro")
 *   `lock`  — floating lock indicator on cards/nav items
 *   `cta`   — full gradient button ("Unlock with Pro")
 *
 * tier: 'pro' | 'max' — swaps gradient palette
 */
export default function PremiumBadge({
  variant = 'chip',
  tier = 'pro',
  label,
  onClick,
  className = '',
}) {
  const palette = tier === 'max'
    ? { from: 'from-amber-400', via: 'via-orange-400', to: 'to-rose-400', text: 'text-amber-700', ring: 'ring-amber-300/40', icon: Crown }
    : { from: 'from-violet-500', via: 'via-fuchsia-500', to: 'to-pink-500', text: 'text-violet-700', ring: 'ring-violet-300/40', icon: Sparkles };

  const Icon = palette.icon;
  const defaultLabel = tier === 'max' ? 'Max' : 'Pro';
  const text = label ?? defaultLabel;

  // ── Chip: inline pill beside a feature name ────────────────
  if (variant === 'chip') {
    return (
      <span
        className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.08em] overflow-hidden ${className}`}
      >
        <span className={`absolute inset-0 bg-gradient-to-r ${palette.from} ${palette.via} ${palette.to} opacity-90`} />
        <span className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/20 to-white/40 mix-blend-overlay" />
        <Icon className="relative h-2.5 w-2.5 text-white drop-shadow-sm" strokeWidth={2.5} />
        <span className="relative text-white drop-shadow-sm">{text}</span>
      </span>
    );
  }

  // ── Lock: floating indicator (replaces plain Lock icon) ────
  if (variant === 'lock') {
    return (
      <div className={`relative ${className}`}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(139,92,246,0.35)]"
        >
          <span className={`absolute inset-0 rounded-full bg-gradient-to-br ${palette.from} ${palette.via} ${palette.to}`} />
          <span className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 to-white/25" />
          <Icon className="relative h-2.5 w-2.5 drop-shadow-sm" strokeWidth={2.5} />
          <span className="relative drop-shadow-sm">{text}</span>
        </motion.div>
      </div>
    );
  }

  // ── CTA: full button ("Unlock with Pro") ───────────────────
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white overflow-hidden transition-transform active:scale-[0.98] cursor-pointer ${className}`}
    >
      <span className={`absolute inset-0 bg-gradient-to-br ${palette.from} ${palette.via} ${palette.to}`} />
      <span className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/5 to-white/20 group-hover:from-white/5 group-hover:to-white/30 transition-all" />
      <span className={`absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`} />
      {/* Sheen sweep on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
      <Icon className="relative h-4 w-4 drop-shadow" strokeWidth={2.3} />
      <span className="relative drop-shadow">{text || 'Unlock with Pro'}</span>
    </button>
  );
}
