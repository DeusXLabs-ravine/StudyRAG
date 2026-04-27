import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Trash2, AlertCircle, CheckCircle, Clock, X, Brain, Sparkles, Upload, Link2, StickyNote, Star, Globe, Shield, ShieldAlert, ShieldCheck, BookOpen, Search, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import useDocumentStore from '../store/documentStore';
import useCourseStore from '../store/courseStore';
import { deleteModulesByDocument } from '../services/moduleService';

import ProgressBar from '../components/common/ProgressBar';
import { FileUpload } from '@/components/ui/file-upload';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/paywall/UpgradeModal';
import { TextLoop } from '@/components/ui/text-loop';
import { MorphingSquare } from '../components/ui/morphing-square';
import { AILoader } from '../components/ui/ai-loader';

const statusConfig = {
  uploading: { icon: Upload, color: 'text-blue-600 bg-blue-50', label: 'Uploading' },
  registering: { icon: Clock, color: 'text-indigo-600 bg-indigo-50', label: 'Registering' },
  processing: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Processing' },
  ready: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Ready' },
  failed: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Failed' },
};

const sourceTypeConfig = {
  file: { icon: FileText, label: 'File', color: 'text-gray-500' },
  url: { icon: Link2, label: 'URL', color: 'text-blue-500' },
  note: { icon: StickyNote, label: 'Note', color: 'text-amber-500' },
  topic: { icon: Search, label: 'Topic', color: 'text-purple-500' },
};

