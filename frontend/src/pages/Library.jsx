import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Trash2, CheckCircle, Clock, Plus, Search,
  Link2, StickyNote, BookOpen, ChevronRight, ChevronLeft, Loader2, Layers,
  ShieldCheck, Shield, ShieldAlert, Star, FolderOpen, TrendingUp,
  ArrowRight, Filter, Grid3x3, List as ListIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useDocumentStore from '../store/documentStore';
import useCourseStore from '../store/courseStore';
import { listModules } from '../services/moduleService';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/paywall/UpgradeModal';
import StatusPill from '../components/feedback/StatusPill';
import EmptyState from '../components/feedback/EmptyState';
import ProcessingCard from '../components/feedback/ProcessingCard';
import { SkeletonList } from '../components/feedback/Skeleton';

const sourceIcon = { file: FileText, url: Link2, note: StickyNote, topic: Search };
const sourceTint = {
  file: { bg: 'bg-slate-100', icon: 'text-slate-600', accent: 'from-slate-500/10 to-slate-500/5' },
  url: { bg: 'bg-blue-100', icon: 'text-blue-600', accent: 'from-blue-500/10 to-blue-500/5' },
  note: { bg: 'bg-amber-100', icon: 'text-amber-600', accent: 'from-amber-500/10 to-amber-500/5' },
  topic: { bg: 'bg-purple-100', icon: 'text-purple-600', accent: 'from-purple-500/10 to-purple-500/5' },
};

