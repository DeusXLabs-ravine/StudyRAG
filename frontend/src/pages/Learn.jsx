import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle, Lock, ChevronRight, Calculator, FlaskConical, Cpu, Atom, Globe, Lightbulb, Sparkles, Send, Volume2, Loader2, MessageSquareText, X, Menu, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Image as ImageIcon, GraduationCap, MicOff, ArrowUp, ListTodo, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useModuleStore from '../store/moduleStore';
import useDocumentStore from '../store/documentStore';
import useSettingsStore from '../store/settingsStore';
import useTutorStore from '../store/tutorStore';
import useCourseStore from '../store/courseStore';
import useGameStore from '../store/gameStore';
import { MorphingSquare } from '../components/ui/morphing-square';
import { AILoader } from '../components/ui/ai-loader';
import LessonViewer from '../components/learn/LessonViewer';
import QuizSection from '../components/learn/QuizSection';
import OnboardingTutorial from '../components/learn/OnboardingTutorial';
import TutorMessage from '../components/chat/TutorMessage';
import XpBar from '../components/chat/XpBar';
import XpPopup from '../components/chat/XpPopup';
import AchievementToast from '../components/chat/AchievementToast';
import FormulaInput from '../components/chat/FormulaInput';
import InputPreview from '../components/chat/InputPreview';
import { getTutorGreeting, sendTutorMessage } from '../services/moduleService';
import { prefetchAllChunks } from '../services/ttsService';
import { listDiagrams, getModuleDiagrams, generateDiagramForTopic } from '../services/diagramService';
import { getModuleMedicalResources } from '../services/medicalResourceService';
import { getAestheticPhoto } from '../utils/imageHelpers';
import { recordLearningInteraction } from '../services/analyticsService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Stable reference to avoid Zustand infinite re-render loop
const EMPTY_MESSAGES = [];

