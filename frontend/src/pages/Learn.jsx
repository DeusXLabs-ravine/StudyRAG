import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, CheckCircle, Lock, ChevronRight, Calculator, FlaskConical, Cpu, Atom, Globe, Lightbulb, Sparkles, Send, Volume2, Loader2 } from 'lucide-react';
import useModuleStore from '../store/moduleStore';
import useDocumentStore from '../store/documentStore';
import useSettingsStore from '../store/settingsStore';
import Spinner from '../components/common/Spinner';
import LessonViewer from '../components/learn/LessonViewer';
import QuizSection from '../components/learn/QuizSection';
import { explainSimply } from '../services/moduleService';
import { prefetchAllChunks } from '../services/ttsService';
import { listDiagrams } from '../services/diagramService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function Learn() {
  const { documentId: routeDocId } = useParams();
  const { modules, currentModule, loading: modulesLoading, generating, fetchModules, stopPolling, setCurrentModule, regenerateQuestions, markModuleCompleted } = useModuleStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const [selectedDocId, setSelectedDocId] = useState(routeDocId || null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [regeneratingQuestions, setRegeneratingQuestions] = useState(false);

  // Track IDs of modules explicitly unlocked this session so they can't re-lock
  const unlockedIdsRef = useRef(new Set());

  // Diagram State
  const [diagrams, setDiagrams] = useState([]);

  // Assistance State
  const [explanation, setExplanation] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const getVoiceId = useSettingsStore(state => state.getVoiceId);
  const settings = useSettingsStore(state => state.settings);
  const prefetchCancelRef = useRef(null);

  useEffect(() => {
    if (selectedDocId) {
      fetchModules(selectedDocId);
      // Fetch diagrams (non-blocking, may be empty if feature is off)
      listDiagrams(selectedDocId).then(setDiagrams).catch(() => setDiagrams([]));
    } else {
      setDiagrams([]);
      stopPolling();
    }
    return () => stopPolling();
  }, [selectedDocId, fetchModules, stopPolling]);

  // Background prefetch TTS audio chunks when module changes
  useEffect(() => {
    // Cancel any previous prefetch
    if (prefetchCancelRef.current) {
      prefetchCancelRef.current();
      prefetchCancelRef.current = null;
    }

    if (currentModule?.content && !showQuiz) {
      const voiceId = getVoiceId();
      prefetchCancelRef.current = prefetchAllChunks(currentModule.content, voiceId);
    }

    return () => {
      if (prefetchCancelRef.current) {
        prefetchCancelRef.current();
        prefetchCancelRef.current = null;
      }
    };
  }, [currentModule?.id, showQuiz, getVoiceId]);

  const handleModuleSelect = (module) => {
    setCurrentModule(module);
    setShowQuiz(false);
    setExplanation(''); // Reset easy board on module change
    setCustomQuestion('');
  };

  const handleExplainSimply = async (question = '') => {
    if (!currentModule) return;
    setExplainLoading(true);
    try {
      const result = await explainSimply(currentModule.id, question);
      setExplanation(result);
    } catch (err) {
      setExplanation('Sorry, I had trouble dumbing this down. Please try again.');
    } finally {
      setExplainLoading(false);
    }
  };

  const isModuleAccessible = (mod, index) => {
    if (index === 0) return true;
    // If this module was explicitly unlocked during this session, keep it accessible
    if (unlockedIdsRef.current.has(mod.id)) return true;
    const prevMod = modules[index - 1];
    return prevMod?.progress?.completed;
  };

  const getTopicIcon = (topic) => {
    const t = topic.toLowerCase();
    if (t.includes('math') || t.includes('calc') || t.includes('stat') || t.includes('alg')) return <Calculator className="h-3 w-3" />;
    if (t.includes('sci') || t.includes('chem') || t.includes('lab')) return <FlaskConical className="h-3 w-3" />;
    if (t.includes('code') || t.includes('prog') || t.includes('soft') || t.includes('tech')) return <Cpu className="h-3 w-3" />;
    if (t.includes('phys') || t.includes('quant') || t.includes('atom')) return <Atom className="h-3 w-3" />;
    if (t.includes('geo') || t.includes('history') || t.includes('world') || t.includes('social')) return <Globe className="h-3 w-3" />;
    return <Lightbulb className="h-3 w-3" />;
  };

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Learning Journey</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Master your documents through AI-generated modules.</p>
        </div>

        {readyDocs.length > 0 && (
          <div className="relative group min-w-[280px]">
            <select
              value={selectedDocId || ''}
              onChange={e => setSelectedDocId(e.target.value || null)}
              className="appearance-none w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm hover:shadow-md cursor-pointer outline-none"
            >
              <option value="">Select a Document...</option>
              {readyDocs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.originalName || doc.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        )}
      </div>

      {!selectedDocId ? (
        <div className="sleek-card p-24 text-center bg-gray-50/50 border-dashed border-2">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to start?</h3>
          <p className="text-gray-500 max-w-sm mx-auto">Select a document from the menu above to generate your personalized learning path.</p>
        </div>
      ) : modulesLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Spinner size="lg" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Building your classroom...</p>
        </div>
      ) : (modules || []).length === 0 ? (
        <div className="sleek-card p-20 text-center">
          <Sparkles className="h-12 w-12 text-primary/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No modules yet</h3>
          <p className="text-gray-500">We're still processing this document. Check back in a few moments!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Column 1: Module Picker (Left) */}
          <div className="lg:col-span-3 xl:col-span-2">
            <div className="sticky top-8 space-y-6">
              {Object.entries(
                (modules || []).reduce((acc, mod) => {
                  const topic = mod.topic || 'General';
                  if (!acc[topic]) acc[topic] = [];
                  acc[topic].push(mod);
                  return acc;
                }, {})
              ).map(([topic, topicModules]) => (
                <div key={topic} className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] px-3 mb-3 flex items-center gap-2">
                    <div className="text-primary/60">
                      {getTopicIcon(topic)}
                    </div>
                    {topic}
                  </h3>
                  <div className="space-y-1">
                    {topicModules.map((mod) => {
                      const globalIndex = (modules || []).findIndex(m => m.id === mod.id);
                      const accessible = isModuleAccessible(mod, globalIndex);
                      const isActive = currentModule?.id === mod.id;
                      const isCompleted = mod.progress?.completed;

                      return (
                        <button
                          key={mod.id}
                          onClick={() => accessible && handleModuleSelect(mod)}
                          disabled={!accessible}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${isActive
                            ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/20 scale-[1.02]'
                            : accessible
                              ? 'text-gray-700 hover:bg-gray-50 hover:translate-x-1'
                              : 'text-gray-400 cursor-not-allowed grayscale opacity-60'
                            }`}
                        >
                          <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : isCompleted ? 'bg-green-100' : accessible ? 'bg-gray-100' : 'bg-gray-50'
                            }`}>
                            {isCompleted ? (
                              <CheckCircle className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-green-600'}`} />
                            ) : !accessible ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>{globalIndex + 1}</span>
                            )}
                          </div>
                          <span className="truncate flex-1 font-medium">{mod.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {generating && (
                <div className="flex items-center gap-2 px-3 py-3 text-xs font-bold text-primary/70 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating more modules...
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Main Chalkboard (Center) */}
          <div className="lg:col-span-6 xl:col-span-7">
            {currentModule ? (
              showQuiz ? (
                <QuizSection
                  module={currentModule}
                  onComplete={() => {
                    // Ensure the current module is marked completed in the store
                    markModuleCompleted(currentModule.id);

                    // Advance to the next module after passing the quiz
                    const safeModules = modules || [];
                    const currentIndex = safeModules.findIndex(m => m.id === currentModule.id);
                    if (currentIndex < safeModules.length - 1) {
                      const nextModule = safeModules[currentIndex + 1];
                      // Track this module as unlocked so it can't re-lock during this session
                      unlockedIdsRef.current.add(nextModule.id);
                      setCurrentModule(nextModule);
                    }
                    setShowQuiz(false);
                    setExplanation('');
                    setCustomQuestion('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBack={() => { setShowQuiz(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              ) : (
                <LessonViewer
                  module={currentModule}
                  diagrams={diagrams.filter(d => d.status === 'ready')}
                  teachingLevel={settings.teaching_level || 'intermediate'}
                  onStartQuiz={async () => {
                    // If student previously attempted but didn't pass, regenerate questions
                    const progress = currentModule.progress;
                    if (progress?.attempts > 0 && !progress?.completed) {
                      setRegeneratingQuestions(true);
                      try {
                        await regenerateQuestions(currentModule.id);
                      } catch (err) {
                        console.error('Failed to regenerate questions:', err.message);
                      } finally {
                        setRegeneratingQuestions(false);
                      }
                    }
                    setShowQuiz(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  regeneratingQuestions={regeneratingQuestions}
                />
              )
            ) : (
              <div className="sleek-card p-20 text-center bg-gray-50/50">
                <Sparkles className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Choose a Lesson</h3>
                <p className="text-gray-500">Pick a module from the left to start learning on the board.</p>
              </div>
            )}
          </div>

          {/* Column 3: Assistant Sidebar (Right) */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky-sidebar">

              {/* Voice / TTS Notification */}
              <div className="sleek-card p-6 bg-blue-50/50 border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Volume2 className="h-4 w-4" /> Board Controls
                  </h3>
                </div>
                <p className="text-[11px] text-blue-700/70 mb-4 font-medium leading-relaxed">Hear the lesson narrated. The speaker button is located at the top-right of your main chalkboard.</p>
              </div>

              {/* Concept Assistance Input */}
              <div className="sleek-card p-6 bg-purple-50/50 border-purple-100">
                <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4" /> Concept Help
                </h3>
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && customQuestion.trim() && handleExplainSimply(customQuestion)}
                    placeholder="E.g. Explain that math formula..."
                    className="w-full pl-4 pr-10 py-3 bg-white border border-purple-100 rounded-xl text-xs focus:ring-4 focus:ring-purple-200/50 outline-none transition-all font-medium"
                  />
                  <button
                    onClick={() => customQuestion.trim() && handleExplainSimply(customQuestion)}
                    className="absolute right-2 top-2 p-1.5 text-purple-400 hover:text-purple-600 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleExplainSimply()}
                  disabled={explainLoading}
                  className="w-full py-2.5 text-xs font-bold text-purple-600 bg-white border border-purple-100 hover:bg-purple-50 rounded-xl transition-all shadow-sm"
                >
                  {explainLoading ? <Spinner size="xs" /> : "I'm confused, help!"}
                </button>
              </div>

              {/* THE EASY BOARD (Dumb Board) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">The Easy Board</h3>
                  {explanation && (
                    <button onClick={() => setExplanation('')} className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase tracking-tighter">Clear</button>
                  )}
                </div>

                <div className="easy-board min-h-[350px]">
                  {explainLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 pt-20">
                      <Spinner size="sm" />
                      <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest animate-pulse">Dumbing it down...</span>
                    </div>
                  ) : explanation ? (
                    <div className="easy-board-content prose prose-sm prose-amber max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {explanation}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-24 px-8 text-center opacity-30">
                      <Lightbulb className="h-10 w-10 text-amber-500 mb-3" />
                      <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest leading-loose">
                        Type a phrase or click help above to see it simplified here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
