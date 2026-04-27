import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { FileText, Compass, ArrowUp, Globe, MessageSquare, Plus, ChevronDown, Menu, X, Image as ImageIcon, Mic, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as chatService from '../services/chatService';
import useDocumentStore from '../store/documentStore';
import useGameStore from '../store/gameStore';
import useSettingsStore from '../store/settingsStore';
import useVoiceInput from '../hooks/useVoiceInput';
import TutorMessage from '../components/chat/TutorMessage';
import XpBar from '../components/chat/XpBar';
import XpPopup from '../components/chat/XpPopup';
import AchievementToast from '../components/chat/AchievementToast';
import FormulaInput from '../components/chat/FormulaInput';
import InputPreview from '../components/chat/InputPreview';
import { ChatInput } from '@/components/ui/chat-input';
import { MorphingSquare } from '../components/ui/morphing-square';
import GeminiLiveTeacher from '../components/teach/GeminiLiveTeacher';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/paywall/UpgradeModal';
import PremiumBadge from '../components/common/PremiumBadge';
import {
  appendMessageToChatSession,
  createChatSession,
  hydrateChatSessions,
  loadActiveChatSessionId,
  loadStoredChatSessions,
  replaceMessageInChatSession,
  resolveActiveChatSessionId,
  saveActiveChatSessionId,
  saveStoredChatSessions,
  upsertChatSession,
} from '../utils/chatSessions';

function formatSessionUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getSessionPreviewText(session) {
  const previewMessage = [...(session.messages || [])]
    .reverse()
    .find(message => typeof message.text === 'string' && message.text.trim());

  if (!previewMessage) {
    return 'No messages yet';
  }

  const preview = previewMessage.text.trim().replace(/\s+/g, ' ');
  if (preview.length <= 72) {
    return preview;
  }

  return `${preview.slice(0, 71).trimEnd()}...`;
}

// Sidebar extracted outside Chat to prevent re-creation on every keystroke
const SidebarContent = memo(function SidebarContent({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onCloseSidebar,
}) {
  const visibleSessions = (sessions || []).filter(
    session => session.messages?.length > 0 || session.id === activeSessionId,
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <XpBar />
      </div>

      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#e2e8f0] text-[#0f172a] font-bold text-sm rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95 mb-10"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </button>

      <div className="space-y-6 flex-1 overflow-y-auto">
        <div>
          <h3 className="text-[10px] font-black uppercase text-[#94a3b8] tracking-[0.2em] mb-4 px-2">History</h3>
          <div className="space-y-1">
            {visibleSessions.length > 0 ? (
              visibleSessions.map(session => {
                const isActive = session.id === activeSessionId;

                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseSidebar();
                    }}
                    className={`w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-xl border transition-all ${
                      isActive
                        ? 'text-blue-600 bg-blue-50 font-bold border-blue-100'
                        : 'text-[#334155] bg-white hover:bg-[#f8fafc] border-transparent'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 opacity-70 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm">{session.title}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8] flex-shrink-0">
                          {formatSessionUpdatedAt(session.updatedAt)}
                        </span>
                      </div>
                      <p className="truncate text-[11px] font-medium text-[#64748b] mt-1">
                        {getSessionPreviewText(session)}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-xs text-[#94a3b8] font-medium italic">No recent chats</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Chat() {
  const { documents, fetchDocuments } = useDocumentStore();
  // Use tutor-style messages: { role, text, blocks?, webSources?, timestamp }
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isPhotoActive, setIsPhotoActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTeachOpen, setIsTeachOpen] = useState(false);
  const [selectedTeachDocId, setSelectedTeachDocId] = useState(null);
  const [showTeachDocPicker, setShowTeachDocPicker] = useState(false);
  const [showTeachUpgrade, setShowTeachUpgrade] = useState(false);
  const { canTeach } = useSubscription();
  const [lastMessageTime, setLastMessageTime] = useState(Date.now());
  const voiceInputEnabled = useSettingsStore(state => state.settings.a11y_voice_input === 'true');
  const { isListening: isVoiceListening, isSupported: isVoiceSupported, toggle: voiceToggle } = useVoiceInput({
    onTranscript: (text) => setInput(prev => prev + (prev ? ' ' : '') + text),
  });
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatTextareaRef = useRef(null);
  const teachPickerRef = useRef(null);

  const activeSession = chatSessions.find(session => session.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    let cancelled = false;

    fetchDocuments();

    const initializeSessions = (legacyHistory = []) => {
      const nextSessions = hydrateChatSessions({
        storedSessions: loadStoredChatSessions(),
        legacyHistory,
      });
      const nextActiveSessionId = resolveActiveChatSessionId(
        nextSessions,
        loadActiveChatSessionId(),
      );

      if (cancelled) return;

      setChatSessions(nextSessions);
      setActiveSessionId(nextActiveSessionId);

      const nextActiveSession = nextSessions.find(session => session.id === nextActiveSessionId);
      setSelectedDocId(nextActiveSession?.documentId || '');
    };

    chatService.getChatHistory()
      .then(data => initializeSessions(Array.isArray(data) ? data : []))
      .catch(() => initializeSessions());

    return () => {
      cancelled = true;
    };
  }, [fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (chatSessions.length === 0) return;
    saveStoredChatSessions(chatSessions);
  }, [chatSessions]);

  useEffect(() => {
    saveActiveChatSessionId(activeSessionId);
  }, [activeSessionId]);

  // Close teach doc picker when clicking outside
  useEffect(() => {
    if (!showTeachDocPicker) return;
    const handleClickOutside = (e) => {
      if (teachPickerRef.current && !teachPickerRef.current.contains(e.target)) {
        setShowTeachDocPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTeachDocPicker]);

  useEffect(() => {
    if (!activeSessionId) return;

    setChatSessions(prev => {
      const currentSession = prev.find(session => session.id === activeSessionId);
      if (!currentSession) return prev;

      const nextDocumentId = selectedDocId || null;
      if (currentSession.documentId === nextDocumentId) {
        return prev;
      }

      return upsertChatSession(prev, {
        ...currentSession,
        documentId: nextDocumentId,
      });
    });
  }, [activeSessionId, selectedDocId]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  // ─── Add message helper ────────────────────────────────────
  const ensureActiveSession = useCallback(() => {
    if (activeSessionId) {
      return activeSessionId;
    }

    const nextSession = createChatSession();
    setChatSessions(prev => upsertChatSession(prev, nextSession));
    setActiveSessionId(nextSession.id);
    return nextSession.id;
  }, [activeSessionId]);

  const updateSession = useCallback((sessionId, updater) => {
    setChatSessions(prev => {
      const existingSession = prev.find(session => session.id === sessionId)
        || createChatSession({ id: sessionId, documentId: selectedDocId || null });
      return upsertChatSession(prev, updater(existingSession));
    });
  }, [selectedDocId]);

  const addMessage = useCallback((msg, sessionId = activeSessionId || ensureActiveSession()) => {
    updateSession(sessionId, session => appendMessageToChatSession(
      {
        ...session,
        documentId: selectedDocId || session.documentId || null,
      },
      { ...msg, timestamp: msg.timestamp || Date.now() },
    ));
  }, [activeSessionId, ensureActiveSession, selectedDocId, updateSession]);

  const patchMessage = useCallback((sessionId, predicate, updater) => {
    updateSession(sessionId, session => replaceMessageInChatSession(session, predicate, updater));
  }, [updateSession]);

  const handleSelectSession = useCallback((sessionId) => {
    const nextSession = chatSessions.find(session => session.id === sessionId);
    setActiveSessionId(sessionId);
    setSelectedDocId(nextSession?.documentId || '');
    setExpandedSources({});
  }, [chatSessions]);

  // ─── Game request handler ──────────────────────────────────
  const handleGameRequest = async (gameType, sessionId = activeSessionId || ensureActiveSession()) => {
    if (loading) return;
    if (!selectedDocId) {
      addMessage({ role: 'tutor', text: 'Please select a document first so I can generate a game from your study materials!' }, sessionId);
      return;
    }

    setLoading(true);
    try {
      // Get modules for the selected document to pick one
      const { default: api } = await import('../services/api');
      const { data } = await api.get('/modules', { params: { documentId: selectedDocId } });
      const modules = data.modules || [];
      if (modules.length === 0) {
        addMessage({ role: 'tutor', text: 'No modules found for this document yet. Upload a document and wait for processing to complete!' }, sessionId);
        return;
      }

      // Pick a random module
      const randomModule = modules[Math.floor(Math.random() * modules.length)];
      const gameBlock = await useGameStore.getState().generateGame(randomModule.id, gameType);

      if (gameBlock) {
        addMessage({
          role: 'tutor',
          text: gameBlock.type === 'speed_round' ? "Lightning round! Answer as fast as you can:" :
            gameBlock.type === 'matching' ? "Match the terms with their definitions:" :
              gameBlock.type === 'fill_blank' ? "Fill in the missing words:" :
                "Let's test your knowledge!",
          blocks: [gameBlock],
        }, sessionId);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || '';
      const isOverload = errMsg.includes('high demand') || errMsg.includes('503');
      addMessage({
        role: 'tutor',
        text: isOverload
          ? "The AI is experiencing high demand right now. Try again in a few seconds!"
          : "Couldn't generate a game right now. Try again in a moment!",
      }, sessionId);
    } finally {
      setLoading(false);
    }
  };

  // ─── Game complete handler ─────────────────────────────────
  const handleGameComplete = async (result, sessionId = activeSessionId || ensureActiveSession()) => {
    try {
      const { type: _actionType, ...gameResult } = result;
      const submitResult = await useGameStore.getState().submitResult(gameResult);
      if (submitResult) {
        addMessage({
          role: 'tutor',
          text: submitResult.isPerfect ? "Perfect score!" :
            gameResult.correct > gameResult.total / 2 ? "Great job!" : "Good effort! Keep practicing.",
          blocks: [{
            type: 'xp_summary',
            earned: submitResult.xpEarned || 0,
            total: submitResult.totalXP || 0,
            streak: submitResult.streak || 0,
            newAchievements: submitResult.newAchievements || [],
          }],
        }, sessionId);
        useGameStore.getState().fetchStats();
      }
    } catch { /* silent */ }
  };

  // ─── Diagram generation handler ─────────────────────────────
  const handleDiagramRequest = async (topic, sessionId = activeSessionId || ensureActiveSession()) => {
    if (loading) return;
    if (!selectedDocId) {
      addMessage({ role: 'tutor', text: 'Select a document first so I can generate a diagram from your study materials!' }, sessionId);
      return;
    }

    setLoading(true);
    addMessage({ role: 'tutor', text: `Generating a visual for **${topic || 'this topic'}**... This may take a moment.` }, sessionId);

    try {
      const { default: api } = await import('../services/api');
      // Get modules to find a relevant one
      const { data } = await api.get('/modules', { params: { documentId: selectedDocId } });
      const modules = data.modules || [];
      if (modules.length === 0) {
        addMessage({ role: 'tutor', text: 'No modules found for this document yet.' }, sessionId);
        return;
      }

      // Find a module matching the topic, or pick first
      const targetModule = (topic
        ? modules.find(m => m.title?.toLowerCase().includes(topic.toLowerCase()) || m.topic?.toLowerCase().includes(topic.toLowerCase()))
        : null) || modules[0];

      const { generateDiagramForTopic, getModuleDiagrams } = await import('../services/diagramService');
      await generateDiagramForTopic({
        topic: topic || targetModule.topic || targetModule.title,
        moduleId: targetModule.id,
        documentId: selectedDocId,
        diagramType: 'auto',
        teachingLevel: 'intermediate',
      }, sessionId);

      const diagrams = await getModuleDiagrams(targetModule.id);
      const newDiagram = diagrams.find(d => d.status === 'ready' && d.diagramCode);
      if (newDiagram?.diagramCode) {
        addMessage({
          role: 'tutor',
          text: `Here's the diagram for **${topic || targetModule.topic}**:\n\n\`\`\`mermaid\n${newDiagram.diagramCode}\n\`\`\`\n\n${newDiagram.description || ''}`,
        }, sessionId);
      } else {
        addMessage({ role: 'tutor', text: 'Visual generated! It may take a moment to render. Check back shortly.' }, sessionId);
      }
    } catch (err) {
      addMessage({ role: 'tutor', text: "Couldn't generate the visual right now. Please try again in a moment!" }, sessionId);
    } finally {
      setLoading(false);
    }
  };

  // ─── Simulation request handler ──────────────────────────────
  const handleSimulationRequest = async (query, sessionId = activeSessionId || ensureActiveSession()) => {
    setLoading(true);
    try {
      const { generateSimulationParams } = await import('../services/simulationService');
      const result = await generateSimulationParams(query, null, selectedDocId || null);
      if (result?.simulationId) {
        addMessage({
          role: 'tutor',
          text: result.explanation || `Here's an interactive **${result.title || result.simulationId}** simulation:`,
          blocks: [{
            type: 'simulation',
            simulationId: result.simulationId,
            params: result.params || {},
            suggestedExperiment: result.suggestedExperiment || null,
          }],
        }, sessionId);
      } else {
        // Fallback — pick a simulation based on keyword matching
        const simMap = {
          projectile: { id: 'projectile_motion', title: 'Projectile Motion' },
          pendulum: { id: 'pendulum', title: 'Pendulum' },
          spring: { id: 'spring_mass', title: 'Spring-Mass System' },
          collision: { id: 'collision', title: '1D Collision' },
        };
        const match = Object.entries(simMap).find(([kw]) => query.toLowerCase().includes(kw));
        const sim = match ? match[1] : simMap.projectile;
        addMessage({
          role: 'tutor',
          text: `Here's an interactive **${sim.title}** simulation! Adjust the parameters and press Play.`,
          blocks: [{ type: 'simulation', simulationId: sim.id, params: {} }],
        }, sessionId);
      }
    } catch {
      // Fallback without backend
      const simMap = {
        projectile: { id: 'projectile_motion', title: 'Projectile Motion' },
        pendulum: { id: 'pendulum', title: 'Pendulum' },
        spring: { id: 'spring_mass', title: 'Spring-Mass System' },
        collision: { id: 'collision', title: '1D Collision' },
      };
      const match = Object.entries(simMap).find(([kw]) => query.toLowerCase().includes(kw));
      const sim = match ? match[1] : simMap.projectile;
      addMessage({
        role: 'tutor',
        text: `Here's an interactive **${sim.title}** simulation! Adjust the parameters and press Play.`,
        blocks: [{ type: 'simulation', simulationId: sim.id, params: {} }],
      }, sessionId);
    } finally {
      setLoading(false);
    }
  };

  // ─── Formula insert handler ────────────────────────────────
  const handleFormulaInsert = (text) => {
    setInput(prev => prev + text);
  };

  // ─── Main send handler ─────────────────────────────────────
  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput('');
    const sessionId = activeSessionId || ensureActiveSession();

    // ── Keyword: game/quiz ──
    if (/\b(quiz me|test me|play.*game|start.*game|challenge me|let'?s play|game time|trivia)\b/i.test(query)) {
      addMessage({ role: 'student', text: query }, sessionId);
      handleGameRequest(null, sessionId);
      return;
    }

    // ── Keyword: calculator ──
    if (/\b(calculator|calc|compute|calculate)\b/i.test(query)) {
      addMessage({ role: 'student', text: query }, sessionId);
      addMessage({ role: 'tutor', text: 'Here\'s a scientific calculator with graphing and unit conversion!', blocks: [{ type: 'calculator' }] }, sessionId);
      return;
    }

    // ── Keyword: simulation ──
    if (/\b(simulat(?:e|ion)|physics lab|projectile|pendulum|spring[\s-]?mass|collision)\b/i.test(query)) {
      addMessage({ role: 'student', text: query }, sessionId);
      handleSimulationRequest(query, sessionId);
      return;
    }

    // ── Keyword: plot/graph ──
    const plotMatch = query.match(/^(?:plot|graph)\s+(?:y\s*=\s*)?(.+)/i);
    if (plotMatch) {
      addMessage({ role: 'student', text: query }, sessionId);
      const exprText = plotMatch[1].trim();
      const rangeMatch = exprText.match(/^(.+?)\s+from\s+([-\d.]+)\s+to\s+([-\d.]+)/i);
      const expression = rangeMatch ? rangeMatch[1].trim() : exprText;
      const xMin = rangeMatch ? parseFloat(rangeMatch[2]) : -10;
      const xMax = rangeMatch ? parseFloat(rangeMatch[3]) : 10;
      const expressions = expression.split(',').map(e => e.trim()).filter(Boolean);
      addMessage({
        role: 'tutor',
        text: `Here's the graph of ${expressions.length > 1 ? 'these functions' : `y = ${expression}`}:`,
        blocks: [{
          type: 'graph',
          expression: expressions.length === 1 ? expressions[0] : undefined,
          expressions: expressions.length > 1 ? expressions : undefined,
          xMin, xMax,
          title: expressions.length > 1 ? 'Multiple Functions' : `y = ${expression}`,
        }],
      }, sessionId);
      return;
    }

    // ── Normal chat send (streaming) ──
    addMessage({ role: 'student', text: query }, sessionId);
    // Add empty tutor message that fills in as tokens arrive
    const streamingId = `stream-${Date.now()}`;
    addMessage({ role: 'tutor', text: '', _streaming: true, _streamId: streamingId, timestamp: Date.now() }, sessionId);
    setLoading(true);

    const durationSeconds = Math.round((Date.now() - lastMessageTime) / 1000);
    setLastMessageTime(Date.now());

    try {
      let accumulated = '';
      for await (const event of chatService.streamQuery(query, selectedDocId || null, durationSeconds)) {
        if (event.type === 'text') {
          accumulated += event.text;
          patchMessage(
            sessionId,
            message => message._streamId === streamingId,
            message => ({ ...message, text: accumulated }),
          );
        } else if (event.type === 'done') {
          patchMessage(
            sessionId,
            message => message._streamId === streamingId,
            message => ({
              ...message,
              _streaming: false,
              _streamId: undefined,
              webSources: event.webSources || [],
              _sources: event.sources || [],
              _id: event.id,
              timestamp: event.timestamp || message.timestamp,
            }),
          );
        } else if (event.type === 'error') {
          patchMessage(
            sessionId,
            message => message._streamId === streamingId,
            message => ({
              ...message,
              text: "Sorry, I'm having trouble responding right now. Please try again in a moment!",
              _streaming: false,
              _streamId: undefined,
            }),
          );
        }
      }
    } catch (err) {
      patchMessage(
        sessionId,
        message => message._streamId === streamingId,
        message => ({
          ...message,
          text: "Sorry, I'm having trouble responding right now. There's a lot of activity on our servers - please try again in a moment!",
          _streaming: false,
          _streamId: undefined,
        }), /*
          ? { ...m, text: "Sorry, I'm having trouble responding right now. There's a lot of activity on our servers — please try again in a moment!", _streaming: false, _streamId: undefined }
          : m
      */);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = useCallback(() => {
    const currentSession = chatSessions.find(session => session.id === activeSessionId);
    if (currentSession && currentSession.messages.length === 0) {
      setSelectedDocId(currentSession.documentId || '');
      setIsSidebarOpen(false);
      return;
    }

    const nextSession = createChatSession();
    setChatSessions(prev => upsertChatSession(prev, nextSession));
    setActiveSessionId(nextSession.id);
    setSelectedDocId('');
    setExpandedSources({});
    setIsSidebarOpen(false);
  }, [activeSessionId, chatSessions]);

  const toggleSource = (msgIdx) => {
    setExpandedSources(prev => ({ ...prev, [msgIdx]: !prev[msgIdx] }));
  };

  const triggerFileUpload = useCallback(() => fileInputRef.current?.click(), []);
  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) setIsPhotoActive(true);
  }, []);
  const handleInputChange = useCallback((e) => setInput(e.target.value), []);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div className="flex bg-white h-[calc(100vh-5rem)] overflow-hidden w-full relative">
      {/* Gamification Overlays */}
      <XpPopup />
      <AchievementToast />

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      {/* Desktop Sidebar */}
      <div className="w-64 md:w-72 bg-[#fcfdff] border-r border-[#f1f5f9] hidden md:flex flex-col flex-shrink-0 z-10">
        <SidebarContent
          sessions={chatSessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onCloseSidebar={closeSidebar}
        />
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-80 bg-white z-[70] md:hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-[#f1f5f9]">
                <span className="text-sm font-black text-[#0f172a] uppercase tracking-widest">Chat History</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-[#94a3b8]"><X className="h-5 w-5" /></button>
              </div>
              <SidebarContent
                sessions={chatSessions}
                activeSessionId={activeSessionId}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onCloseSidebar={closeSidebar}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-white">
        {/* Mobile sidebar toggle */}
        <button onClick={() => setIsSidebarOpen(true)} className="fixed top-24 left-6 z-[40] md:hidden w-14 h-14 bg-white border border-[#e2e8f0] text-[#0f172a] rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50" title="Chat History">
          <Menu className="h-6 w-6" />
        </button>



        {/* Net Background */}
        <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />

        {/* Messages list */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-24 pt-6 md:pt-4 pb-28 space-y-8 md:space-y-10 relative z-10">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-full py-10 text-center max-w-xl mx-auto">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 md:w-20 md:h-20 bg-[#f0f9ff] rounded-3xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 border border-[#e0f2fe] shadow-inner">
                <Compass className="h-8 w-8 md:h-10 md:w-10 text-[#0ea5e9]" strokeWidth={2.3} />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black text-[#0f172a] mb-2 md:mb-3 tracking-tight">What's the plan?</h1>
              <p className="text-[#64748b] mb-4 font-semibold text-sm md:text-base">
                Ask anything about your study materials, or try these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Quiz me', 'Calculator', 'Plot sin(x)', 'Simulate projectile', 'Challenge me'].map(chip => (
                  <button key={chip} onClick={() => handleSend(chip)} className="px-4 py-2 bg-white border border-[#e2e8f0] rounded-full text-xs font-bold text-[#475569] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm">
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className="relative z-10 max-w-4xl mx-auto">
              <TutorMessage
                msg={msg}
                isCompact={false}
                onAction={(action) => {
                  if (action.type === 'quiz_answer') handleSend(action.answer);
                  else if (action.type === 'quiz_request' || action.type === 'game_request') handleGameRequest(null);
                  else if (action.type === 'game_complete') handleGameComplete(action);
                  else if (action.type === 'diagram_request') {
                    handleDiagramRequest(action.title);
                  }
                }}
              />
              {/* Sources expandable */}
              {msg.role === 'tutor' && msg._sources?.length > 0 && (
                <div className="flex justify-start sm:pl-16 mb-8 -mt-6">
                  <div className="max-w-[90%] w-full">
                    <button onClick={() => toggleSource(idx)} className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] hover:text-[#0ea5e9] transition-colors bg-white px-3 py-1.5 rounded-lg border border-[#e2e8f0] shadow-sm">
                      <FileText className="h-3.5 w-3.5" />
                      {msg._sources.length} sources referenced
                    </button>
                    <AnimatePresence>
                      {expandedSources[idx] && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 pl-4 border-l-2 border-[#bae6fd] overflow-hidden">
                          {msg._sources.map((src, i) => (
                            <div key={i} className="text-xs p-4 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                              <p className="font-bold text-[#0f172a] mb-2">{src.documentName}</p>
                              <p className="text-[#475569] leading-relaxed italic">"{src.excerpt}"</p>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start sm:pl-12 relative z-10 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 p-4 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9] shadow-sm">
                <MorphingSquare className="w-4 h-4" message="Sage is processing" messagePlacement="right" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-10" />
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white/80 to-transparent pt-8 pb-4 md:pb-6 px-4 z-30 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <div className="bg-white border border-[#e2e8f0] focus-within:border-[#7dd3fc] focus-within:ring-4 focus-within:ring-[#f0f9ff] rounded-[2rem] md:rounded-3xl shadow-2xl shadow-[#e2e8f0]/40 p-1.5 transition-all">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex flex-col">
                <InputPreview text={input} />
                <div className="flex items-end px-3 pt-2">
                  <ChatInput
                    ref={chatTextareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask Sage anything, or try: quiz me, calculator, plot sin(x)..."
                    className="min-h-[40px] max-h-[160px] resize-none bg-transparent border-0 px-1 py-1 shadow-none focus-visible:ring-0 text-sm md:text-base font-medium text-[#0f172a] placeholder:text-[#94a3b8] flex-1"
                    disabled={loading}
                  />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!input.trim() || loading} className="ml-2 mb-1 h-9 w-9 md:h-10 md:w-10 flex text-white items-center justify-center bg-[#0f172a] rounded-full shadow-lg transition-all hover:bg-black active:scale-95 flex-shrink-0 disabled:opacity-20">
                    <ArrowUp className="h-4 w-4 md:h-5 md:w-5" strokeWidth={3} />
                  </motion.button>
                </div>

                <div className="flex items-center justify-between px-3 py-2 mt-1 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={triggerFileUpload} className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${isPhotoActive ? 'text-[#0ea5e9] bg-[#f0f9ff] border border-[#e0f2fe]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'}`} title="Attach Image">
                      <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                      {isPhotoActive && <span className="text-[9px] font-black uppercase tracking-wider pr-0.5">Image</span>}
                    </button>
                    <button type="button" onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${isWebSearchEnabled ? 'text-[#0ea5e9] bg-[#f0f9ff] border border-[#e0f2fe]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'}`} title="Web Search">
                      <Globe className="h-4 w-4 md:h-5 md:w-5" />
                      {isWebSearchEnabled && <span className="text-[9px] font-black uppercase tracking-wider pr-0.5">Web</span>}
                    </button>

                    {/* Formula Input */}
                    <FormulaInput textareaRef={chatTextareaRef} onInsert={handleFormulaInsert} />

                    {/* Voice Input (accessibility) */}
                    {voiceInputEnabled && isVoiceSupported && (
                      <button
                        type="button"
                        onClick={voiceToggle}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${isVoiceListening
                            ? 'text-violet-600 bg-violet-50 border border-violet-200 shadow-inner'
                            : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'
                          }`}
                        title={isVoiceListening ? 'Stop listening' : 'Voice input'}
                      >
                        <Mic className="h-4 w-4 md:h-5 md:w-5" />
                        {isVoiceListening && <span className="text-[9px] font-black uppercase tracking-wider pr-0.5">Listening</span>}
                      </button>
                    )}

                    {/* Live Teach button + document picker */}
                    <div className="relative" ref={teachPickerRef}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canTeach) { setShowTeachUpgrade(true); return; }
                          if (selectedTeachDocId !== null) {
                            setIsTeachOpen(true);
                          } else {
                            setShowTeachDocPicker(v => !v);
                          }
                        }}
                        className="p-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: 'white',
                          borderRadius: '0.5rem',
                          padding: '0.375rem 0.75rem',
                          fontSize: '11px',
                          fontWeight: 700,
                          boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                        }}
                        title={canTeach ? 'Start live audio teaching with Sage' : 'Upgrade to Pro to use Teach Me'}
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span className="hidden sm:inline">Teach Me</span>
                        {!canTeach && <PremiumBadge variant="chip" tier="pro" className="ml-0.5" />}
                      </button>

                      {/* Document picker dropdown */}
                      <AnimatePresence>
                        {showTeachDocPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full mb-2 right-0 z-50 min-w-[220px] rounded-xl overflow-hidden shadow-2xl"
                            style={{ background: '#1e1b2e', border: '1px solid rgba(139,92,246,0.25)' }}
                          >
                            <div className="px-3 py-2 border-b border-white/10">
                              <p className="text-[10px] font-black uppercase tracking-widest text-purple-300/70">Choose a document</p>
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                              {/* "All documents" option */}
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-white/5 transition-colors group"
                                onClick={() => {
                                  setSelectedTeachDocId('');
                                  setShowTeachDocPicker(false);
                                  setIsTeachOpen(true);
                                }}
                              >
                                <span className="text-xs font-semibold text-white/70 group-hover:text-white truncate">Knowledge Vault (all)</span>
                                <span className="text-[10px] font-bold text-purple-400 flex-shrink-0">Start →</span>
                              </button>
                              {readyDocs.map(doc => (
                                <button
                                  key={doc.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-white/5 transition-colors group"
                                  onClick={() => {
                                    setSelectedTeachDocId(doc.id);
                                    setShowTeachDocPicker(false);
                                    setIsTeachOpen(true);
                                  }}
                                >
                                  <span className="text-xs font-semibold text-white/70 group-hover:text-white truncate">{doc.originalName || doc.name}</span>
                                  <span className="text-[10px] font-bold text-purple-400 flex-shrink-0">Start →</span>
                                </button>
                              ))}
                              {readyDocs.length === 0 && (
                                <p className="px-3 py-3 text-xs text-white/30 italic">No documents ready yet</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-3.5 w-px bg-[#f1f5f9] mx-1" />
                    <div className="relative flex items-center group max-w-[120px] sm:max-w-[200px] min-w-0">
                      <select
                        value={selectedDocId || ''}
                        onChange={e => setSelectedDocId(e.target.value)}
                        className="bg-[#f8fafc] border border-transparent hover:border-[#e2e8f0] text-[10px] md:text-[11px] font-bold text-[#475569] py-1 pl-2 pr-7 rounded-lg outline-none cursor-pointer appearance-none transition-all w-full truncate"
                      >
                        <option value="">Knowledge Vault</option>
                        {readyDocs.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.originalName || doc.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#94a3b8] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade modal for Teach Me */}
      {showTeachUpgrade && (
        <UpgradeModal feature="teach" onClose={() => setShowTeachUpgrade(false)} />
      )}

      {/* Gemini Live Teacher Modal */}
      <GeminiLiveTeacher
        isOpen={isTeachOpen}
        onClose={() => { setIsTeachOpen(false); setSelectedTeachDocId(null); }}
        moduleTitle={selectedTeachDocId
          ? (readyDocs.find(d => d.id === selectedTeachDocId)?.originalName
            || readyDocs.find(d => d.id === selectedTeachDocId)?.name
            || 'Your Document')
          : 'Your Knowledge Vault'
        }
        content=""
        moduleTopic=""
        contextLabel={selectedTeachDocId
          ? readyDocs.find(d => d.id === selectedTeachDocId)?.originalName
            || readyDocs.find(d => d.id === selectedTeachDocId)?.name
          : 'Full Knowledge Vault'
        }
        teachingLevel="intermediate"
        documentId={selectedTeachDocId || null}
      />
    </div>
  );
}
