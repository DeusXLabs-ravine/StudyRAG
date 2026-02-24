import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer, AlertTriangle, CheckCircle, XCircle, Trophy, ArrowRight, ArrowLeft,
  GraduationCap, Plus, Brain, Sparkles, BookOpen, HelpCircle, ClipboardList,
  Upload, FileText, Trash2, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../services/examService';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';
import { TextLoop } from '../components/ui/text-loop';

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
      console.error('Failed to load sessions:', err);
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
        console.error('Poll error:', err);
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Exam Prep</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => {
              resetToLanding();
              setPhase('select-docs');
            }}
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Plus className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">New Exam Prep</p>
              <p className="text-xs text-gray-500 mt-1">AI-generated study guides & practice exams</p>
            </div>
          </button>

          <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Continue Existing</p>
              <p className="text-xs text-gray-500 mt-1">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Sessions</h2>
            {sessions.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => loadSession(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.documentIds?.length || 0} doc{(s.documentIds?.length || 0) !== 1 ? 's' : ''} &middot; {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">No prep sessions yet. Create one to get started.</p>
        )}
      </div>
    );
  }

  // ─── PHASE: Select Docs ──────────────────────────────────

  if (phase === 'select-docs') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator step={1} total={3} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Study Documents</h1>
        <p className="text-sm text-gray-500 mb-6">Choose the documents you want to prepare for your exam.</p>

        {readyDocs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No documents available. Upload documents in the Library first.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
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
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-purple-600' : 'border-2 border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">{doc.fileType}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetToLanding}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => setPhase('add-materials')}
            disabled={selectedDocs.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE: Add Materials ────────────────────────────────

  if (phase === 'add-materials') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator step={2} total={3} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Add Auxiliary Materials</h1>
        <p className="text-sm text-gray-500 mb-6">
          Upload past exams, current tests, or assignments for AI pattern analysis. This is optional — you can skip this step.
        </p>

        {!prepSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700">A session will be created when you add your first material or proceed to configure.</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {MATERIAL_TYPES.map(({ key, label, icon: Icon, description }) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {materials.filter(m => m.materialType === key).length > 0 && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold">
                      {materials.filter(m => m.materialType === key).length}
                    </span>
                  )}
                  {expandedSections[key] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {expandedSections[key] && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  {/* Existing materials for this type */}
                  {materials.filter(m => m.materialType === key).map(mat => (
                    <div key={mat.id} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-700 flex-1 truncate">{mat.originalName || 'Text content'}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{mat.sourceType}</span>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:border-purple-400 hover:text-purple-600 cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      Upload File
                      <input
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          // Auto-create session if needed
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
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                    >
                      Paste Text
                    </button>
                  </div>

                  {showTextInput[key] && (
                    <div className="mt-2">
                      <textarea
                        value={textInputs[key] || ''}
                        onChange={e => setTextInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Paste exam/test/assignment content here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs resize-none h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                        className="mt-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        Add Text
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {uploadingMaterial && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Spinner size="sm" /> <span className="text-xs text-purple-700">Processing material...</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('select-docs')}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => setPhase('configure')}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            onClick={() => setPhase('configure')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE: Configure ────────────────────────────────────

  if (phase === 'configure') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <StepIndicator step={3} total={3} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configure</h1>
        <p className="text-sm text-gray-500 mb-6">Final settings before generating your exam prep materials.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
            <input
              type="text"
              value={prepConfig.name}
              onChange={e => setPrepConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Midterm Prep - Biology 101"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setPrepConfig(prev => ({ ...prev, difficulty: level }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${
                    prepConfig.difficulty === level
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Revision Questions</label>
            <select
              value={prepConfig.numRevisionQuestions}
              onChange={e => setPrepConfig(prev => ({ ...prev, numRevisionQuestions: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={15}>15 questions</option>
              <option value={30}>30 questions</option>
              <option value={50}>50 questions</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              <strong>{selectedDocs.length}</strong> document{selectedDocs.length !== 1 ? 's' : ''} selected
              {materials.length > 0 && <> &middot; <strong>{materials.length}</strong> auxiliary material{materials.length !== 1 ? 's' : ''}</>}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setPhase('add-materials')}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? <Spinner size="sm" /> : <Sparkles className="h-5 w-5" />}
            Generate Exam Prep
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE: Generating ───────────────────────────────────

  if (phase === 'generating') {
    const isFailed = prepSession?.status === 'failed';

    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        {isFailed ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Generation Failed</h2>
            <p className="text-sm text-gray-500 mb-4">{prepSession?.errorMessage || 'Something went wrong.'}</p>
            <button
              onClick={() => {
                setPhase('configure');
              }}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-6"
            >
              <Brain className="h-8 w-8 text-purple-600" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Generating Your Exam Prep</h2>
            <TextLoop interval={3} className="text-sm text-gray-500">
              <span>Analyzing your study materials...</span>
              <span>Detecting exam patterns...</span>
              <span>Building your study guide...</span>
              <span>Predicting probable exam questions...</span>
              <span>Organizing topics by priority...</span>
            </TextLoop>
            <div className="mt-6">
              <Spinner />
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── PHASE: Dashboard ────────────────────────────────────

  if (phase === 'dashboard' && prepSession) {
    const guide = prepSession.studyGuide;
    const questions = prepSession.revisionQuestions?.questions || [];
    const analysis = prepSession.analysis;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{prepSession.name}</h1>
            <p className="text-sm text-gray-500">
              {prepSession.documents?.length || 0} document{(prepSession.documents?.length || 0) !== 1 ? 's' : ''}
              {prepSession.materials?.length > 0 && ` · ${prepSession.materials.length} auxiliary material${prepSession.materials.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={resetToLanding} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg">
            <ArrowLeft className="h-4 w-4 inline mr-1" />All Sessions
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'guide', label: 'Study Guide', icon: BookOpen },
            { key: 'questions', label: 'Revision Questions', icon: HelpCircle },
            { key: 'practice', label: 'Practice Exams', icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Study Guide Tab */}
        {activeTab === 'guide' && guide && (
          <div className="space-y-4">
            {/* Executive Summary */}
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-6">
              <h3 className="text-sm font-semibold text-purple-800 mb-2">{guide.title || 'Study Guide'}</h3>
              <p className="text-sm text-purple-700 whitespace-pre-wrap">{guide.executive_summary}</p>
            </div>

            {/* Topics */}
            {(guide.topics || [])
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
              })
              .map((topic, i) => {
                const isExpanded = expandedTopics[i];
                const priorityColors = {
                  critical: 'bg-red-100 text-red-700 border-red-200',
                  high: 'bg-orange-100 text-orange-700 border-orange-200',
                  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                  low: 'bg-green-100 text-green-700 border-green-200',
                };
                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-200">
                    <button
                      onClick={() => setExpandedTopics(prev => ({ ...prev, [i]: !prev[i] }))}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${priorityColors[topic.priority] || 'bg-gray-100 text-gray-600'}`}>
                          {topic.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{topic.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {topic.estimated_study_minutes && (
                          <span className="text-xs text-gray-400">{topic.estimated_study_minutes} min</span>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{topic.summary}</p>

                        {topic.key_concepts?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Concepts</h4>
                            <ul className="space-y-1">
                              {topic.key_concepts.map((c, j) => (
                                <li key={j} className="text-xs text-gray-600 flex gap-2">
                                  <span className="text-purple-400 mt-0.5">•</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {topic.formulas?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Formulas</h4>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                              {topic.formulas.map((f, j) => (
                                <p key={j} className="text-xs text-gray-700 font-mono">{f}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {topic.common_mistakes?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Common Mistakes</h4>
                            <ul className="space-y-1">
                              {topic.common_mistakes.map((m, j) => (
                                <li key={j} className="text-xs text-red-600 flex gap-2">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {topic.study_tips?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Study Tips</h4>
                            <ul className="space-y-1">
                              {topic.study_tips.map((t, j) => (
                                <li key={j} className="text-xs text-green-700 flex gap-2">
                                  <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" /> {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Study Plan */}
            {guide.study_plan && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Study Plan</h3>

                {guide.study_plan.recommended_order?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Recommended Order</h4>
                    <ol className="space-y-1">
                      {guide.study_plan.recommended_order.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-purple-500 font-bold">{i + 1}.</span> {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {guide.study_plan.cramming_priorities?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Cramming Priorities</h4>
                    <ul className="space-y-1">
                      {guide.study_plan.cramming_priorities.map((item, i) => (
                        <li key={i} className="text-xs text-orange-700 flex gap-2">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {guide.study_plan.review_checklist?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Review Checklist</h4>
                    <ul className="space-y-1">
                      {guide.study_plan.review_checklist.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2">
                          <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Revision Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {questions.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No revision questions generated.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{questions.length} predicted exam questions</p>
                </div>
                {/* Group by topic */}
                {Object.entries(
                  questions.reduce((acc, q, i) => {
                    const topic = q.topic || 'General';
                    if (!acc[topic]) acc[topic] = [];
                    acc[topic].push({ ...q, _index: i });
                    return acc;
                  }, {})
                ).map(([topic, topicQuestions]) => (
                  <div key={topic}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{topic}</h3>
                    <div className="space-y-2">
                      {topicQuestions.map((q) => {
                        const isExpanded = expandedQuestions[q._index];
                        const likelihoodColors = {
                          high: 'bg-red-100 text-red-700',
                          medium: 'bg-yellow-100 text-yellow-700',
                          low: 'bg-gray-100 text-gray-600',
                        };
                        const diffColors = {
                          easy: 'bg-green-100 text-green-700',
                          medium: 'bg-yellow-100 text-yellow-700',
                          hard: 'bg-red-100 text-red-700',
                        };
                        return (
                          <div key={q._index} className="bg-white rounded-lg border border-gray-200">
                            <button
                              onClick={() => setExpandedQuestions(prev => ({ ...prev, [q._index]: !prev[q._index] }))}
                              className="w-full text-left p-3"
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-gray-400 font-mono mt-0.5">{q._index + 1}.</span>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900">{q.question}</p>
                                  <div className="flex gap-1.5 mt-2">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold capitalize bg-purple-100 text-purple-700">{q.type?.replace('_', ' ')}</span>
                                    {q.difficulty && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold capitalize ${diffColors[q.difficulty] || ''}`}>{q.difficulty}</span>
                                    )}
                                    {q.exam_likelihood && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${likelihoodColors[q.exam_likelihood] || ''}`}>
                                        {q.exam_likelihood} likelihood
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-gray-400 mt-0.5" />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-gray-100 pt-2 ml-6">
                                {q.options && (
                                  <div className="mb-2 space-y-1">
                                    {q.options.map((opt, j) => (
                                      <p key={j} className={`text-xs px-2 py-1 rounded ${opt.charAt(0) === q.correct ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600'}`}>
                                        {opt}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                <div className="bg-green-50 rounded-lg p-3">
                                  <p className="text-[10px] font-semibold text-green-800 uppercase mb-1">Answer: {q.correct}</p>
                                  <p className="text-xs text-green-700">{q.explanation}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Practice Exams Tab */}
        {activeTab === 'practice' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Generate Practice Exam</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                  <select
                    value={practiceConfig.numQuestions}
                    onChange={e => setPracticeConfig(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={30}>30 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <div className="flex gap-2">
                    {['easy', 'medium', 'hard'].map(level => (
                      <button
                        key={level}
                        onClick={() => setPracticeConfig(prev => ({ ...prev, difficulty: level }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${
                          practiceConfig.difficulty === level
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit</label>
                  <select
                    value={practiceConfig.timeLimitMinutes}
                    onChange={e => setPracticeConfig(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <button
                onClick={startPracticeExam}
                disabled={practiceLoading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {practiceLoading ? <Spinner size="sm" /> : <Timer className="h-5 w-5" />}
                Start Practice Exam
              </button>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">Practice Exam Info</span>
              </div>
              <p className="text-xs text-purple-600">
                Practice exams are timed with linear progression (no going back). They use your study materials
                {analysis ? ' and detected exam patterns' : ''} to generate realistic questions.
                Results are tracked in your analytics.
              </p>
            </div>
          </div>
        )}
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
          <p className="text-base font-medium text-gray-900 mb-4">{question.question}</p>

          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-2">
              {question.options.map((opt, i) => {
                const letter = opt.charAt(0);
                const isSelected = answers[currentQ] === letter;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [currentQ]: letter })}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {opt}
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
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    answers[currentQ] === val
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
              {submitting ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
              Submit Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── PHASE: Practice Results ─────────────────────────────

  if (phase === 'practice-results' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Trophy className={`h-16 w-16 mx-auto mb-3 ${result.score >= 70 ? 'text-yellow-500' : 'text-gray-400'}`} />
          <h1 className="text-3xl font-bold text-gray-900">
            {result.score >= 90 ? 'Excellent!' : result.score >= 70 ? 'Well Done!' : result.score >= 50 ? 'Keep Trying' : 'Needs Work'}
          </h1>
          <p className="text-5xl font-bold mt-3 text-purple-600">{result.score}%</p>
          <p className="text-gray-500 mt-2">
            {result.correct} of {result.total} correct
            {result.timeSpentSeconds && ` in ${Math.floor(result.timeSpentSeconds / 60)}m ${result.timeSpentSeconds % 60}s`}
          </p>
        </div>

        {/* Results breakdown */}
        <div className="space-y-3 mb-8">
          {result.results.map((r, i) => (
            <div key={i} className={`p-4 rounded-lg border ${r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2">
                {r.isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{r.question}</p>
                  {!r.isCorrect && (
                    <p className="text-xs text-red-600 mt-1">
                      Your answer: {r.userAnswer || 'No answer'} | Correct: {r.correctAnswer}
                    </p>
                  )}
                  {r.explanation && (
                    <p className="text-xs text-gray-600 mt-1">{r.explanation}</p>
                  )}
                  {r.topic && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{r.topic}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setExam(null);
              setResult(null);
              setPhase('dashboard');
            }}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.href = '/analytics'}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            View Analytics
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Step Indicator Component ──────────────────────────────

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            i + 1 <= step
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-purple-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
