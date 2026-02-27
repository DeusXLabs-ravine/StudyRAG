import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer, AlertTriangle, CheckCircle, XCircle, Trophy, ArrowRight, ArrowLeft,
  GraduationCap, Plus, Brain, Sparkles, BookOpen, HelpCircle, ClipboardList,
  Upload, FileText, Trash2, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import * as examService from '../services/examService';
import useDocumentStore from '../store/documentStore';
import { MorphingSquare } from '../components/ui/morphing-square';
import { TextLoop } from '../components/ui/text-loop';
import { getAestheticPhoto } from '../utils/imageHelpers';

const STATUS_COLORS = {
  configuring: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  generating: 'bg-blue-100 text-blue-700 border-blue-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const MATERIAL_TYPES = [
  { key: 'past_exam', label: 'Past Exams', icon: FileText, description: 'Previous exam papers for pattern analysis' },
  { key: 'current_test', label: 'Current Tests', icon: ClipboardList, description: 'Recent tests or quizzes from your course' },
  { key: 'assignment', label: 'Assignments', icon: BookOpen, description: 'Homework, problem sets, or coursework' },
];

export default function Exam() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [phase, setPhase] = useState('landing');
  // Prep wizard state
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [prepConfig, setPrepConfig] = useState({ name: '', difficulty: 'medium', numRevisionQuestions: 30 });
  const [prepSession, setPrepSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  // Dashboard state
  const [activeTab, setActiveTab] = useState('guide');
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  // Practice exam config
  const [practiceConfig, setPracticeConfig] = useState({ numQuestions: 20, difficulty: 'medium', timeLimitMinutes: 30 });
  // Exam state (reused for practice exams)
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);
  // Loading states
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  // Material upload state
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ past_exam: true, current_test: false, assignment: false });
  const [textInputs, setTextInputs] = useState({});
  const [showTextInput, setShowTextInput] = useState({});

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  // ─── Session Loading ─────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await examService.listPrepSessions();
      setSessions(data || []);
    } catch (err) {
      // error silenced — UI shows empty state
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId) => {
    try {
      const data = await examService.getPrepSession(sessionId);
      setPrepSession(data);
      setSelectedDocs(data.documentIds || []);
      setMaterials(data.materials || []);
      if (data.status === 'ready') {
        setPhase('dashboard');
      } else if (data.status === 'generating') {
        setPhase('generating');
        startPolling(sessionId);
      } else {
        setPhase('select-docs');
      }
    } catch (err) {
      alert('Failed to load session: ' + err.message);
    }
  }, []);

  useEffect(() => {
    if (phase === 'landing') loadSessions();
  }, [phase, loadSessions]);

  // ─── Polling ─────────────────────────────────────────────

  const startPolling = useCallback((sessionId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await examService.getPrepSession(sessionId);
        setPrepSession(data);
        if (data.status === 'ready') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPhase('dashboard');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        // poll error — will retry on next interval
      }
    }, 3000);
  }, []);

  // ─── Material Upload ─────────────────────────────────────

  const handleMaterialFile = async (file, materialType) => {
    if (!prepSession) return;
    setUploadingMaterial(true);
    try {
      const mat = await examService.addPrepMaterialFile(prepSession.id, file, materialType);
      setMaterials(prev => [...prev, mat]);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleMaterialText = async (materialType) => {
    if (!prepSession || !textInputs[materialType]?.trim()) return;
    setUploadingMaterial(true);
    try {
      const mat = await examService.addPrepMaterialText(
        prepSession.id, materialType, textInputs[materialType], 'Pasted text'
      );
      setMaterials(prev => [...prev, mat]);
      setTextInputs(prev => ({ ...prev, [materialType]: '' }));
      setShowTextInput(prev => ({ ...prev, [materialType]: false }));
    } catch (err) {
      alert('Failed to add text: ' + err.message);
    } finally {
      setUploadingMaterial(false);
    }
  };

  // ─── Generate Prep ───────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let session = prepSession;
      if (!session) {
        session = await examService.createPrepSession({
          documentIds: selectedDocs,
          name: prepConfig.name || 'Exam Prep Session',
          config: { difficulty: prepConfig.difficulty, numRevisionQuestions: prepConfig.numRevisionQuestions },
        });
        setPrepSession(session);
      }

      // Upload any pending materials if session was just created
      // Materials should already be uploaded at this point

      await examService.startPrepGeneration(session.id);
      setPhase('generating');
      startPolling(session.id);
    } catch (err) {
      alert('Failed to start generation: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Practice Exam ───────────────────────────────────────

  const startPracticeExam = async () => {
    if (!prepSession) return;
    setPracticeLoading(true);
    try {
      const data = await examService.generatePracticeExam(prepSession.id, practiceConfig);
      setExam(data);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(data.timeLimitSeconds || practiceConfig.timeLimitMinutes * 60);
      setStartTime(Date.now());
      setPhase('practice-exam');
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      alert('Failed to generate practice exam: ' + err.message);
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleAutoSubmit = () => handleSubmit(true);

  const handleSubmit = async (auto = false) => {
    if (!exam) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const answerArray = exam.questions.map((_, i) => answers[i] || '');
      const data = await examService.submitExam(exam.id, answerArray, exam.questions, timeSpent);
      setResult(data);
      setPhase('practice-results');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Delete this prep session?')) return;
    try {
      await examService.deletePrepSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (prepSession?.id === id) {
        setPrepSession(null);
        setPhase('landing');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const resetToLanding = () => {
    setPrepSession(null);
    setSelectedDocs([]);
    setMaterials([]);
    setPrepConfig({ name: '', difficulty: 'medium', numRevisionQuestions: 30 });
    setExam(null);
    setResult(null);
    setActiveTab('guide');
    setPhase('landing');
  };

  // ─── PHASE: Landing ──────────────────────────────────────

  if (phase === 'landing') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Exam Prep</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Master your subjects with AI-powered study sessions.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-12">
          <button
            onClick={() => {
              resetToLanding();
              setPhase('select-docs');
            }}
            className="group relative flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-300 shadow-sm hover:shadow-xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-black text-gray-900 text-lg uppercase tracking-tight">Begin Prep</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Study Guides & Exams</p>
            </div>
          </button>

          <div className="flex flex-col items-center gap-4 p-8 bg-gray-50/50 rounded-3xl border-2 border-transparent">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <GraduationCap className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="font-black text-gray-900 text-lg uppercase tracking-tight">Total Sessions</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{sessions.length} active programs</p>
            </div>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="flex justify-center py-12"><MorphingSquare /></div>
        ) : sessions.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Your Study Sets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sessions.map((s, idx) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => loadSession(s.id)}
                  className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 block"
                >
                  {/* Photo Background */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={getAestheticPhoto(s.name || s.id, 600, 400)}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute inset-0 z-10 p-6 flex flex-col justify-end">
                    <div className="flex justify-between items-start mb-auto">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 ${s.status === 'ready' ? 'bg-green-500/20 text-green-100' :
                        s.status === 'generating' ? 'bg-yellow-500/20 text-yellow-100' :
                          'bg-white/20 text-white'
                        }`}>
                        {s.status}
                      </span>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                        className="p-2 bg-black/20 hover:bg-red-500/80 text-white rounded-xl backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white mb-2 line-clamp-2 leading-tight">
                        {s.name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {s.documentIds?.length || 0} Docs
                        </span>
                        <span>•</span>
                        <span>{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ready for your first session?</p>
          </div>
        )}
      </div>
    );
  }

  // ─── PHASE: Select Docs ──────────────────────────────────

  if (phase === 'select-docs') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">01</div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step One / Library Select</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Select Study Docs</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Choose the core documents for your AI to analyze.</p>
        </div>

        {readyDocs.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 mb-8">
            <FileText className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No ready documents in library</p>
          </div>
        ) : (
          <div className="space-y-3 mb-10">
            {readyDocs.map(doc => {
              const isSelected = selectedDocs.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocs(prev =>
                      isSelected ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                    );
                  }}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.99] group ${isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                    : 'border-gray-50 bg-gray-50/50 hover:border-gray-200 hover:bg-white'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-gray-200 group-hover:bg-gray-300'
                    }`}>
                    {isSelected && <CheckCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate transition-colors ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{doc.originalName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{doc.fileType}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetToLanding}
            className="order-2 sm:order-1 px-8 py-4 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
          >
            Back to Hub
          </button>
          <button
            onClick={() => setPhase('add-materials')}
            disabled={selectedDocs.length === 0}
            className="order-1 sm:order-2 flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
          >
            Config Materials <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE: Add Materials ────────────────────────────────

  if (phase === 'add-materials') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">02</div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step Two / Auxiliary Context</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Auxiliary Materials</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Fine-tune your AI brain with past exams and assignments.</p>
        </div>

        <div className="space-y-4 mb-10">
          {MATERIAL_TYPES.map(({ key, label, icon: Icon, description }) => (
            <div key={key} className="sleek-card overflow-hidden">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{label}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {materials.filter(m => m.materialType === key).length > 0 && (
                    <span className="w-6 h-6 bg-primary text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary/20">
                      {materials.filter(m => m.materialType === key).length}
                    </span>
                  )}
                  {expandedSections[key] ? <ChevronUp className="h-4 w-4 text-gray-300" /> : <ChevronDown className="h-4 w-4 text-gray-300" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedSections[key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2 border-t border-gray-50 space-y-4">
                      {/* Existing materials */}
                      {materials.filter(m => m.materialType === key).map(mat => (
                        <div key={mat.id} className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-xs font-bold text-gray-700 flex-1 truncate">{mat.originalName || 'Expert Snippet'}</span>
                          <span className="text-[10px] font-black uppercase text-gray-400">{mat.sourceType}</span>
                        </div>
                      ))}

                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col items-center justify-center gap-2 p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-primary hover:text-primary cursor-pointer transition-all shadow-sm">
                          <Upload className="h-4 w-4" />
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              let session = prepSession;
                              if (!session) {
                                session = await examService.createPrepSession({
                                  documentIds: selectedDocs,
                                  name: prepConfig.name || 'Exam Prep Session',
                                  config: { difficulty: prepConfig.difficulty, numRevisionQuestions: prepConfig.numRevisionQuestions },
                                });
                                setPrepSession(session);
                              }
                              await handleMaterialFile(file, key);
                              e.target.value = '';
                            }}
                            disabled={uploadingMaterial}
                          />
                        </label>
                        <button
                          onClick={() => setShowTextInput(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${showTextInput[key] ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-900'}`}
                        >
                          <Plus className="h-4 w-4" />
                          Paste
                        </button>
                      </div>

                      {showTextInput[key] && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="pt-2"
                        >
                          <textarea
                            value={textInputs[key] || ''}
                            onChange={e => setTextInputs(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Paste specific exam questions or notes..."
                            className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold resize-none h-32 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                          />
                          <button
                            onClick={async () => {
                              let session = prepSession;
                              if (!session) {
                                session = await examService.createPrepSession({
                                  documentIds: selectedDocs,
                                  name: prepConfig.name || 'Exam Prep Session',
                                  config: { difficulty: prepConfig.difficulty, numRevisionQuestions: prepConfig.numRevisionQuestions },
                                });
                                setPrepSession(session);
                              }
                              await handleMaterialText(key);
                            }}
                            disabled={!textInputs[key]?.trim() || uploadingMaterial}
                            className="mt-3 w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                          >
                            Inject Context
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {uploadingMaterial && (
          <div className="flex items-center gap-4 mb-8 p-5 bg-primary/5 rounded-2xl border-2 border-primary/10">
            <MorphingSquare size="sm" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI is absorbing material...</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setPhase('select-docs')}
            className="order-2 sm:order-1 px-8 py-4 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
          >
            Previous
          </button>
          <div className="order-1 sm:order-2 flex-1 flex gap-3">
            <button
              onClick={() => setPhase('configure')}
              className="flex-1 px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
              Skip
            </button>
            <button
              onClick={() => setPhase('configure')}
              className="flex-[2] flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
            >
              Finalize Sessions <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PHASE: Configure ────────────────────────────────────

  if (phase === 'configure') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">03</div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step Three / Intelligence Param</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Final Configuration</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Customize your study program's intensity and depth.</p>
        </div>

        <div className="sleek-card p-6 md:p-10 space-y-10 mb-10 shadow-2xl shadow-gray-100">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">Session Name</label>
            <input
              type="text"
              value={prepConfig.name}
              onChange={e => setPrepConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Midterm Bio-Science Mastery"
              className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-black text-gray-900 placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">Intensity Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['easy', 'medium', 'hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setPrepConfig(prev => ({ ...prev, difficulty: level }))}
                  className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${prepConfig.difficulty === level ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-900'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">Revision Depth ({prepConfig.numRevisionQuestions} Questions)</label>
            <div className="px-2">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={prepConfig.numRevisionQuestions}
                onChange={e => setPrepConfig(prev => ({ ...prev, numRevisionQuestions: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-3 px-1 text-[8px] font-black text-gray-300 uppercase tracking-widest">
                <span>Baseline</span>
                <span>Comprehensive</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setPhase('add-materials')}
            className="order-2 sm:order-1 px-8 py-4 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
          >
            Adjust Context
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="order-1 sm:order-2 flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
          >
            {generating ? <MorphingSquare size="sm" /> : <Sparkles className="h-5 w-5" />}
            Ignite Intelligence
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE: Generating ───────────────────────────────────

  if (phase === 'generating') {
    const isFailed = prepSession?.status === 'failed';

    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        {isFailed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 rounded-[28px] bg-red-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-3">Generation Failed</h2>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{prepSession?.errorMessage || 'The AI encountered an obstacle while building your prep material.'}</p>
            <button
              onClick={() => setPhase('configure')}
              className="w-full px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95"
            >
              Retry Protocol
            </button>
          </motion.div>
        ) : (
          <div className="space-y-10">
            <div className="relative inline-block">
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center relative z-10"
              >
                <Brain className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary rounded-full blur-2xl"
              />
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">Constructing Intelligence</h2>
              <div className="h-6 overflow-hidden">
                <TextLoop interval={3} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  <span>Analyzing document structure</span>
                  <span>Synthesizing critical domains</span>
                  <span>Optimizing revision vectors</span>
                  <span>Generating exam simulations</span>
                  <span>Refining study pathways</span>
                </TextLoop>
              </div>
            </div>

            <div className="flex justify-center items-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── PHASE: Dashboard ────────────────────────────────────

  if (phase === 'dashboard' && prepSession) {
    const guide = prepSession.studyGuide;
    const questions = prepSession.revisionQuestions?.questions || [];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <button
              onClick={resetToLanding}
              className="group mb-4 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
              Back to Prep Hub
            </button>
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">{prepSession.name}</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                {prepSession.documents?.length || 0} Documents
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_COLORS[prepSession.status]}`}>
                {prepSession.status}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleDeleteSession(prepSession.id)}
              className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Premium Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-gray-100 rounded-[20px] p-1.5 overflow-x-auto no-scrollbar">
          {[
            { key: 'guide', label: 'Study Guide', icon: BookOpen },
            { key: 'questions', label: 'Revision', icon: HelpCircle },
            { key: 'practice', label: 'Practice Exams', icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === key
                ? 'bg-white text-primary shadow-xl shadow-gray-200/50'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Study Guide Tab */}
              {activeTab === 'guide' && guide && (
                <div className="space-y-6">
                  {/* Executive Summary Card */}
                  <div className="sleek-card p-8 bg-primary/5 border-primary/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Sparkles className="h-24 w-24 text-primary" />
                    </div>
                    <div className="relative z-10 font-bold text-gray-800 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                      {guide.executive_summary}
                    </div>
                  </div>

                  {/* Topics Grid/List */}
                  <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Core Knowledge Domains</h2>
                    {(guide.topics || [])
                      .sort((a, b) => {
                        const order = { critical: 0, high: 1, medium: 2, low: 3 };
                        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
                      })
                      .map((topic, i) => {
                        const priorityColors = {
                          critical: 'bg-red-500 text-white shadow-lg shadow-red-200',
                          high: 'bg-orange-500 text-white shadow-lg shadow-orange-200',
                          medium: 'bg-yellow-500 text-white shadow-lg shadow-yellow-200',
                          low: 'bg-emerald-500 text-white shadow-lg shadow-emerald-200',
                        };
                        return (
                          <div key={i} className="sleek-card overflow-hidden">
                            <button
                              onClick={() => setExpandedTopics(prev => ({ ...prev, [i]: !prev[i] }))}
                              className="w-full flex items-center justify-between p-6 text-left"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-2 h-10 rounded-full shrink-0 ${priorityColors[topic.priority]?.split(' ')[0]}`} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${priorityColors[topic.priority]}`}>
                                      {topic.priority}
                                    </span>
                                    {topic.estimated_study_minutes && (
                                      <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">~{topic.estimated_study_minutes}m study</span>
                                    )}
                                  </div>
                                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{topic.name}</h3>
                                </div>
                              </div>
                              {expandedTopics[i] ? <ChevronUp className="h-5 w-5 text-gray-300" /> : <ChevronDown className="h-5 w-5 text-gray-300" />}
                            </button>

                            {expandedTopics[i] && (
                              <div className="px-6 pb-8 pt-2 border-t border-gray-50 bg-gray-50/30">
                                <p className="text-sm text-gray-600 font-medium leading-relaxed mb-6">{topic.summary}</p>
                                <div className="space-y-6">
                                  {topic.subtopics?.map((sub, si) => (
                                    <div key={si} className="relative pl-6 border-l-2 border-gray-100 py-1">
                                      <div className="absolute top-2 -left-[5px] w-2 h-2 bg-gray-200 rounded-full" />
                                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">{sub.name}</h4>
                                      <p className="text-sm text-gray-500 font-medium leading-snug">{sub.details}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Revision Questions Tab */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  <div className="sleek-card p-8 mb-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Rapid Revision</h2>
                    <p className="text-sm text-gray-500 font-medium max-w-sm mt-2">Test your retention on key topics identifying gap areas.</p>
                  </div>

                  {questions.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 uppercase tracking-widest mt-4">
                      <MorphingSquare message="Generating focus questions..." />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((q, i) => (
                        <div key={i} className="sleek-card p-6 md:p-8">
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xs font-black text-gray-400">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm md:text-base font-black text-gray-900 leading-relaxed mb-4 prose prose-sm max-w-none [&_p]:mb-1">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.question}</ReactMarkdown>
                              </div>
                              <button
                                onClick={() => setExpandedQs(prev => ({ ...prev, [i]: !prev[i] }))}
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-bold text-sm ${expandedQs[i] ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-gray-200 hover:text-gray-900'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{expandedQs[i] ? 'Revealed' : 'Reveal Answer'}</span>
                                  <Sparkles className={`h-4 w-4 ${expandedQs[i] ? 'text-white' : 'text-gray-300'}`} />
                                </div>
                                {expandedQs[i] && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-4 pt-4 border-t border-white/20 prose prose-sm max-w-none prose-invert [&_p]:mb-1"
                                  >
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.answer}</ReactMarkdown>
                                  </motion.div>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Practice Exams Tab */}
              {activeTab === 'practice' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => handleCreatePracticeExam('mixed')}
                      className="group flex flex-col items-center gap-6 p-10 sleek-card hover:border-primary hover:bg-primary/5 transition-all text-center"
                    >
                      <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Dna className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Mixed Simulation</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Comprehensive balanced coverage</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleCreatePracticeExam('weighted')}
                      className="group flex flex-col items-center gap-6 p-10 sleek-card hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center"
                    >
                      <div className="w-20 h-20 bg-emerald-100 rounded-[28px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <LineChart className="h-10 w-10 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Pattern Focused</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Focused on high-priority domains</p>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Past Simulations</h2>
                    {prepSession.practiceExams?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {prepSession.practiceExams.map(exam => (
                          <div
                            key={exam.id}
                            onClick={() => { setExam(exam); setPhase('practice-exam'); }}
                            className="sleek-card p-5 flex items-center justify-between group cursor-pointer hover:border-primary transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-primary transition-colors">Attempt {exam.id.slice(-4)}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{exam.questions?.length || 0} Questions &middot; {new Date(exam.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {exam.score !== undefined && (
                                <span className="text-xs font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">{exam.score}%</span>
                              )}
                              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No simulations yet. Start one above.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─── PHASE: Practice Exam ────────────────────────────────

  if (phase === 'practice-exam' && exam) {
    const question = exam.questions[currentQ];
    const totalQ = exam.questions.length;
    const isLowTime = timeLeft <= 120;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Timer header */}
        <div className={`flex items-center justify-between mb-6 p-3 rounded-lg ${isLowTime ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
          <span className="text-sm font-medium text-gray-700">
            Question {currentQ + 1} of {totalQ}
          </span>
          <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isLowTime ? 'text-red-600' : 'text-gray-700'}`}>
            <Timer className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-purple-600 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="text-base font-medium text-gray-900 mb-4 prose prose-sm max-w-none [&_p]:mb-1">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{question.question}</ReactMarkdown>
          </div>

          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-2">
              {question.options.map((opt, i) => {
                const letter = opt.charAt(0);
                const isSelected = answers[currentQ] === letter;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [currentQ]: letter })}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${isSelected
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                  >
                    <span className="[&_p]:inline"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown></span>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'true_false' && (
            <div className="flex gap-3">
              {['true', 'false'].map(val => (
                <button
                  key={val}
                  onClick={() => setAnswers({ ...answers, [currentQ]: val })}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium capitalize transition-colors ${answers[currentQ] === val
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next / Submit */}
        <div className="flex justify-end">
          {currentQ < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              className="flex items-center gap-1 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? <MorphingSquare size="sm" /> : <CheckCircle className="h-4 w-4" />}
              Submit Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── PHASE: Practice Exam ────────────────────────────────

  if (phase === 'practice-exam' && exam) {
    const q = exam.questions[currentQ];
    const totalQ = exam.questions.length;
    const isLowTime = timeLeft <= 120;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Active Simulation</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Question {currentQ + 1} <span className="text-gray-200">/</span> {totalQ}</p>
            </div>
          </div>

          <div className={`px-4 py-2.5 rounded-2xl border-2 flex items-center gap-2 transition-colors ${isLowTime ? 'bg-red-50 border-red-100 text-red-500' : 'bg-gray-50 border-gray-50 text-gray-700'}`}>
            <Timer className={`h-4 w-4 ${isLowTime ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-black font-mono">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
            className="bg-primary h-full rounded-full"
          />
        </div>

        <div className="sleek-card p-6 md:p-10 shadow-2xl shadow-gray-100 mb-10">
          <div className="mb-10">
            <span className="text-[10px] font-black text-primary/50 uppercase tracking-[0.2em] mb-3 block">Knowledge Assessment</span>
            <div className="text-xl md:text-2xl font-black text-gray-900 leading-tight prose prose-xl max-w-none [&_p]:mb-1">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.question}</ReactMarkdown>
            </div>
          </div>

          <div className="space-y-3">
            {(q.options || ['True', 'False']).map((opt, i) => {
              const letter = opt.charAt(0);
              const isSelected = answers[currentQ] === letter;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: letter }))}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.99] text-left ${isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                    : 'border-gray-50 bg-gray-50 hover:border-gray-200 hover:bg-white'}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-black text-xs transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {letter}
                  </div>
                  <span className={`text-sm font-black transition-colors [&_p]:inline ${isSelected ? 'text-primary' : 'text-gray-700'}`}><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="px-8 py-4 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest disabled:opacity-0"
          >
            Prev
          </button>
          {currentQ < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmitPracticeExam}
              disabled={Object.keys(answers).length < totalQ}
              className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 disabled:grayscale disabled:opacity-50"
            >
              Finish Simulation
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── PHASE: Practice Results ─────────────────────────────

  if (phase === 'practice-results' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="sleek-card p-10 mb-8 overflow-hidden relative text-center">
          <div className="relative z-10">
            <div className="w-20 h-20 bg-primary/5 rounded-[28px] flex items-center justify-center mx-auto mb-6">
              <Trophy className={`h-10 w-10 ${result.score >= 70 ? 'text-yellow-500' : 'text-gray-400'}`} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              {result.score >= 90 ? 'Legendary!' : result.score >= 70 ? 'Superior Prep!' : result.score >= 50 ? 'Gaining Momentum' : 'Needs Reinforcement'}
            </h1>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <span className="text-6xl font-black text-primary tracking-tighter">{result.score}</span>
              <span className="text-2xl font-black text-primary/30">%</span>
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">
              {result.correct} <span className="text-gray-200 mx-1">/</span> {result.total} CORRECT &middot; {Math.floor(result.timeSpentSeconds / 60)}m spent
            </p>
          </div>

          {/* Background Decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/10" />
          <Sparkles className="absolute -top-6 -right-6 h-24 w-24 text-primary/5" />
        </div>

        <div className="space-y-4 mb-10">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Performance Breakdown</h2>
          {result.results.map((r, i) => (
            <div key={i} className="sleek-card p-6">
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${r.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {r.isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-gray-900 leading-relaxed mb-3 prose prose-sm max-w-none [&_p]:mb-1">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{r.question}</ReactMarkdown>
                  </div>

                  {!r.isCorrect && (
                    <div className="mb-4 p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                      <div className="flex flex-col gap-2">
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Identified Gap</span>
                        <p className="text-xs text-red-700 font-bold">Your answer: <span className="[&_p]:inline"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{r.userAnswer || 'Timed Out'}</ReactMarkdown></span></p>
                        <p className="text-xs text-emerald-600 font-black">Correct protocol: <span className="[&_p]:inline"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{r.correctAnswer}</ReactMarkdown></span></p>
                      </div>
                    </div>
                  )}

                  {r.explanation && (
                    <div className="mb-3">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Intelligence Insight</span>
                      <div className="text-xs text-gray-500 font-medium leading-relaxed prose prose-xs max-w-none [&_p]:mb-1">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{r.explanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {r.topic && (
                    <span className="inline-block px-2 py-0.5 bg-gray-50 rounded text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                      {r.topic}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              setExam(null);
              setResult(null);
              setPhase('dashboard');
            }}
            className="flex-1 px-8 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.href = '/analytics'}
            className="flex-1 px-8 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
          >
            Mastery Analytics
          </button>
        </div>
      </div>
    );
  }

  return null;
}
