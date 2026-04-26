import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Flame, Trophy, ArrowRight, Plus, Library,
  CreditCard, Mic, Brain, ChevronRight, FileText,
  FlaskConical, Headphones, Target, Clock, Layers, ClipboardCheck, GraduationCap
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useDocumentStore from '../store/documentStore';
import * as analyticsService from '../services/analyticsService';
import * as flashcardService from '../services/flashcardService';
import { useSubscription } from '../hooks/useSubscription';
import { SkeletonCard } from '../components/feedback/Skeleton';
import PremiumBadge from '../components/common/PremiumBadge';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
});

function BentoCard({ className = '', children, as: Comp = 'div', ...props }) {
  return (
    <Comp
      {...props}
      className={`relative bg-white border border-gray-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden ${className}`}
    >
      {children}
    </Comp>
  );
}

export default function Study() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const { isPro } = useSubscription();
  const [overview, setOverview] = useState(null);
  const [dueCards, setDueCards] = useState(0);
  const [loading, setLoading] = useState(true);

  const name = profile?.displayName?.split(' ')[0] || 'there';

  useEffect(() => {
    fetchDocuments();
    Promise.all([
      analyticsService.getOverview().catch(() => null),
      flashcardService.listFlashcards().catch(() => []),
    ]).then(([ov, decks]) => {
      setOverview(ov || {});
      const due = Array.isArray(decks)
        ? decks.reduce((acc, d) => acc + (d.dueCount || 0), 0)
        : 0;
      setDueCards(due);
    }).finally(() => setLoading(false));
  }, [fetchDocuments]);

  const streak = overview?.streak?.currentStreak || 0;
  const level = overview?.performance?.level || 1;
  const lastDoc = documents.find(d => d.status === 'ready');
  const readyCount = documents.filter(d => d.status === 'ready').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4 md:space-y-5">

      {/* ─── GREETING STRIP ─────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600 mb-1">Today at a glance</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
            {greeting()}, {name}.
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {readyCount > 0
              ? `${readyCount} document${readyCount !== 1 ? 's' : ''} in your library${dueCards > 0 ? ` · ${dueCards} card${dueCards !== 1 ? 's' : ''} due` : ''}.`
              : 'Add your first document to get started.'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200/70 rounded-full px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <Flame className="h-4 w-4 text-orange-500" strokeWidth={2.3} />
              <span className="text-sm font-black text-gray-900 tabular-nums">{streak}</span>
              <span className="text-xs text-gray-500 font-semibold">day{streak !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200/70 rounded-full px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <Trophy className="h-4 w-4 text-sky-500" strokeWidth={2.3} />
            <span className="text-xs font-bold text-gray-600">Level</span>
            <span className="text-sm font-black text-gray-900 tabular-nums">{level}</span>
          </div>
        </div>
      </motion.div>

      {/* ─── HERO PICKUP + DUE TODAY (bento 8/4) ─────────────────────── */}
      <motion.section {...fadeUp(0.05)} className="grid grid-cols-12 gap-4">
        {/* Pickup card — 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          {loading ? (
            <SkeletonCard />
          ) : lastDoc ? (
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/document/${lastDoc.id}`)}
              className="w-full text-left group relative"
            >
              <BentoCard className="p-7 bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 border-sky-700 shadow-[0_8px_30px_rgba(14,165,233,0.25)] group-hover:shadow-[0_12px_40px_rgba(14,165,233,0.35)] transition-shadow">
                {/* Decorative gradient orbs */}
                <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-gradient-to-br from-sky-300/20 to-transparent blur-2xl" />
                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-gradient-to-tr from-blue-400/10 to-transparent blur-2xl" />

                <div className="relative flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200 mb-2">Continue studying</p>
                    <h2 className="text-2xl font-black text-white leading-tight line-clamp-2 mb-2">
                      {lastDoc.originalName || lastDoc.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-xs font-bold text-white">
                        <BookOpen className="h-3 w-3" strokeWidth={2.3} />
                        {lastDoc.moduleCount || 0} modules
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-100">
                        <Clock className="h-3 w-3" />
                        Last opened recently
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 group-hover:bg-white/30 group-hover:scale-105 transition-all">
                    <ArrowRight className="h-6 w-6 text-white" strokeWidth={2.3} />
                  </div>
                </div>
              </BentoCard>
            </motion.button>
          ) : (
            <button
              onClick={() => navigate('/library/new')}
              className="w-full h-full min-h-[180px] text-left border-2 border-dashed border-gray-300 hover:border-sky-400 bg-gradient-to-br from-gray-50/60 to-white hover:from-sky-50/40 hover:to-white rounded-2xl p-7 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-5 h-full">
                <div className="h-14 w-14 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                  <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">Add your first document</p>
                  <p className="text-sm text-gray-500 mt-0.5">Upload a PDF, paste a URL, or drop in notes.</p>
                </div>
              </div>
            </button>
          )}
          
          {/* ─── STUDY MODES LAUNCHPAD ───────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StudyModeMiniTile
              icon={Layers}
              label="Flashcards"
              color="bg-blue-500"
              onClick={() => navigate('/flashcards')}
            />
            <StudyModeMiniTile
              icon={ClipboardCheck}
              label="Quiz"
              color="bg-emerald-500"
              onClick={() => navigate('/quiz')}
            />
            <StudyModeMiniTile
              icon={GraduationCap}
              label="Exam"
              color="bg-purple-600"
              onClick={() => navigate('/exam')}
            />
          </div>
        </div>

        {/* Due today + Live tutor — 4 cols stacked */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
          {/* Due today */}
          <BentoCard className="p-5 bg-gradient-to-br from-indigo-50/50 via-white to-white group hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-shadow cursor-pointer"
            onClick={() => dueCards > 0 ? navigate('/flashcards') : navigate('/library')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-indigo-600" strokeWidth={2.3} />
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-1">Due today</p>
            {dueCards > 0 ? (
              <>
                <p className="text-xl font-black text-gray-900 tabular-nums leading-none">{dueCards} cards</p>
                <p className="text-xs text-gray-500 mt-1">Spaced repetition review</p>
              </>
            ) : (
              <>
                <p className="text-xl font-black text-gray-900 leading-none">All clear</p>
                <p className="text-xs text-gray-500 mt-1">Nothing due — well done.</p>
              </>
            )}
          </BentoCard>

          {/* Live tutor */}
          <BentoCard
            onClick={() => navigate('/chat?mode=teach')}
            className="relative p-5 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 border-violet-500 text-white cursor-pointer group overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                <Mic className="h-4 w-4 text-white" strokeWidth={2.3} />
              </div>
              {!isPro && <PremiumBadge variant="chip" tier="pro" />}
            </div>
            <p className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-violet-100 mb-1">Live tutor</p>
            <p className="relative text-xl font-black leading-none">Talk to Sage</p>
            <p className="relative text-xs text-violet-100 mt-1">Voice-powered AI session</p>
          </BentoCard>
        </div>
      </motion.section>

      {/* ─── QUICK ACTIONS (bento 4-column) ──────────────────────────── */}
      <motion.section {...fadeUp(0.1)}>
        <div className="flex items-center gap-2 mb-2 px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Quick actions</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionTile
            icon={Plus}
            label="New document"
            sub="Upload, URL, paste"
            tint="sky"
            onClick={() => navigate('/library/new')}
          />
          <ActionTile
            icon={Library}
            label="Browse library"
            sub={`${readyCount} ready`}
            tint="emerald"
            onClick={() => navigate('/library')}
          />
          <ActionTile
            icon={Headphones}
            label="Today's podcast"
            sub="AI audio digest"
            tint="amber"
            onClick={() => navigate(lastDoc ? `/document/${lastDoc.id}?action=podcast` : '/library')}
          />
          <ActionTile
            icon={FlaskConical}
            label="Physics Lab"
            sub="Interactive simulations"
            tint="purple"
            pro={!isPro}
            onClick={() => navigate('/simulations')}
          />
        </div>
      </motion.section>

      {/* ─── RECENT DOCUMENTS ────────────────────────────────────────── */}
      {documents.filter(d => d.status === 'ready').length > 1 && (
        <motion.section {...fadeUp(0.15)}>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Recent documents</p>
            <button
              onClick={() => navigate('/library')}
              className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <BentoCard className="divide-y divide-gray-100">
            {documents.filter(d => d.status === 'ready').slice(0, 4).map(doc => (
              <button
                key={doc.id}
                onClick={() => navigate(`/document/${doc.id}`)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors cursor-pointer group"
              >
                <div className="h-9 w-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-gray-500" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-gray-900 truncate">{doc.originalName || doc.title}</p>
                  {doc.moduleCount > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{doc.moduleCount} modules</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </BentoCard>
        </motion.section>
      )}
    </div>
  );
}

// ─── Action tile with premium variant ──────────────────────────────────────
function ActionTile({ icon: Icon, label, sub, tint, onClick, pro }) {
  const tints = {
    sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',     grad: 'from-sky-100/50' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', grad: 'from-emerald-100/50' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   grad: 'from-amber-100/50' },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  grad: 'from-purple-100/50' },
  };
  const t = tints[tint] || tints.sky;
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-3 bg-white border border-gray-200/70 rounded-2xl p-5 hover:shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all cursor-pointer text-left overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${t.grad} via-white to-white opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between w-full">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.bg} ring-1 ring-white shadow-sm group-hover:scale-105 transition-transform`}>
          <Icon className={`h-4 w-4 ${t.icon}`} strokeWidth={2.3} />
        </div>
        {pro && <PremiumBadge variant="chip" tier="pro" />}
      </div>
      <div className="relative">
        <p className="text-sm font-black text-gray-900 leading-tight">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{sub}</p>
      </div>
    </button>
  );
}

// ─── Study mode mini tiles ────────────────────────────────────────────────
function StudyModeMiniTile({ icon: Icon, label, color, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-gray-300 transition-all text-left"
    >
      <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-current/20 flex-shrink-0`}>
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight leading-none truncate">{label}</p>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Launch</p>
      </div>
    </motion.button>
  );
}