const qualityBadgeConfig = {
  trusted: { icon: ShieldCheck, label: 'Trusted', color: 'text-green-600 bg-green-50 border-green-200' },
  acceptable: { icon: Shield, label: 'Acceptable', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  unverified: { icon: ShieldAlert, label: 'Unverified', color: 'text-amber-600 bg-amber-50 border-amber-200' },
};

const uploadingMessages = [
  "Uploading your document to the cloud...",
  "Securely transferring your file...",
  "Almost there, hang tight...",
  "Great choice of study material!",
  "Sending bytes at the speed of learning...",
  "Your file is on its way...",
];

const processingMessages = [
  "AI is reading through your document...",
  "Extracting key concepts and ideas...",
  "Breaking content into smart learning modules...",
  "Generating comprehension questions...",
  "Identifying the most important topics...",
  "Building your personalized study path...",
  "Creating flashcard-ready key terms...",
  "Analyzing document structure and headings...",
  "Connecting related concepts together...",
  "Preparing your learning experience...",
  "This is going to be a great study session!",
  "Finding real-world examples and context...",
  "Almost done: polishing your modules...",
];

const processingStepsConfig = [
  { id: 'extracting', label: 'Extracting Knowledge', icon: FileText },
  { id: 'indexing', label: 'Building Search Index', icon: Search },
  { id: 'generating_modules', label: 'Crafting Core Modules', icon: Brain },
  { id: 'generating_remaining', label: 'Synthesizing Curriculum', icon: Sparkles },
  { id: 'researching', label: 'Deep Dive Research', icon: Globe },
  { id: 'enriching', label: 'Finalizing Resources', icon: FolderOpen },
];

const getStepIndex = (step) => {
  const idx = processingStepsConfig.findIndex(s => s.id === step);
  return idx === -1 ? 0 : idx;
};

const tabs = [
  { id: 'file', label: 'Upload File', icon: Upload },
  { id: 'url', label: 'Add URL', icon: Link2 },
  { id: 'note', label: 'Add Notes', icon: StickyNote },
  { id: 'topic', label: 'Study Topic', icon: Search },
];

export default function Documents() {
  const navigate = useNavigate();
  const {
    documents, loading, error, uploads,
    fetchDocuments, uploadDocument, deleteDocument, refreshDocument, clearUploadError,
    addUrl, addNote, togglePrimary, addTopic,
  } = useDocumentStore();

  const { courses, fetchCourses } = useCourseStore();
  const { docLimit, docLimitLabel, docCount, isAtDocLimit, isUnlimited } = useSubscription();
  const [showDocUpgradeModal, setShowDocUpgradeModal] = useState(false);

  const [activeTab, setActiveTab] = useState('file');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState(new Set());

  // Track which doc IDs were processing so we can detect the transition to ready
  const processingIdsRef = useRef(new Set());

  useEffect(() => {
    fetchDocuments();
    fetchCourses();
  }, [fetchDocuments, fetchCourses]);



  // Poll processing documents and auto-redirect when modules are ready
  useEffect(() => {
    const currentProcessing = (documents || []).filter(d => d.status === 'processing');
    const currentProcessingIds = new Set(currentProcessing.map(d => d.id));

    // Check if any previously-processing doc is now ready
    for (const id of processingIdsRef.current) {
      if (!currentProcessingIds.has(id)) {
        const doc = (documents || []).find(d => d.id === id);
        if (doc && doc.status === 'ready') {
          // Doc is ready — redirect immediately!
          // The Learn page will handle the 'generating modules' state
          navigate(`/learn/${id}`);
        }
      }
    }

    // Update tracking set
    processingIdsRef.current = currentProcessingIds;

    if (currentProcessing.length === 0) return;

    const interval = setInterval(async () => {
      // Poll processing docs for status changes
      currentProcessing.forEach(doc => refreshDocument(doc.id));
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, refreshDocument, navigate]);

  // Track the elapsed time for processing documents to show the 3-minute warning
  const [processingTimeElapsed, setProcessingTimeElapsed] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newElapsed = {};
      (documents || []).forEach(doc => {
        if (doc.status === 'processing' && doc.uploadDate) {
          const elapsed = (now - new Date(doc.uploadDate)) / 1000;
          newElapsed[doc.id] = elapsed;
        }
      });
      setProcessingTimeElapsed(newElapsed);
    }, 10000);
    return () => clearInterval(interval);
  }, [documents]);

  const handleFilesSelected = useCallback((newFiles) => {
    if (isAtDocLimit) { setShowDocUpgradeModal(true); return; }
    newFiles.forEach(file =>
      uploadDocument(file).catch(err => {
        toast.error(err?.message || 'Upload failed. Please try again.');
      })
    );
  }, [uploadDocument, isAtDocLimit]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      await addUrl(urlInput.trim());
      setUrlInput('');
    } catch {
      // error is set in store
    } finally {
      setUrlLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteLoading(true);
    try {
      await addNote(noteTitle.trim(), noteContent.trim());
      setNoteTitle('');
      setNoteContent('');
    } catch {
      // error is set in store
    } finally {
      setNoteLoading(false);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    setTopicLoading(true);
    try {
      await addTopic(topicInput.trim(), topicDesc.trim());
      toast.success(`Researching "${topicInput.trim()}" — your course will be ready in a minute or two.`);
      setTopicInput('');
      setTopicDesc('');
    } catch {
      toast.error("Couldn't start the research. Lots of people are studying right now — please try again in a moment.");
    } finally {
      setTopicLoading(false);
    }
  };

  const toggleCourseExpanded = (courseId) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const handleTogglePrimary = async (id, current) => {
    try {
      await togglePrimary(id, !current);
    } catch {
      // error handled in store
    }
  };

  const activeUploads = Object.entries(uploads);
  const hasUploading = activeUploads.some(([, u]) => u.status === 'uploading');
  const hasRegistering = activeUploads.some(([, u]) => u.status === 'registering');
  const processingDocs = (documents || []).filter(d => d.status === 'processing');
  const showProcessingBanner = processingDocs.length > 0 || hasRegistering;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {showDocUpgradeModal && (
        <UpgradeModal feature="documents" onClose={() => setShowDocUpgradeModal(false)} />
      )}
      <div className="mb-8 md:mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Document Library</h1>
            <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Manage study materials: upload files, add web links, or type notes.</p>
          </div>
          {/* Document quota */}
          <div className="flex flex-col items-end gap-1 min-w-[120px]">
            <span className="text-xs font-bold text-gray-500">
              {isUnlimited ? `${docCount} documents • Unlimited access` : `${docCount} / ${docLimitLabel} documents`}
            </span>
            {!isUnlimited && (
              <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isAtDocLimit ? 'bg-red-400' : docCount / docLimit > 0.75 ? 'bg-amber-400' : 'bg-primary'}`}
                  style={{ width: `${Math.min((docCount / docLimit) * 100, 100)}%` }}
                />
              </div>
            )}
            {!isUnlimited && isAtDocLimit && (
              <button
                onClick={() => setShowDocUpgradeModal(true)}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Upgrade for more
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed input area */}
      <div className="sleek-card mb-8 overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${isActive
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-2">
          {activeTab === 'file' && (
            <div className="border-dashed border-2 border-gray-200 hover:border-primary/50 transition-all rounded-xl overflow-hidden">
              <FileUpload onChange={handleFilesSelected} />
            </div>
          )}

          {activeTab === 'url' && (
            <form onSubmit={handleAddUrl} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Web URL
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 text-sm font-medium placeholder:text-gray-300 transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={urlLoading || !urlInput.trim()}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3"
                  >
                    {urlLoading ? <MorphingSquare className="w-4 h-4 bg-white" /> : <Link2 className="h-4 w-4" />}
                    Fetch
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-gray-400 font-medium">
                  Paste any URL: academic papers, articles, educational pages. Trusted sources (PubMed, .edu, NIH, etc.) are prioritized.
                </p>
              </div>
            </form>
          )}

          {activeTab === 'note' && (
            <form onSubmit={handleAddNote} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Note Title
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Pharmacology Key Points"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 text-sm font-medium placeholder:text-gray-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Content <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Type or paste your notes here... Markdown is supported."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 text-sm font-medium placeholder:text-gray-300 transition-colors resize-y"
                  required
                />
                <p className="mt-1 text-[10px] text-gray-400 font-medium">
                  {noteContent.length > 0 ? `${noteContent.length.toLocaleString()} characters` : 'Supports markdown formatting'}
                </p>
              </div>
              <button
                type="submit"
                disabled={noteLoading || !noteContent.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {noteLoading ? <MorphingSquare size="sm" /> : <StickyNote className="h-4 w-4" />}
                Save & Process
              </button>
            </form>
          )}

          {activeTab === 'topic' && (
            <form onSubmit={handleAddTopic} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  What do you want to study? <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. React.js Fundamentals, Organic Chemistry, Machine Learning..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 text-sm font-medium placeholder:text-gray-300 transition-colors"
                    maxLength={200}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Add context or specific areas you want to focus on..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 text-sm font-medium placeholder:text-gray-300 transition-colors resize-y"
                />
              </div>
              {topicLoading && <AILoader text="Researching" />}
              <button
                type="submit"
                disabled={topicLoading || !topicInput.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
              >
                {!topicLoading && <Brain className="h-4 w-4" />}
                Research & Create Course
              </button>
              <p className="text-[10px] text-gray-400 font-medium text-center">
                AI will research trusted academic sources and generate a full curriculum for this topic.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── Upload + Processing banners ── */}
      {(activeUploads.length > 0 || showProcessingBanner) && (
        <div className="mb-8 space-y-3">
          {/* Individual file upload bars */}
          {activeUploads.map(([fileName, upload]) => (
            <div key={fileName} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-[13px] font-semibold text-blue-900 truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {upload.status === 'error' ? (
                    <button onClick={() => clearUploadError(fileName)} className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-colors cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">{upload.status}</span>
                  )}
                </div>
              </div>
              {upload.status === 'error' ? (
                <p className="text-[11px] text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">{upload.error}</p>
              ) : (
                <ProgressBar value={upload.progress} max={100} className="h-1.5 rounded-full" />
              )}
            </div>
          ))}

          {/* Uploading hint */}
          {hasUploading && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100 animate-in fade-in duration-400">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Upload className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0 h-5 overflow-hidden">
                <TextLoop interval={3} className="text-[13px] font-medium text-blue-800">
                  {uploadingMessages.map(msg => <span key={msg}>{msg}</span>)}
                </TextLoop>
              </div>
            </div>
          )}

          {/* AI Processing card — the cinematic moment */}
          {showProcessingBanner && !hasUploading && processingDocs.slice(0, 1).map(doc => {
            const currentStep = doc.extractedMetadata?.processingStep || 'extracting';
            const currentStepIdx = getStepIndex(currentStep);
            const isStalled = (processingTimeElapsed[doc.id] || 0) > 180;
            const percent = Math.min(97, Math.round(((currentStepIdx + 0.5) / processingStepsConfig.length) * 100));

            return (
              <div key={doc.id} className="doc-processing-card relative overflow-hidden rounded-2xl border border-violet-200/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 animate-in fade-in duration-700">
                {/* Animated orbs */}
                <div className="doc-processing-orb doc-processing-orb--1" />
                <div className="doc-processing-orb doc-processing-orb--2" />
                <div className="doc-processing-orb doc-processing-orb--3" />

                {/* Header */}
                <div className="relative z-10 flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
                      <div className="relative w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-violet-300" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.18em] mb-0.5">AI Processing</p>
                      <p className="text-[13px] font-semibold text-white truncate" title={doc.originalName}>
                        {doc.originalName}
                      </p>
                    </div>
                  </div>
                  <span className="text-[28px] font-black text-white/20 tabular-nums flex-shrink-0 leading-none">{percent}%</span>
                </div>

                {/* Progress track */}
                <div className="relative z-10 mb-5">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full doc-processing-progress transition-all duration-1000 ease-out"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Step grid */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {processingStepsConfig.map((step, idx) => {
                    const Icon = step.icon;
                    const isDone = idx < currentStepIdx;
                    const isActive = idx === currentStepIdx;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-500 ${
                          isActive
                            ? 'bg-violet-500/20 border border-violet-400/30'
                            : isDone
                            ? 'bg-white/5 border border-white/5'
                            : 'opacity-25 border border-transparent'
                        }`}
                      >
                        <span className={`flex-shrink-0 ${isActive ? 'text-violet-300' : isDone ? 'text-emerald-400' : 'text-white/30'}`}>
                          {isDone
                            ? <CheckCircle className="h-3.5 w-3.5" />
                            : <Icon className={`h-3.5 w-3.5 ${isActive ? 'animate-pulse' : ''}`} />}
                        </span>
                        <span className={`text-[11px] font-medium leading-tight ${isActive ? 'text-violet-100' : isDone ? 'text-white/60' : 'text-white/20'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Rotating message */}
                <div className="relative z-10 mt-4 h-5 overflow-hidden">
                  <TextLoop interval={4} className="text-[11px] text-violet-300/70 font-medium">
                    {processingMessages.map(msg => <span key={msg}>{msg}</span>)}
                  </TextLoop>
                </div>

                {isStalled && (
                  <div className="relative z-10 mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in fade-in duration-500">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-200 leading-relaxed">
                      Taking a bit longer than usual — large documents can take up to 5 minutes. Hang tight!
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-100 text-red-700 p-6 rounded-2xl mb-10 flex items-center gap-4 animate-in shake-in-from-bottom-2 duration-500">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-red-900">System Error</h4>
            <p className="text-sm font-medium opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Course groups */}
      {(courses || []).length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Courses</h2>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{courses.length} Courses</span>
          </div>
          {courses.map(course => (
            <div key={course.id} className="sleek-card overflow-hidden">
              <button
                onClick={() => toggleCourseExpanded(course.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{course.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400">
                      {course.documentCount || 0} sources
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                    <span className={`text-[10px] font-bold ${course.status === 'ready' ? 'text-green-600' : course.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                      {course.status}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                    <span className="text-[10px] font-bold text-primary/60 uppercase">{course.sourceType}</span>
                  </div>
                </div>
                {expandedCourses.has(course.id) ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {expandedCourses.has(course.id) && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                  {course.description && (
                    <p className="text-xs text-gray-500 mb-2">{course.description}</p>
                  )}
                  {/* Recommended textbooks to upload */}
                  {course.config?.recommendedTextbooks?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Recommended: Upload these textbooks</p>
                      {course.config.recommendedTextbooks.map((t, i) => (
                        <p key={i} className="text-xs text-amber-800 font-medium">
                          {t.title}{t.author ? ` by ${t.author}` : ''} {t.required ? '(Required)' : '(Optional)'}
                        </p>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/learn?courseId=${course.id}`)}
                    className="w-full py-2 text-xs font-black text-primary uppercase tracking-widest bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors"
                  >
                    Study This Course
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Stored Documents</h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{(documents || []).length} Sources</span>
        </div>

        {loading && (documents || []).length === 0 ? (
          <div className="sleek-card p-8 md:p-20 flex flex-col items-center justify-center gap-4 text-center">
            <MorphingSquare message="Synchronizing" />
          </div>
        ) : (documents || []).length === 0 ? (
          <div className="sleek-card p-8 md:p-24 text-center group">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 transition-transform group-hover:scale-110 duration-500">
              <FileText className="h-8 w-8 md:h-10 md:w-10 opacity-30" />
            </div>
            <h3 className="text-lg md:text-xl font-black text-gray-900 mb-2">Your library is empty</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto font-medium">Upload files, add URLs, or type notes above to start building your knowledge base.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {[...(documents || [])].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map((doc, idx) => {
              const status = statusConfig[doc.status] || statusConfig.processing;
              const StatusIcon = status.icon;
              const sourceType = sourceTypeConfig[doc.sourceType] || sourceTypeConfig.file;
              const SourceIcon = sourceType.icon;
              const quality = doc.extractedMetadata?.sourceQuality;
              const qualityBadge = quality ? qualityBadgeConfig[quality] : null;

              return (
                <div
                  key={doc.id}
                  className="sleek-card group p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 hover:translate-x-1 animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-4 md:gap-5 min-w-0 w-full flex-1">
                    {/* Source type icon */}
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 transition-colors relative">
                      <SourceIcon className={`h-6 w-6 md:h-7 md:w-7 ${sourceType.color} group-hover:text-primary transition-colors`} />
                      {doc.isPrimarySource && (
                        <Star className="absolute -top-1 -right-1 h-4 w-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm md:text-base font-black text-gray-900 truncate mb-0.5">
                        {doc.originalName}
                      </p>
                      <div className="flex items-center gap-x-2 md:gap-x-3 flex-wrap">
                        <span className={`text-[10px] md:text-xs font-bold ${sourceType.color}`}>
                          {sourceType.label}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-[10px] md:text-xs font-bold text-gray-400">
                          {doc.fileSize ? doc.sourceType === 'note' ? `${(doc.fileSize / 1024).toFixed(0)} chars` : `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-[10px] md:text-xs font-bold text-gray-400">
                          {doc.uploadDate && new Date(doc.uploadDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        {/* Source quality badge for URL documents */}
                        {qualityBadge && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border ${qualityBadge.color}`}>
                              <qualityBadge.icon className="h-2.5 w-2.5" />
                              {qualityBadge.label}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Show source URL for url-type documents */}
                      {doc.sourceUrl && (
                        <p className="text-[10px] text-blue-400 truncate mt-0.5 font-medium">{doc.sourceUrl}</p>
                      )}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      {doc._isOptimistic && (
                        <div className="mt-1.5 w-24">
                          <ProgressBar value={doc._uploadProgress || 0} max={100} className="h-1 rounded-full" />
                        </div>
                      )}
                      {doc.status === 'processing' && !doc._isOptimistic && (
                        <div className="mt-1 h-3 overflow-hidden">
                          <TextLoop interval={3} className="text-[9px] font-bold text-amber-500">
                            {["Synthesizing...", "Reading...", "Mapping..."].map((msg) => (
                              <span key={msg}>{msg}</span>
                            ))}
                          </TextLoop>
                        </div>
                      )}
                      {doc.error && (
                        <p className="mt-1 text-[9px] font-medium text-red-500 max-w-[200px] text-right">
                          {doc.error}
                        </p>
                      )}
                    </div>

                    {/* Primary source star toggle */}
                    <button
                      onClick={() => handleTogglePrimary(doc.id, doc.isPrimarySource)}
                      disabled={doc._isOptimistic}
                      className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all ${doc._isOptimistic ? 'opacity-30 cursor-not-allowed' : ''} ${doc.isPrimarySource
                        ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                        : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'
                        }`}
                      title={doc.isPrimarySource ? 'Remove primary source' : 'Mark as primary source'}
                    >
                      <Star className={`h-4 w-4 md:h-5 md:w-5 ${doc.isPrimarySource ? 'fill-amber-500' : ''}`} />
                    </button>

                    {doc.status === 'ready' && (
                      <button
                        onClick={() => navigate(`/learn/${doc.id}`)}
                        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-primary/50 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        title="Open in Learn"
                      >
                        <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={doc._isOptimistic}
                      className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ${doc._isOptimistic ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
