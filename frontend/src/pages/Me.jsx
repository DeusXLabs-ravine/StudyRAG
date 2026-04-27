import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, Activity, BookOpen, ChevronRight, ArrowUpRight,
  LogOut, Bell, Shield, User, CreditCard, Trophy, Target,
  Type, Eye, Monitor, Mic, Ruler, AlignJustify, Focus, Moon, Sun,
  Gem, Clock, Waves,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import { useSubscription } from '../hooks/useSubscription';
import * as analyticsService from '../services/analyticsService';
import PricingModal from '../components/paywall/PricingModal';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] },
});

// Grouped accessibility categories — compact bento
const A11Y_GROUPS = [
  {
    title: 'Reading',
    icon: BookOpen,
    color: 'from-violet-500/10 to-violet-500/5',
    tint: 'text-violet-600',
    toggles: [
      { key: 'dyslexia_mode',  label: 'Dyslexia font',   icon: Type },
      { key: 'bionic_reading', label: 'Bionic reading',  icon: Eye },
      { key: 'large_text',     label: 'Large text',      icon: Type },
      { key: 'text_spacing',   label: 'Wider spacing',   icon: AlignJustify },
    ],
  },
  {
    title: 'Visual',
    icon: Monitor,
    color: 'from-slate-500/10 to-slate-500/5',
    tint: 'text-slate-600',
    toggles: [
      { key: 'high_contrast',   label: 'High contrast',  icon: Monitor },
      { key: 'dark_mode',       label: 'Dark mode',      icon: Moon },
      { key: 'desaturate',      label: 'Low saturation', icon: Sun },
      { key: 'focus_enhanced',  label: 'Focus ring',     icon: Focus },
    ],
  },
  {
    title: 'Motion & Input',
    icon: Activity,
    color: 'from-indigo-500/10 to-indigo-500/5',
    tint: 'text-indigo-600',
    toggles: [
      { key: 'reduced_motion', label: 'Reduced motion', icon: Waves },
      { key: 'adhd_focus_mode', label: 'Focus mode',     icon: Focus },
      { key: 'voice_input',    label: 'Voice input',    icon: Mic },
      { key: 'reading_ruler',  label: 'Reading ruler',  icon: Ruler },
    ],
  },
];