const qualityConfig = {
  trusted: { icon: ShieldCheck, label: 'Trusted', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200/70' },
  acceptable: { icon: Shield, label: 'Acceptable', cls: 'text-blue-700 bg-blue-50 border-blue-200/70' },
  unverified: { icon: ShieldAlert, label: 'Unverified', cls: 'text-amber-700 bg-amber-50 border-amber-200/70' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Needs attention' },
];

// ─── Reusable bento card wrapper ────────────────────────────────────────────
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

export default function Library() {
  const navigate = useNavigate();
  const {
    documents, loading, uploads,
    fetchDocuments, deleteDocument, refreshDocument, togglePrimary,
  } = useDocumentStore();
  const { courses, fetchCourses } = useCourseStore();
  const { docLimit, docLimitLabel, docCount, isAtDocLimit, isUnlimited } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [activeCourse, setActiveCourse] = useState('all');
  const processingIdsRef = useRef(new Set());
  const pendingRedirectRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    fetchCourses();
  }, [fetchDocuments, fetchCourses]);

  useEffect(() => {
    const processing = (documents || []).filter(d => d.status === 'processing');
    const processingIds = new Set(processing.map(d => d.id));
    for (const id of processingIdsRef.current) {
      if (!processingIds.has(id)) {
        const doc = (documents || []).find(d => d.id === id);
        if (doc?.status === 'ready' && !pendingRedirectRef.current) {
          pendingRedirectRef.current = id;
        }
      }
    }
    processingIdsRef.current = processingIds;
    if (processing.length === 0 && !pendingRedirectRef.current) return;
    const interval = setInterval(async () => {
      processing.forEach(doc => refreshDocument(doc.id));
      if (pendingRedirectRef.current) {
        try {
          const { modules } = await listModules(pendingRedirectRef.current);
          if (modules?.length > 0) {
            const id = pendingRedirectRef.current;
            pendingRedirectRef.current = null;
            navigate(`/document/${id}`);
          }
        } catch { /* retry */ }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [documents, refreshDocument, navigate]);

  const handleDelete = useCallback(async (id, e) => {
    e?.stopPropagation();
    if (window.confirm('Delete this document? This cannot be undone.')) {
      await deleteDocument(id);
    }
  }, [deleteDocument]);

  const handleTogglePrimary = useCallback(async (id, current, e) => {
    e?.stopPropagation();
    await togglePrimary(id, !current);
  }, [togglePrimary]);

  // Stats
  const stats = useMemo(() => {
    const docs = documents || [];
    return {
      total: docs.length,
      ready: docs.filter(d => d.status === 'ready').length,
      processing: docs.filter(d => d.status === 'processing').length,
      failed: docs.filter(d => d.status === 'failed').length,
      primary: docs.filter(d => d.isPrimary).length,
    };
  }, [documents]);

  // Recently opened — last 5 ready docs
  const recent = useMemo(() => (
    (documents || [])
      .filter(d => d.status === 'ready')
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 5)
  ), [documents]);

  // Filtering
  const filtered = useMemo(() => {
    return (documents || []).filter(doc => {
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesCourse = activeCourse === 'all' || doc.courseId === activeCourse;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (doc.originalName || doc.title || '').toLowerCase().includes(q) ||
        (doc.url || '').toLowerCase().includes(q);
      return matchesStatus && matchesCourse && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt || b.uploadDate || 0) - new Date(a.createdAt || a.uploadDate || 0));
  }, [documents, statusFilter, activeCourse, search]);

  const courseWithCounts = useMemo(() => {
    const map = {};
    (documents || []).forEach(d => {
      if (d.courseId) map[d.courseId] = (map[d.courseId] || 0) + 1;
    });
    return courses.filter(c => map[c.id]).map(c => ({ ...c, count: map[c.id] }));
  }, [courses, documents]);

  const activeUploads = Object.entries(uploads || {});
  const isProcessingAny = stats.processing > 0 || activeUploads.some(([, u]) => ['uploading', 'registering'].includes(u.status));
  const quotaPct = isUnlimited ? 0 : Math.min((docCount / docLimit) * 100, 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5 md:space-y-6">
      {showUpgradeModal && <UpgradeModal feature="documents" onClose={() => setShowUpgradeModal(false)} />}

      {/* ─── Header bento row ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-12 gap-4"
      >
        {/* Title + search spanning 8 cols */}
        <BentoCard className="col-span-12 lg:col-span-8 p-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600 mb-1.5">Your knowledge base</p>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Library</h1>
              <p className="text-sm text-gray-500 mt-1.5">Everything you've uploaded, linked, or generated.</p>
            </div>
            <button
              onClick={() => isAtDocLimit ? setShowUpgradeModal(true) : navigate('/library/new')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl text-sm font-bold transition-all shadow-[0_1px_2px_rgba(14,165,233,0.2),0_4px_14px_rgba(14,165,233,0.25)] hover:shadow-[0_1px_2px_rgba(14,165,233,0.25),0_6px_20px_rgba(14,165,233,0.35)] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add document
            </button>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or URL…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/80 text-sm bg-gray-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-400 transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center bg-gray-100/70 rounded-xl p-0.5 border border-gray-200/70">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </BentoCard>

        {/* Quota card — 4 cols */}
        <BentoCard className="col-span-12 lg:col-span-4 p-6 bg-gradient-to-br from-slate-50/80 to-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Storage</p>
            <Layers className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-3xl font-black text-gray-900 tabular-nums tracking-tight">{docCount}</span>
            <span className="text-sm text-gray-400 font-semibold">/ {isUnlimited ? '∞' : docLimitLabel}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {isUnlimited ? 'Unlimited documents' : isAtDocLimit ? "You've reached your limit" : `${docLimit - docCount} slots remaining`}
          </p>
          {!isUnlimited && (
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${quotaPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${isAtDocLimit ? 'bg-gradient-to-r from-red-400 to-red-500' :
                    quotaPct > 75 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                      'bg-gradient-to-r from-sky-400 to-sky-500'
                  }`}
              />
            </div>
          )}
          {!isUnlimited && isAtDocLimit && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="mt-3 text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              Upgrade for more <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </BentoCard>
      </motion.section>

      {/* ─── Mini stats row ──────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatTile icon={BookOpen} label="Ready to study" value={stats.ready} tint="emerald" />
        <StatTile icon={Loader2} label="In progress" value={stats.processing} tint="amber" pulsing={stats.processing > 0} />
        <StatTile icon={Star} label="Starred" value={stats.primary} tint="yellow" />
        <StatTile icon={TrendingUp} label="Total" value={stats.total} tint="sky" />
      </motion.section>

      {/* ─── Continue studying carousel ──────────────────────────────── */}
      {recent.length > 0 && (
        <RecentCarousel
          recent={recent}
          onOpen={(id) => navigate(`/document/${id}`)}
        />
      )}

      {/* ─── Collections (courses) ───────────────────────────────────── */}
      {courseWithCounts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Collections</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <CollectionChip active={activeCourse === 'all'} label="All" count={stats.total} onClick={() => setActiveCourse('all')} />
            {courseWithCounts.map(c => (
              <CollectionChip key={c.id} active={activeCourse === c.id} label={c.name} count={c.count} onClick={() => setActiveCourse(c.id)} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ─── Filter pills ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${statusFilter === f.value
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200/80 hover:border-gray-300 hover:text-gray-800'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 font-medium tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
        </p>
      </motion.section>


      {/* ─── Documents grid / list ─────────────────────────────────── */}
      {loading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <BentoCard className="py-4">
          <EmptyState
            icon={search || statusFilter !== 'all' ? Search : BookOpen}
            title={search || statusFilter !== 'all' ? 'Nothing matches' : 'Your library is ready'}
            body={
              search || statusFilter !== 'all'
                ? 'Try a different search or clear the filter.'
                : 'Add your first document — upload a PDF, paste a URL, or drop in notes.'
            }
            primaryAction={
              !(search || statusFilter !== 'all')
                ? { label: 'Add document', icon: Plus, onClick: () => navigate('/library/new') }
                : undefined
            }
            secondaryAction={
              search || statusFilter !== 'all'
                ? { label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); setActiveCourse('all'); } }
                : undefined
            }
          />
        </BentoCard>
      ) : view === 'grid' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((doc, i) => (
            ['uploading', 'registering', 'processing'].includes(doc.status) ? (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.3 }}
              >
                <ProcessingCard
                  documentId={doc.id}
                  status={doc.status}
                  metadata={doc.extractedMetadata}
                  onReady={() => refreshDocument(doc.id)}
                />
              </motion.div>
            ) : (
              <DocCard
                key={doc.id}
                doc={doc}
                index={i}
                onOpen={() => navigate(`/document/${doc.id}`)}
                onDelete={e => handleDelete(doc.id, e)}
                onTogglePrimary={e => handleTogglePrimary(doc.id, doc.isPrimary, e)}
              />
            )
          ))}
        </motion.div>
      ) : (
        <BentoCard className="divide-y divide-gray-100">
          {filtered.map(doc => (
            ['uploading', 'registering', 'processing'].includes(doc.status) ? (
              <div key={doc.id} className="p-4 border-b border-gray-100 last:border-0">
                <ProcessingCard
                  documentId={doc.id}
                  status={doc.status}
                  metadata={doc.extractedMetadata}
                  onReady={() => refreshDocument(doc.id)}
                />
              </div>
            ) : (
              <DocRow
                key={doc.id}
                doc={doc}
                onOpen={() => navigate(`/document/${doc.id}`)}
                onDelete={e => handleDelete(doc.id, e)}
                onTogglePrimary={e => handleTogglePrimary(doc.id, doc.isPrimary, e)}
              />
            )
          ))}
        </BentoCard>
      )}
    </div>
  );
}

// ─── Stat tile ──────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, tint, pulsing }) {
  const tints = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'ring-yellow-100' },
    sky: { bg: 'bg-sky-50', icon: 'text-sky-600', ring: 'ring-sky-100' },
  };
  const t = tints[tint] || tints.sky;
  return (
    <BentoCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`relative h-9 w-9 rounded-xl flex items-center justify-center ${t.bg} ring-1 ${t.ring}`}>
          <Icon className={`h-4 w-4 ${t.icon}`} strokeWidth={2.2} />
          {pulsing && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse ring-2 ring-white" />}
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 tabular-nums tracking-tight leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 font-semibold mt-1.5 uppercase tracking-wider">{label}</p>
    </BentoCard>
  );
}

// ─── Recent carousel with arrows (no horizontal scroll) ────────────────────
function RecentCarousel({ recent, onOpen }) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerPage(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const totalPages = Math.max(1, Math.ceil(recent.length / perPage));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * perPage;
  const visible = recent.slice(start, start + perPage);
  const canPrev = clampedPage > 0;
  const canNext = clampedPage < totalPages - 1;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-0.5">Pick up where you left off</p>
          <h2 className="text-sm font-bold text-gray-900">Recent</h2>
        </div>
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <span className="text-[11px] font-bold text-gray-400 tabular-nums">
              {clampedPage + 1} / {totalPages}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={!canPrev}
              aria-label="Previous"
              className="h-8 w-8 rounded-full bg-white border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.3} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={!canNext}
              aria-label="Next"
              className="h-8 w-8 rounded-full bg-white border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.3} />
            </button>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden">
        <motion.div
          key={clampedPage}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}
        >
          {visible.map(doc => (
            <RecentCard key={doc.id} doc={doc} onClick={() => onOpen(doc.id)} />
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

function RecentCard({ doc, onClick }) {
  const SrcIcon = sourceIcon[doc.sourceType] || FileText;
  const tint = sourceTint[doc.sourceType] || sourceTint.file;
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="text-left group cursor-pointer w-full"
    >
      <BentoCard className={`h-full p-5 bg-gradient-to-br ${tint.accent} hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-shadow`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${tint.bg}`}>
            <SrcIcon className={`h-4 w-4 ${tint.icon}`} strokeWidth={2.2} />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5">
          {doc.originalName || doc.title || 'Untitled'}
        </p>
        <p className="text-[11px] text-gray-500 font-medium">
          {doc.moduleCount ? `${doc.moduleCount} modules` : 'Open to continue'}
        </p>
      </BentoCard>
    </motion.button>
  );
}

// ─── Collection chip ────────────────────────────────────────────────────────
function CollectionChip({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${active
          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
          : 'bg-white text-gray-700 border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
        }`}
    >
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {count}
      </span>
    </button>
  );
}

// ─── Grid card ──────────────────────────────────────────────────────────────
function DocCard({ doc, index, onOpen, onDelete, onTogglePrimary }) {
  const SrcIcon = sourceIcon[doc.sourceType] || FileText;
  const tint = sourceTint[doc.sourceType] || sourceTint.file;
  const quality = qualityConfig[doc.qualityTier];
  const QIcon = quality?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.3 }}
      whileHover={{ y: -2 }}
      onClick={onOpen}
      className="group cursor-pointer"
    >
      <BentoCard className="h-full hover:shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all">
        {/* Accent gradient strip */}
        <div className={`h-1 bg-gradient-to-r ${tint.accent.replace('from-', 'from-').replace('/10', '/40').replace('/5', '/20')}`} />

        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${tint.bg} ring-1 ring-white shadow-sm`}>
              <SrcIcon className={`h-5 w-5 ${tint.icon}`} strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onTogglePrimary}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${doc.isPrimary
                    ? 'text-amber-500 hover:bg-amber-50'
                    : 'text-gray-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                  }`}
                aria-label={doc.isPrimary ? 'Remove from primary' : 'Mark as primary'}
              >
                <Star className={`h-3.5 w-3.5 ${doc.isPrimary ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-1.5">
            {doc.originalName || doc.title || 'Untitled'}
          </h3>
          {doc.url && (
            <p className="text-[11px] text-gray-400 truncate mb-3">{doc.url}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-3">
            <StatusPill status={doc.status} />
            {quality && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${quality.cls}`}>
                <QIcon className="h-2.5 w-2.5" />
                {quality.label}
              </span>
            )}
            {doc.extractedMetadata?.modulesStatus === 'generating' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Generating modules...
              </span>
            ) : doc.moduleCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 tabular-nums">
                <Layers className="h-2.5 w-2.5" />
                {doc.moduleCount} modules
              </span>
            ) : null}
          </div>
        </div>
      </BentoCard>
    </motion.div>
  );
}

// ─── List row ───────────────────────────────────────────────────────────────
function DocRow({ doc, onOpen, onDelete, onTogglePrimary }) {
  const SrcIcon = sourceIcon[doc.sourceType] || FileText;
  const tint = sourceTint[doc.sourceType] || sourceTint.file;
  const quality = qualityConfig[doc.qualityTier];
  const QIcon = quality?.icon;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onOpen}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors cursor-pointer"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tint.bg} flex-shrink-0`}>
        <SrcIcon className={`h-4 w-4 ${tint.icon}`} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-900 truncate">
            {doc.originalName || doc.title || doc.url || 'Untitled'}
          </p>
          {quality && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${quality.cls}`}>
              <QIcon className="h-2.5 w-2.5" />
              {quality.label}
            </span>
          )}
        </div>
        {doc.url && <p className="text-[11px] text-gray-400 truncate mt-0.5">{doc.url}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusPill status={doc.status} />
        <button
          onClick={onTogglePrimary}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${doc.isPrimary
              ? 'text-amber-500'
              : 'text-gray-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            }`}
        >
          <Star className={`h-3.5 w-3.5 ${doc.isPrimary ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  );
}