export default function Learn() {
  const { documentId: routeDocId } = useParams();
  const [searchParams] = useSearchParams();
  const routeCourseId = searchParams.get('courseId');
  const { modules, currentModule, loading: modulesLoading, generating, fetchModules, fetchCourseModules, stopPolling, setCurrentModule, regenerateQuestions, markModuleCompleted } = useModuleStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const { courses, fetchCourses } = useCourseStore();
  const { settings, tutorial_completed, setTutorialCompleted, fetchSettings } = useSettingsStore();
  const [selectedDocId, setSelectedDocId] = useState(routeDocId || null);
  const [selectedCourseId, setSelectedCourseId] = useState(routeCourseId || null);
  const [viewMode, setViewMode] = useState(routeCourseId ? 'course' : 'document');
  const [showQuiz, setShowQuiz] = useState(false);
  const [regeneratingQuestions, setRegeneratingQuestions] = useState(false);
  const [mobileAssistantOpen, setMobileAssistantOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTutorOpen, setIsTutorOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTutorMaximized, setIsTutorMaximized] = useState(false);

  // Track IDs of modules explicitly unlocked this session so they can't re-lock
  const unlockedIdsRef = useRef(new Set());

  // Diagram State
  const [diagrams, setDiagrams] = useState([]);
  const [generatedDiagrams, setGeneratedDiagrams] = useState([]);
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [medicalResources, setMedicalResources] = useState([]);

  // Sage Tutor State (persisted in Zustand store across navigations)
  const { getConversation, setGreeting, addMessage, tutorInput, setTutorInput, tutorLoading, setTutorLoading } = useTutorStore();
  const moduleId = currentModule?.id;
  const conversation = useTutorStore(state => moduleId && state.conversations[moduleId] ? state.conversations[moduleId] : null);
  const tutorMessages = conversation?.messages || EMPTY_MESSAGES;
  const greetingLoaded = conversation?.greetingLoaded || false;

  useEffect(() => {
    fetchDocuments();
    fetchCourses();
  }, [fetchDocuments, fetchCourses]);

  const getVoiceId = useSettingsStore(state => state.getVoiceId);
  const settings_old = useSettingsStore(state => state.settings);
  const prefetchCancelRef = useRef(null);

  useEffect(() => {
    if (viewMode === 'course' && selectedCourseId) {
      if (fetchCourseModules) fetchCourseModules(selectedCourseId);
      setDiagrams([]);
    } else if (selectedDocId) {
      fetchModules(selectedDocId);
      listDiagrams(selectedDocId).then(setDiagrams).catch(() => setDiagrams([]));
    } else {
      setDiagrams([]);
      stopPolling();
    }
    return () => stopPolling();
  }, [selectedDocId, selectedCourseId, viewMode, fetchModules, fetchCourseModules, stopPolling]);

  // Fetch generated diagrams and medical resources when module changes
  useEffect(() => {
    if (currentModule?.id) {
      getModuleDiagrams(currentModule.id)
        .then(setGeneratedDiagrams)
        .catch(() => setGeneratedDiagrams([]));
      getModuleMedicalResources(currentModule.id)
        .then(setMedicalResources)
        .catch(() => setMedicalResources([]));
    } else {
      setGeneratedDiagrams([]);
      setMedicalResources([]);
    }
  }, [currentModule?.id]);

  // Smart Resume: Auto-select first incomplete module on load
  const lastSelectedDocRef = useRef(null);
  useEffect(() => {
    if (modules?.length > 0 && (selectedDocId || selectedCourseId)) {
      const currentRef = selectedDocId || selectedCourseId;
      if (lastSelectedDocRef.current !== currentRef) {
        lastSelectedDocRef.current = currentRef;
        // Only auto-select if no module is currently active for this specific document/course
        if (!currentModule || (currentModule.documentId !== selectedDocId && currentModule.courseId !== selectedCourseId)) {
          const firstIncomplete = modules.find(m => !m.progress?.completed) || modules[0];
          setCurrentModule(firstIncomplete);
        }
      }
    }
  }, [modules, selectedDocId, selectedCourseId, currentModule, setCurrentModule]);

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

  // Fetch tutor greeting when module changes (skip if already cached in store)
  useEffect(() => {
    if (!currentModule?.id) return;

    const conv = getConversation(currentModule.id);
    if (conv.greetingLoaded) {
      // Already have this greeting cached, don't re-fetch
      return;
    }

    setTutorLoading(true);
    let cancelled = false;

    getTutorGreeting(currentModule.id)
      .then(greeting => {
        if (!cancelled) {
          const text = greeting + "\n\nChallenge: Let's see what you've learned. Are you ready?\n\nVisual: Here's a diagram mapping out these concepts.";
          setGreeting(currentModule.id, text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGreeting(currentModule.id, `Hi there! I'm Sage, your AI tutor. I'm here to help you with **${currentModule.title}**. What would you like to know?`);
        }
      })
      .finally(() => { if (!cancelled) setTutorLoading(false); });

    return () => { cancelled = true; };
  }, [currentModule?.id]);

  const handleModuleSelect = (module) => {
    setCurrentModule(module);
    setShowQuiz(false);
    // Track reading interaction (non-blocking)
    recordLearningInteraction('text_explanation', 'view').catch(() => { });
  };

  const handleTutorSend = async (messageText) => {
    const text = (messageText || tutorInput).trim();
    if (!text || !currentModule || tutorLoading) return;
    setTutorInput('');

    // Track learning style signals from tutor message keywords (non-blocking)
    const lowerText = text.toLowerCase();
    if (/example|analogy|like|imagine|story/.test(lowerText)) {
      recordLearningInteraction('example_analogy', 'request').catch(() => { });
    } else if (/diagram|chart|visual|draw|picture|image/.test(lowerText)) {
      recordLearningInteraction('diagram', 'request').catch(() => { });
    } else if (/step.by.step|walk.*through|how.*do|practice|try/.test(lowerText)) {
      recordLearningInteraction('step_by_step', 'request').catch(() => { });
    } else if (/quiz|test|question/.test(lowerText)) {
      recordLearningInteraction('quiz', 'request').catch(() => { });
    }

    // Detect game/quiz intent from user message
    if (/\b(quiz me|test me|play.*game|start.*game|challenge me|let'?s play|game time|trivia)\b/i.test(text) && currentModule?.id) {
      addMessage(currentModule.id, { role: 'student', text, timestamp: Date.now() });
      // null = random game type (quiz, matching, fill_blank, speed_round)
      handleGameRequest(currentModule.id, null);
      return;
    }

    // Detect calculator intent
    if (/\b(calculator|calc|compute|calculate)\b/i.test(text) && currentModule?.id) {
      addMessage(currentModule.id, { role: 'student', text, timestamp: Date.now() });
      addMessage(currentModule.id, {
        role: 'tutor',
        text: 'Here\'s a scientific calculator with graphing and unit conversion!',
        blocks: [{ type: 'calculator' }],
        timestamp: Date.now(),
      });
      return;
    }

    // Detect plot/graph intent: "plot y=sin(x)", "graph x^2", "plot sin(x) from -5 to 5"
    const plotMatch = text.match(/^(?:plot|graph)\s+(?:y\s*=\s*)?(.+)/i);
    if (plotMatch && currentModule?.id) {
      addMessage(currentModule.id, { role: 'student', text, timestamp: Date.now() });
      const exprText = plotMatch[1].trim();
      // Parse range if provided: "sin(x) from -5 to 5"
      const rangeMatch = exprText.match(/^(.+?)\s+from\s+([-\d.]+)\s+to\s+([-\d.]+)/i);
      const expression = rangeMatch ? rangeMatch[1].trim() : exprText;
      const xMin = rangeMatch ? parseFloat(rangeMatch[2]) : -10;
      const xMax = rangeMatch ? parseFloat(rangeMatch[3]) : 10;

      // Support multiple expressions: "sin(x), cos(x), tan(x)"
      const expressions = expression.split(',').map(e => e.trim()).filter(Boolean);

      addMessage(currentModule.id, {
        role: 'tutor',
        text: `Here's the graph of ${expressions.length > 1 ? 'these functions' : `y = ${expression}`}:`,
        blocks: [{
          type: 'graph',
          expression: expressions.length === 1 ? expressions[0] : undefined,
          expressions: expressions.length > 1 ? expressions : undefined,
          xMin, xMax,
          title: expressions.length > 1 ? 'Multiple Functions' : `y = ${expression}`,
        }],
        timestamp: Date.now(),
      });
      return;
    }

    const studentMsg = { role: 'student', text, timestamp: Date.now() };
    addMessage(currentModule.id, studentMsg);
    setTutorLoading(true);

    try {
      // Build conversation history from current messages (last 20 entries)
      // Note: addMessage already added studentMsg to the store, so conv.messages includes it
      const conv = getConversation(currentModule.id);
      const history = conv.messages.slice(-20).map(m => ({
        role: m.role,
        text: m.text,
      }));
      const { reply, webSources } = await sendTutorMessage(currentModule.id, text, history);
      addMessage(currentModule.id, { role: 'tutor', text: reply, webSources: webSources || [], timestamp: Date.now() });
    } catch {
      addMessage(currentModule.id, { role: 'tutor', text: "Sorry, I hit a snag. Could you try asking that again?", timestamp: Date.now() });
    } finally {
      setTutorLoading(false);
    }
  };

  // ─── Game Request Handler ─────────────────────────────────
  const handleGameRequest = async (moduleId, gameType) => {
    if (!moduleId) return;
    if (tutorLoading) {
      // Don't block game requests — just skip the loading guard
      // Game request while loading, proceeding anyway
    }
    setTutorLoading(true);
    try {
      const gameBlock = await useGameStore.getState().generateGame(moduleId, gameType);
      if (gameBlock) {
        addMessage(moduleId, {
          role: 'tutor',
          text: gameBlock.type === 'speed_round' ? "Lightning round! Answer as fast as you can:" :
            gameBlock.type === 'matching' ? "Match the terms with their definitions:" :
              gameBlock.type === 'fill_blank' ? "Fill in the missing words:" :
                "Let's test your knowledge!",
          blocks: [gameBlock],
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || '';
      const isOverload = errMsg.includes('high demand') || errMsg.includes('503') || errMsg.includes('try again');
      addMessage(currentModule?.id || moduleId, {
        role: 'tutor',
        text: isOverload
          ? "The AI is a bit overloaded right now: high demand! Give it a few seconds and try again. 🔄"
          : "Couldn't generate a game right now. Let's try again in a moment!",
        timestamp: Date.now(),
      });
    } finally {
      setTutorLoading(false);
    }
  };

  // ─── Game Complete Handler ──────────────────────────────────
  const handleGameComplete = async (result) => {
    try {
      // Strip the 'type: game_complete' action type — submitResult needs gameType, score, etc.
      const { type: _actionType, ...gameResult } = result;
      const submitResult = await useGameStore.getState().submitResult(gameResult);
      if (submitResult && currentModule?.id) {
        const xpBlock = {
          type: 'xp_summary',
          earned: submitResult.xpEarned || 0,
          total: submitResult.totalXP || 0,
          streak: submitResult.streak || 0,
          newAchievements: submitResult.newAchievements || [],
        };
        addMessage(currentModule.id, {
          role: 'tutor',
          text: submitResult.isPerfect ? "Perfect score! You're crushing it!" :
            result.correct > result.total / 2 ? "Great job! Keep it up!" :
              "Good effort! Practice makes perfect.",
          blocks: [xpBlock],
          timestamp: Date.now(),
        });
        // Refresh stats
        useGameStore.getState().fetchStats();
      }
    } catch {
      // XP submission failed silently
    }
  };

  const handleGenerateDiagram = async (topicOverride) => {
    if (!currentModule || generatingDiagram) return;
    setGeneratingDiagram(true);

    // Show generating feedback in chat
    addMessage(currentModule.id, {
      role: 'tutor',
      text: `Generating a visual for **${topicOverride || currentModule.topic || currentModule.title}**... This may take a moment.`,
      timestamp: Date.now(),
    });

    try {
      const topic = topicOverride || currentModule.topic || currentModule.title;
      const docId = currentModule.documentId || currentModule.document_id || null;
      const result = await generateDiagramForTopic({
        topic,
        moduleId: currentModule.id,
        documentId: docId,
        diagramType: 'auto',
        teachingLevel: settings.teaching_level || 'intermediate',
      });

      // Refresh diagrams list for LessonViewer
      const updated = await getModuleDiagrams(currentModule.id);
      setGeneratedDiagrams(updated);

      // Also show diagram in chat if it has mermaid code
      const newDiagram = updated.find(d => d.status === 'ready' && d.diagramCode);
      if (newDiagram?.diagramCode) {
        addMessage(currentModule.id, {
          role: 'tutor',
          text: `Here's the diagram for **${topic}**:\n\n\`\`\`mermaid\n${newDiagram.diagramCode}\n\`\`\`\n\n${newDiagram.description || ''}`,
          timestamp: Date.now(),
        });
      } else {
        addMessage(currentModule.id, {
          role: 'tutor',
          text: `Visual generated! Check the lesson board to see it.`,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      addMessage(currentModule.id, {
        role: 'tutor',
        text: `Couldn't generate the visual right now: ${err.message}. Try again in a moment!`,
        timestamp: Date.now(),
      });
    } finally {
      setGeneratingDiagram(false);
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
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Gamification Overlays */}
      <XpPopup />
      <AchievementToast />

      {/* Onboarding Tutorial */}
      {!tutorial_completed && readyDocs.length > 0 && (
        <OnboardingTutorial onComplete={() => setTutorialCompleted(true)} />
      )}
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-700 hover:text-primary"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Learning Journey</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1 font-medium">Master your documents through AI-generated modules.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Course / Document Mode Toggle */}
          {(courses || []).length > 0 && (
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={() => { setViewMode('document'); setSelectedCourseId(null); }}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'document' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Documents
              </button>
              <button
                onClick={() => { setViewMode('course'); setSelectedDocId(null); }}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'course' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FolderOpen className="h-3 w-3 inline mr-1" />
                Courses
              </button>
            </div>
          )}

          {viewMode === 'course' && (courses || []).length > 0 && (
            <div className="relative group flex-1 md:min-w-[280px]">
              <select
                value={selectedCourseId || ''}
                onChange={e => { setSelectedCourseId(e.target.value || null); setSelectedDocId(null); }}
                className="appearance-none w-full px-5 py-3 md:py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm hover:shadow-md cursor-pointer outline-none"
              >
                <option value="">Select a Course...</option>
                {(courses || []).filter(c => c.status === 'ready').map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          )}

          {viewMode === 'document' && readyDocs.length > 0 && (
            <div className="relative group flex-1 md:min-w-[280px]">
              <select
                value={selectedDocId || ''}
                onChange={e => { setSelectedDocId(e.target.value || null); setSelectedCourseId(null); }}
                className="appearance-none w-full px-5 py-3 md:py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm hover:shadow-md cursor-pointer outline-none"
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

          <button
            onClick={() => setIsTutorOpen(!isTutorOpen)}
            className={`hidden xl:flex p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm hover:shadow-md ${isTutorOpen
              ? 'bg-purple-600 border-purple-600 text-white'
              : 'bg-white border-gray-200 text-gray-700 hover:text-purple-600'
              }`}
            title={isTutorOpen ? "Hide Sage" : "Show Sage"}
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!selectedDocId && !selectedCourseId ? (
        <div className="relative sleek-card overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-12 md:p-24 text-center border-0 shadow-2xl">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/learn_empty_state_bg.png"
              alt="Study Environment"
              className="w-full h-full object-cover opacity-80 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/20 via-gray-900/40 to-gray-900/70"></div>
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-xl">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md">Ready to start?</h3>
            <p className="text-gray-200 text-lg max-w-md mx-auto font-medium drop-shadow">Select a document from the menu above to generate your personalized learning path.</p>
          </div>
        </div>
      ) : modulesLoading ? (
        <AILoader text="Sage Building" />
      ) : (modules || []).length === 0 ? (
        generating ? (
          <div className="sleek-card p-12 md:p-20 flex flex-col items-center justify-center gap-6 text-center">
            <AILoader text="Generating Lessons" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Generating your lessons...</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                This usually takes 15-20 seconds. In the meantime, you can <a href="/chat" className="text-primary font-bold hover:underline">chat with your document</a> — it's already ready for questions!
              </p>
            </div>
          </div>
        ) : (
          <div className="sleek-card p-20 text-center">
            <Sparkles className="h-12 w-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No modules yet</h3>
            <p className="text-gray-500">We're still processing this document. Check back in a few moments!</p>
          </div>
        )
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 relative">
          {/* Column 1: Module Picker (Desktop Sidebar) */}
          <AnimatePresence mode='wait'>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="hidden lg:block lg:w-56 xl:w-64 flex-shrink-0"
              >
                <div className="sticky top-8 space-y-6">
                  <ModuleList
                    modules={modules}
                    currentModule={currentModule}
                    isModuleAccessible={isModuleAccessible}
                    handleModuleSelect={handleModuleSelect}
                    getTopicIcon={getTopicIcon}
                    generating={generating}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Column 2: Main Chalkboard (Center) */}
          <div className="flex-1 min-w-0">
            {currentModule ? (
              showQuiz ? (
                <QuizSection
                  module={currentModule}
                  onComplete={() => {
                    markModuleCompleted(currentModule.id);
                    const safeModules = modules || [];
                    const currentIndex = safeModules.findIndex(m => m.id === currentModule.id);
                    if (currentIndex < safeModules.length - 1) {
                      const nextModule = safeModules[currentIndex + 1];
                      unlockedIdsRef.current.add(nextModule.id);
                      setCurrentModule(nextModule);
                    }
                    setShowQuiz(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBack={() => { setShowQuiz(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              ) : (
                <LessonViewer
                  module={currentModule}
                  diagrams={diagrams.filter(d => d.status === 'ready')}
                  teachingLevel={settings.teaching_level || 'intermediate'}
                  generatedDiagrams={generatedDiagrams}
                  onGenerateDiagram={handleGenerateDiagram}
                  generatingDiagram={generatingDiagram}
                  medicalResources={medicalResources}
                  onStartQuiz={async () => {
                    // Track quiz start as kinesthetic interaction
                    recordLearningInteraction('quiz', 'click').catch(() => { });
                    const progress = currentModule.progress;
                    if (progress?.attempts > 0 && !progress?.completed) {
                      setRegeneratingQuestions(true);
                      try {
                        await regenerateQuestions(currentModule.id);
                      } catch (err) {
                        // regeneration failed — UI stays on current questions
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

          {/* Column 3: Sage Tutor Sidebar (Right) */}
          <AnimatePresence mode='wait'>
            {isTutorOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`hidden xl:block flex-shrink-0 transition-all duration-500 z-40 ${isTutorMaximized
                  ? 'fixed bottom-4 right-4 top-28 w-[650px] shadow-2xl rounded-[2.5rem] bg-white border border-blue-50 overflow-hidden'
                  : 'xl:w-80 relative'
                  }`}
              >
                <TutorChat
                  messages={tutorMessages}
                  input={tutorInput}
                  setInput={setTutorInput}
                  onSend={handleTutorSend}
                  loading={tutorLoading}
                  greetingLoaded={greetingLoaded}
                  currentModule={currentModule}
                  isMaximized={isTutorMaximized}
                  setIsMaximized={setIsTutorMaximized}
                  onDiagramRequest={handleGenerateDiagram}
                  onGameRequest={handleGameRequest}
                  onGameComplete={handleGameComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Module Selector (Mobile Drawer) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Modules</h3>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <ModuleList
                  modules={modules}
                  currentModule={currentModule}
                  isModuleAccessible={isModuleAccessible}
                  handleModuleSelect={(mod) => {
                    handleModuleSelect(mod);
                    setIsMobileMenuOpen(false);
                  }}
                  getTopicIcon={getTopicIcon}
                  generating={generating}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Assistant Toggle & Drawer */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileAssistantOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform"
        >
          <MessageSquareText className="h-6 w-6" />
          {tutorMessages.length > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" />
          )}
        </button>

        <AnimatePresence>
          {mobileAssistantOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileAssistantOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-[2.5rem] shadow-2xl z-50 overflow-y-auto"
              >
                <div className="sticky top-0 bg-white px-8 py-4 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-400 to-cyan-300 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100/50">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 leading-none">Sage</h3>
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Knowledge Explorer</span>
                    </div>
                  </div>
                  <button onClick={() => setMobileAssistantOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TutorChat
                    messages={tutorMessages}
                    input={tutorInput}
                    setInput={setTutorInput}
                    onSend={handleTutorSend}
                    loading={tutorLoading}
                    greetingLoaded={greetingLoaded}
                    currentModule={currentModule}
                    isMobile
                    onDiagramRequest={handleGenerateDiagram}
                    onGameRequest={handleGameRequest}
                    onGameComplete={handleGameComplete}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModuleList({ modules, currentModule, isModuleAccessible, handleModuleSelect, getTopicIcon, generating }) {
  const moduleCount = (modules || []).length;
  return (
    <div className="flex flex-col gap-4">
      {/* Generating banner — Refined Premium Aesthetic */}
      {generating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-blue-100 shadow-xl shadow-blue-500/5 relative overflow-hidden group mb-2"
        >
          {/* Background Shimmer Effect */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent skew-x-12"
            />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                <MorphingSquare size="sm" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-0.5">Neural Synthesis</p>
                <h4 className="text-sm font-bold text-gray-900 leading-none">
                  Generating {moduleCount > 0 ? 'More' : ''} Modules
                </h4>
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  {moduleCount} structures built • Harvesting intelligence
                </p>
              </div>
            </div>

            {/* Micro-activity bar */}
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1 bg-blue-500/40 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {Object.entries(
        (modules || []).reduce((acc, mod) => {
          const topic = mod.topic || 'General';
          if (!acc[topic]) acc[topic] = [];
          acc[topic].push(mod);
          return acc;
        }, {})
      ).map(([topic, topicModules], idx) => (
        <div key={topic} className="space-y-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative h-16 rounded-xl overflow-hidden mb-2 flex items-center px-4">
            {/* Topic Background Image */}
            <div className="absolute inset-0 z-0">
              <img
                src={getAestheticPhoto(`topic-${topic}-${idx}`, 300, 100)}
                alt=""
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gray-900/60 mix-blend-multiply"></div>
            </div>

            <h3 className="relative z-10 text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-md">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                {getTopicIcon(topic)}
              </div>
              {topic}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-1">
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
                  className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-left text-sm transition-all shadow-sm ${isActive
                    ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/20 scale-[1.02]'
                    : accessible
                      ? 'text-gray-700 bg-white border border-gray-100 hover:bg-gray-50 hover:translate-x-1'
                      : 'text-gray-400 cursor-not-allowed grayscale opacity-60 bg-gray-50 border-gray-100'
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
    </div>
  );
}

function TutorChat({ messages, input, setInput, onSend, loading, greetingLoaded, currentModule, isMobile, isMaximized, setIsMaximized, onDiagramRequest, onGameRequest, onGameComplete }) {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatTextareaRef = useRef(null);
  const [isPhotoActive, setIsPhotoActive] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const handleFormulaInsert = (text, cursorOffset) => {
    const textarea = chatTextareaRef.current;
    if (!textarea) {
      setInput(prev => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = input.substring(0, start) + text + input.substring(end);
    setInput(newValue);
    const pos = cursorOffset ? start + text.length + cursorOffset : start + text.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = pos;
      textarea.focus();
    }, 0);
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      setIsPhotoActive(true);
      // In a real app, we'd process the file here
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickActions = [
    "I'm confused about this topic",
    "Can you give me an example?",
    "Quiz me on this",
    "Challenge me",
    "calculator",
  ];

  const showChips = greetingLoaded && messages.length <= 1;

  return (
    <div className={`flex flex-col ${isMobile
        ? 'h-[70vh]'
        : isMaximized
          ? 'h-full'
          : 'sticky top-8 h-[calc(100vh-6rem)]'
      }`}>
      {/* Header */}
      {!isMobile && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-none">Sage Tutor</h3>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Topic Expert</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4 text-gray-400" /> : <Maximize2 className="h-4 w-4 text-gray-400" />}
              </button>
              <button
                onClick={() => setIsTutorOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>


        </>
      )}

      {/* XP Bar */}
      <div className="px-3 py-1">
        <XpBar variant="compact" />
      </div>



      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
        style={{
          backgroundColor: '#fdfdff',
          backgroundImage: `
            linear-gradient(rgba(14, 165, 233, 0.08) 1.5px, transparent 1.5px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.08) 1.5px, transparent 1.5px)
          `,
          backgroundSize: '24px 24px'
        }}
      >
        {!greetingLoaded && (
          <div className="flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-sm">
            <MorphingSquare message="Sage is prepping" />
          </div>
        )}

        {messages.map((msg, i) => (
          <TutorMessage
            key={i}
            msg={msg}
            isCompact={!isMobile && !isMaximized}
            onAction={(action) => {
              if (action.type === 'quiz_answer') {
                onSend(action.answer);
              } else if (action.type === 'diagram_request') {
                if (onDiagramRequest) onDiagramRequest(action.title);
              } else if (action.type === 'quiz_request' || action.type === 'game_request') {
                if (onGameRequest) {
                  const modId = currentModule?.id;
                  if (modId) {
                    // null = AI picks a random game type (quiz, matching, fill_blank, speed_round)
                    onGameRequest(modId, null);
                  }
                }
                }
              } else if (action.type === 'game_complete') {
                if (onGameComplete) onGameComplete(action);
              }
            }}
          />
        ))}

        {/* Quick action chips */}
        {showChips && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onSend(action)}
                disabled={loading}
                className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-95 disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
        )}

        {loading && messages.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 shadow-sm w-fit">
            <MorphingSquare className="w-5 h-5" message="Thinking" messagePlacement="right" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 rounded-b-2xl">
        <form
          className="flex flex-col bg-white border border-gray-200 rounded-3xl shadow-sm px-3 py-2 transition-all focus-within:border-purple-300 focus-within:shadow-md"
          onSubmit={e => {
            e.preventDefault();
            onSend();
          }}
        >
          <InputPreview text={input} />
          {/* Top Row: Input and Send Button */}
          <div className="flex items-end w-full">
            <textarea
              ref={chatTextareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim() && !loading) {
                  e.preventDefault();
                  onSend();
                  e.target.style.height = 'auto';
                }
              }}
              placeholder={currentModule ? "Ask anything, or try: plot sin(x), calculator, quiz me..." : "Select a module to start tutoring..."}
              disabled={loading || !currentModule}
              rows={1}
              className="flex-1 px-3 py-1 bg-transparent border-none text-gray-900 text-[13px] font-medium focus:ring-0 outline-none transition-all disabled:opacity-50 placeholder:text-gray-400 resize-none overflow-hidden"
              style={{ minHeight: '32px', maxHeight: '100px' }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!input.trim() || loading || !currentModule}
              className="ml-2 mb-1 p-1.5 bg-blue-600 text-white rounded-full shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:grayscale flex-shrink-0"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.button>
          </div>

          {/* Bottom Row: Tool Icons */}
          <div className="flex items-center justify-between px-2 pb-0 mt-1">
            <div className="flex items-center gap-3 text-[#8b92a5]">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <button
                type="button"
                onClick={triggerFileUpload}
                className={`transition-all flex items-center gap-1.5 ${isPhotoActive ? 'text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100' : 'hover:text-gray-600'}`}
                title="Add Image"
                disabled={!currentModule}
              >
                <ImageIcon className="h-[18px] w-[18px]" />
                {isPhotoActive && <span className="text-[9px] font-black uppercase tracking-wider">Loaded</span>}
              </button>
              <button
                type="button"
                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                className={`transition-all flex items-center gap-1.5 ${isWebSearchEnabled ? 'text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100' : 'hover:text-gray-600'}`}
                title="Web Search"
                disabled={!currentModule}
              >
                <Globe className="h-[18px] w-[18px]" />
                {isWebSearchEnabled && <span className="text-[9px] font-black uppercase tracking-wider">Active</span>}
              </button>
              <button type="button" className="hover:text-gray-600 transition-colors" title="Tutor Mode" disabled={!currentModule}>
                <GraduationCap className="h-[18px] w-[18px]" />
              </button>
              {currentModule && (
                <FormulaInput textareaRef={chatTextareaRef} onInsert={handleFormulaInsert} />
              )}
              {currentModule && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f4f5f7] rounded-md text-[10px] font-bold text-[#444a5e] ml-1 cursor-pointer hover:bg-gray-200 transition-colors">
                  <ListTodo className="h-3 w-3 text-orange-400" />
                  <span>1 material</span>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <button type="button" className="text-[#8b92a5] hover:text-gray-600 transition-colors" title="Voice Input (Muted)" disabled={!currentModule}>
                <MicOff className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
