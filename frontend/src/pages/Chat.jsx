import { useState, useRef, useEffect } from 'react';
import { Trash2, FileText, Sparkles, ArrowUp, Globe, MessageSquare, Plus, ChevronDown, Menu, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as chatService from '../services/chatService';
import useDocumentStore from '../store/documentStore';
import useGameStore from '../store/gameStore';
import TutorMessage from '../components/chat/TutorMessage';
import XpBar from '../components/chat/XpBar';
import XpPopup from '../components/chat/XpPopup';
import AchievementToast from '../components/chat/AchievementToast';
import FormulaInput from '../components/chat/FormulaInput';
import { ChatInput } from '@/components/ui/chat-input';
import { MorphingSquare } from '../components/ui/morphing-square';

export default function Chat() {
  const { documents, fetchDocuments } = useDocumentStore();
  // Use tutor-style messages: { role, text, blocks?, webSources?, timestamp }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isPhotoActive, setIsPhotoActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatTextareaRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    // Load history and convert to tutor message format
    chatService.getChatHistory().then(data => {
      if (Array.isArray(data)) {
        const converted = [];
        for (const msg of data) {
          if (msg.query) converted.push({ role: 'student', text: msg.query, timestamp: msg.timestamp, _id: msg.id });
          if (msg.answer) converted.push({ role: 'tutor', text: msg.answer, webSources: msg.webSources || [], timestamp: msg.timestamp, _id: msg.id, _sources: msg.sources });
        }
        setMessages(converted);
      }
    }).catch(() => { });
  }, [fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  // ─── Add message helper ────────────────────────────────────
  const addMessage = (msg) => {
    setMessages(prev => [...prev, { ...msg, timestamp: msg.timestamp || Date.now() }]);
  };

  // ─── Game request handler ──────────────────────────────────
  const handleGameRequest = async (gameType) => {
    if (loading) return;
    if (!selectedDocId) {
      addMessage({ role: 'tutor', text: 'Please select a document first so I can generate a game from your study materials!' });
      return;
    }

    setLoading(true);
    try {
      // Get modules for the selected document to pick one
      const { default: api } = await import('../services/api');
      const { data } = await api.get('/modules', { params: { documentId: selectedDocId } });
      const modules = data.modules || [];
      if (modules.length === 0) {
        addMessage({ role: 'tutor', text: 'No modules found for this document yet. Upload a document and wait for processing to complete!' });
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
        });
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || '';
      const isOverload = errMsg.includes('high demand') || errMsg.includes('503');
      addMessage({
        role: 'tutor',
        text: isOverload
          ? "The AI is experiencing high demand right now. Try again in a few seconds!"
          : "Couldn't generate a game right now. Try again in a moment!",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Game complete handler ─────────────────────────────────
  const handleGameComplete = async (result) => {
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
        });
        useGameStore.getState().fetchStats();
      }
    } catch { /* silent */ }
  };

  // ─── Diagram generation handler ─────────────────────────────
  const handleDiagramRequest = async (topic) => {
    if (loading) return;
    if (!selectedDocId) {
      addMessage({ role: 'tutor', text: 'Select a document first so I can generate a diagram from your study materials!' });
      return;
    }

    setLoading(true);
    addMessage({ role: 'tutor', text: `Generating a visual for **${topic || 'this topic'}**... This may take a moment.` });

    try {
      const { default: api } = await import('../services/api');
      // Get modules to find a relevant one
      const { data } = await api.get('/modules', { params: { documentId: selectedDocId } });
      const modules = data.modules || [];
      if (modules.length === 0) {
        addMessage({ role: 'tutor', text: 'No modules found for this document yet.' });
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
      });

      const diagrams = await getModuleDiagrams(targetModule.id);
      const newDiagram = diagrams.find(d => d.status === 'ready' && d.diagramCode);
      if (newDiagram?.diagramCode) {
        addMessage({
          role: 'tutor',
          text: `Here's the diagram for **${topic || targetModule.topic}**:\n\n\`\`\`mermaid\n${newDiagram.diagramCode}\n\`\`\`\n\n${newDiagram.description || ''}`,
        });
      } else {
        addMessage({ role: 'tutor', text: 'Visual generated! It may take a moment to render. Check back shortly.' });
      }
    } catch (err) {
      addMessage({ role: 'tutor', text: `Couldn't generate the visual: ${err.message}` });
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

    // ── Keyword: game/quiz ──
    if (/\b(quiz me|test me|play.*game|start.*game|challenge me|let'?s play|game time|trivia)\b/i.test(query)) {
      addMessage({ role: 'student', text: query });
      handleGameRequest(null);
      return;
    }

    // ── Keyword: calculator ──
    if (/\b(calculator|calc|compute|calculate)\b/i.test(query)) {
      addMessage({ role: 'student', text: query });
      addMessage({ role: 'tutor', text: 'Here\'s a scientific calculator with graphing and unit conversion!', blocks: [{ type: 'calculator' }] });
      return;
    }

    // ── Keyword: plot/graph ──
    const plotMatch = query.match(/^(?:plot|graph)\s+(?:y\s*=\s*)?(.+)/i);
    if (plotMatch) {
      addMessage({ role: 'student', text: query });
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
      });
      return;
    }

    // ── Normal chat send ──
    addMessage({ role: 'student', text: query });
    setLoading(true);

    try {
      const result = await chatService.sendQuery(query, selectedDocId || null);
      addMessage({
        role: 'tutor',
        text: result.answer || 'No response.',
        webSources: result.webSources || [],
        _sources: result.sources || [],
        _id: result.id,
      });
    } catch (err) {
      addMessage({ role: 'tutor', text: `I encountered an error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await chatService.clearChatHistory();
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const toggleSource = (msgIdx) => {
    setExpandedSources(prev => ({ ...prev, [msgIdx]: !prev[msgIdx] }));
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setIsPhotoActive(true);
  };

  const SidebarContent = () => (
    <div className="p-6 h-full flex flex-col">
      <button
        onClick={handleClear}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#e2e8f0] text-[#0f172a] font-bold text-sm rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95 mb-10"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </button>

      <div className="space-y-6 flex-1 overflow-y-auto">
        <div>
          <h3 className="text-[10px] font-black uppercase text-[#94a3b8] tracking-[0.2em] mb-4 px-2">History</h3>
          <div className="space-y-1">
            {messages.length > 0 ? (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-full flex items-center gap-3 text-left px-3 py-2.5 text-sm text-blue-600 bg-blue-50 rounded-xl font-bold border border-blue-100"
              >
                <MessageSquare className="h-4 w-4 opacity-70" />
                <span className="truncate">Active Session</span>
              </button>
            ) : (
              <p className="px-3 py-2 text-xs text-[#94a3b8] font-medium italic">No recent chats</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex bg-white h-[calc(100vh-5rem)] overflow-hidden w-full relative">
      {/* Gamification Overlays */}
      <XpPopup />
      <AchievementToast />

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      {/* Desktop Sidebar */}
      <div className="w-64 md:w-72 bg-[#fcfdff] border-r border-[#f1f5f9] hidden md:flex flex-col flex-shrink-0 z-10">
        <SidebarContent />
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
              <SidebarContent />
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

        {/* XP Bar */}
        <div className="px-4 md:px-8 lg:px-24 pt-3 relative z-20">
          <div className="max-w-4xl mx-auto">
            <XpBar />
          </div>
        </div>

        {/* Net Background */}
        <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />

        {/* Messages list */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-24 pt-6 md:pt-4 pb-28 space-y-8 md:space-y-10 relative z-10">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-full py-10 text-center max-w-xl mx-auto">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 md:w-20 md:h-20 bg-[#f0f9ff] rounded-3xl md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-8 border border-[#e0f2fe] shadow-inner">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-[#0ea5e9]" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black text-[#0f172a] mb-2 md:mb-3 tracking-tight">What's the plan?</h1>
              <p className="text-[#64748b] mb-4 font-semibold text-sm md:text-base">
                Ask anything about your study materials, or try these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Quiz me', 'Calculator', 'Plot sin(x)', 'Challenge me'].map(chip => (
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
            <div className="bg-white border border-[#e2e8f0] focus-within:border-[#7dd3fc] focus-within:ring-4 focus-within:ring-[#f0f9ff] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-[#e2e8f0]/40 p-1.5 transition-all">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex flex-col">
                <div className="flex items-end px-3 pt-2">
                  <ChatInput
                    ref={chatTextareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
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
    </div>
  );
}