function BentoCard({ className = '', children, ...props }) {
  return (
    <div
      {...props}
      className={`relative bg-white border border-gray-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{children}</p>
  );
}

export default function Me() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuthStore();
  const { fetchSettings, setSetting, getA11y, applyA11yClasses } = useSettingsStore();
  const { tier, isPro } = useSubscription();

  const [overview, setOverview] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  const name = profile?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    fetchSettings();
    Promise.all([
      analyticsService.getOverview().catch(() => null),
      analyticsService.getWeakAreas().catch(() => []),
      analyticsService.getActivity(7).catch(() => []),
    ]).then(([ov, wa, act]) => {
      setOverview(ov || {});
      setWeakAreas(Array.isArray(wa) ? wa.slice(0, 6) : []);
      setActivity(Array.isArray(act) ? act : []);
    }).finally(() => setLoading(false));
  }, [fetchSettings]);

  const streak = overview?.streak?.currentStreak || 0;
  const longestStreak = overview?.streak?.longestStreak || 0;
  const xp = overview?.performance?.totalXp || 0;
  const level = overview?.performance?.level || 1;
  const totalDocs = overview?.performance?.totalDocs || 0;
  const totalSessions = overview?.performance?.totalSessions || 0;
  const mastery = Math.round(overview?.mastery?.score || 0);

  // Build last-7-day heatmap from activity
  const heatmap = useMemo(() => {
    const days = [];
    const byDate = {};
    activity.forEach(a => { byDate[a.date] = a.seconds || 0; });
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const secs = byDate[iso] || 0;
      days.push({
        date: iso,
        label: d.toLocaleDateString('en', { weekday: 'short' })[0],
        minutes: Math.round(secs / 60),
        intensity: secs === 0 ? 0 : secs < 300 ? 1 : secs < 900 ? 2 : secs < 1800 ? 3 : 4,
      });
    }
    return days;
  }, [activity]);

  const xpToNext = level * 100;
  const xpInLevel = xp - (level - 1) * 100;
  const xpPct = Math.min((xpInLevel / xpToNext) * 100, 100);

  const toggleA11y = (key) => {
    const current = getA11y(key);
    setSetting(`a11y_${key}`, String(!current));
    applyA11yClasses();
    toast.success(`${!current ? 'Enabled' : 'Disabled'} ${key.replace(/_/g, ' ')}`);
  };

  const handleSignOut = async () => { await signOut(); };

  const tierLabel = { free: 'Free', basic: 'Basic', pro: 'Pro', max: 'Max' }[tier] || 'Free';
  const tierColor = {
    free:  'from-gray-100 to-gray-50 text-gray-700',
    basic: 'from-blue-100 to-blue-50 text-blue-700',
    pro:   'from-violet-100 to-fuchsia-50 text-violet-700',
    max:   'from-amber-100 to-orange-50 text-amber-700',
  }[tier] || 'from-gray-100 to-gray-50 text-gray-700';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} currentTier={tier} />

      {/* ─── HERO — compact profile strip ─────────────────────────── */}
      <motion.section {...fadeUp(0)}>
        <BentoCard className="p-6 sm:p-7 bg-gradient-to-br from-white via-white to-sky-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white shadow-lg" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-2xl font-black text-white ring-2 ring-white shadow-lg">
                  {initials}
                </div>
              )}
              {streak >= 3 && (
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 ring-2 ring-white flex items-center justify-center shadow-md">
                  <Flame className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">{name}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${tierColor} ring-1 ring-white shadow-sm`}>
                  {tier === 'pro' || tier === 'max' ? <Gem className="h-2.5 w-2.5" /> : null}
                  {tierLabel}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>

            {/* Quick level + XP pill */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Level</p>
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none">{level}</p>
              </div>
              <div className="h-12 w-px bg-gray-200" />
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total XP</p>
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none">{xp.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </BentoCard>
      </motion.section>

      {/* ─── BENTO ROW 1: Streak (wide) + Level progress (narrow) ─────── */}
      <motion.section {...fadeUp(0.05)} className="grid grid-cols-12 gap-4">
        {/* Streak card — 8 cols */}
        <BentoCard className="col-span-12 lg:col-span-8 p-6 bg-gradient-to-br from-orange-50/50 via-white to-white">
          <div className="flex items-start justify-between mb-5">
            <div>
              <SectionLabel>Study streak</SectionLabel>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-4xl font-black text-gray-900 tabular-nums tracking-tight leading-none">{streak}</span>
                <span className="text-sm text-gray-500 font-bold">{streak === 1 ? 'day' : 'days'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {longestStreak > 0 && `Longest: ${longestStreak} days · `}
                Keep going, every day counts.
              </p>
            </div>
            <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="h-5 w-5 text-white" strokeWidth={2.3} />
            </div>
          </div>
          {/* 7-day heatmap */}
          <div>
            <div className="flex items-end gap-2 mb-2">
              {heatmap.map((day, i) => {
                const height = [8, 20, 36, 52, 72][day.intensity];
                const colors = ['bg-gray-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-gradient-to-t from-orange-500 to-orange-400'];
                return (
                  <motion.div
                    key={day.date}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
                    style={{ originY: 1 }}
                    className="flex-1 flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-full rounded-lg transition-all ${colors[day.intensity]}`}
                      style={{ height: `${height}px` }}
                      title={`${day.minutes} min`}
                    />
                    <span className="text-[10px] text-gray-400 font-bold">{day.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </BentoCard>

        {/* Level progress — 4 cols */}
        <BentoCard className="col-span-12 lg:col-span-4 p-6 bg-gradient-to-br from-sky-50/40 via-white to-white">
          <div className="flex items-start justify-between mb-4">
            <SectionLabel>Level progress</SectionLabel>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <Trophy className="h-4 w-4 text-white" strokeWidth={2.3} />
            </div>
          </div>
          <div className="mb-1.5">
            <span className="text-4xl font-black text-gray-900 tabular-nums tracking-tight leading-none">{xpInLevel}</span>
            <span className="text-sm text-gray-400 font-bold">/ {xpToNext}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">XP to Level {level + 1}</p>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full"
            />
          </div>
        </BentoCard>
      </motion.section>

      {/* ─── BENTO ROW 2: 4 mini-stats ────────────────────────────────── */}
      <motion.section {...fadeUp(0.1)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={BookOpen} label="Documents"   value={totalDocs}       tint="sky" />
        <MiniStat icon={Clock}    label="Sessions"    value={totalSessions}   tint="purple" />
        <MiniStat icon={Target}   label="Mastery"     value={`${mastery}%`}    tint="emerald" />
        <MiniStat icon={Flame}    label="Best streak" value={`${longestStreak}d`} tint="orange" />
      </motion.section>

      {/* ─── Weak areas + Subscription row ───────────────────────────── */}
      <motion.section {...fadeUp(0.12)} className="grid grid-cols-12 gap-4">
        {/* Weak areas — 7 cols */}
        <BentoCard className="col-span-12 lg:col-span-7 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.3} />
              </div>
              <SectionLabel>Weak areas to review</SectionLabel>
            </div>
          </div>
          {weakAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {weakAreas.map((area, i) => (
                <motion.button
                  key={(area.topic || area) + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/library/new?topic=${encodeURIComponent(area.topic || area)}`)}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/70 border border-amber-200/70 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer"
                >
                  {area.topic || area}
                  <ArrowUpRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No weak areas yet — keep taking quizzes to discover where to focus.</p>
          )}
        </BentoCard>

        {/* Subscription — 5 cols */}
        <BentoCard
          onClick={() => setShowPricing(true)}
          className="col-span-12 lg:col-span-5 p-6 cursor-pointer hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <CreditCard className="h-3.5 w-3.5 text-violet-600" strokeWidth={2.3} />
              </div>
              <SectionLabel>Subscription</SectionLabel>
            </div>
            <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-gray-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <p className="text-2xl font-black text-gray-900 leading-none">{tierLabel} plan</p>
          <p className="text-xs text-gray-500 mt-1.5">
            {isPro ? 'All premium features unlocked.' : 'Upgrade for unlimited documents & AI features.'}
          </p>
          {!isPro && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-lg shadow-sm">
              <Gem className="h-3 w-3" strokeWidth={2.3} />
              View plans
            </div>
          )}
        </BentoCard>
      </motion.section>

      {/* ─── Accessibility — 3-column grouped bento ──────────────────── */}
      <motion.section {...fadeUp(0.15)}>
        <div className="flex items-center gap-2 mb-3 px-1">
          <SectionLabel>Accessibility & preferences</SectionLabel>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {A11Y_GROUPS.map(group => {
            const GIcon = group.icon;
            return (
              <BentoCard key={group.title} className={`p-5 bg-gradient-to-br ${group.color} via-white to-white`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center">
                    <GIcon className={`h-3.5 w-3.5 ${group.tint}`} strokeWidth={2.3} />
                  </div>
                  <p className="text-sm font-black text-gray-900">{group.title}</p>
                </div>
                <div className="space-y-1">
                  {group.toggles.map(({ key, label, icon: Icon }) => {
                    const enabled = getA11y(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleA11y(key)}
                        role="switch"
                        aria-checked={enabled}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all cursor-pointer ${
                          enabled ? 'bg-white shadow-sm border border-gray-200/60' : 'hover:bg-white/60 border border-transparent'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${enabled ? group.tint : 'text-gray-400'}`} strokeWidth={2.2} />
                        <span className={`flex-1 text-left text-xs font-semibold ${enabled ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
                        <div className={`relative flex-shrink-0 h-4 w-7 rounded-full transition-colors ${enabled ? 'bg-sky-600' : 'bg-gray-200'}`}>
                          <span
                            className={`absolute top-0.5 left-0.5 h-3 w-3 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-3' : 'translate-x-0'}`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </BentoCard>
            );
          })}
        </div>
      </motion.section>

      {/* ─── Account row — 4 quick actions ───────────────────────────── */}
      <motion.section {...fadeUp(0.18)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AccountTile icon={User}   label="Profile"       onClick={() => navigate('/settings')} />
        <AccountTile icon={Bell}   label="Notifications" onClick={() => navigate('/settings')} />
        <AccountTile icon={Shield} label="Privacy"       onClick={() => navigate('/settings')} />
        <AccountTile icon={LogOut} label="Sign out"      onClick={handleSignOut} destructive />
      </motion.section>

    </div>
  );
}

// ─── Mini stat card (bento row 2) ──────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, tint }) {
  const tints = {
    sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',     grad: 'from-sky-100/40' },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  grad: 'from-purple-100/40' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', grad: 'from-emerald-100/40' },
    orange:  { bg: 'bg-orange-50',  icon: 'text-orange-600',  grad: 'from-orange-100/40' },
  };
  const t = tints[tint] || tints.sky;
  return (
    <BentoCard className={`p-5 bg-gradient-to-br ${t.grad} via-white to-white`}>
      <div className={`h-9 w-9 rounded-xl ${t.bg} flex items-center justify-center mb-3 ring-1 ring-white shadow-sm`}>
        <Icon className={`h-4 w-4 ${t.icon}`} strokeWidth={2.2} />
      </div>
      <p className="text-2xl font-black text-gray-900 tabular-nums tracking-tight leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 font-semibold mt-1.5 uppercase tracking-wider">{label}</p>
    </BentoCard>
  );
}

// ─── Account tile ──────────────────────────────────────────────────────────
function AccountTile({ icon: Icon, label, onClick, destructive }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-200/70 rounded-2xl hover:shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all cursor-pointer ${destructive ? 'hover:border-red-200' : 'hover:border-gray-300'}`}
    >
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${destructive ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 group-hover:bg-sky-50 group-hover:text-sky-600'} transition-colors`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.3} />
      </div>
      <span className={`flex-1 text-left text-sm font-bold ${destructive ? 'text-red-600' : 'text-gray-800'}`}>{label}</span>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}
