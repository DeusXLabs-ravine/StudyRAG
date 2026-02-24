import { useState, useRef, useEffect } from 'react';
import { Trash2, FileText, Sparkles, Brain, Lightbulb, ArrowUp, ImageIcon, Globe, MessageSquare, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as chatService from '../services/chatService';
import useDocumentStore from '../store/documentStore';
import TutorMessage from '../components/chat/TutorMessage';
import { ChatInput } from '@/components/ui/chat-input';

export default function Chat() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isPhotoActive, setIsPhotoActive] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    chatService.getChatHistory().then(data => {
      if (Array.isArray(data)) setMessages(data);
    }).catch(() => { });
  }, [fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    setInput('');
    setLoading(true);

    try {
      const optimisticMsg = {
        id: Date.now().toString(),
        query,
        answer: '',
        sources: [],
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMsg]);

      const result = await chatService.sendQuery(query, selectedDocId || null);

      setMessages(prev => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        if (newMsgs[lastIdx]) {
          newMsgs[lastIdx] = result;
        }
        return newMsgs;
      });
    } catch (err) {
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        if (newMsgs[lastIdx]) {
          newMsgs[lastIdx] = {
            ...newMsgs[lastIdx],
            answer: `I encountered an error: ${err.message}`,
          };
        }
        return newMsgs;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await chatService.clearChatHistory();
    setMessages([]);
  };

  const toggleSource = (msgId) => {
    setExpandedSources(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIsPhotoActive(true);
    }
  };

  return (
    <div className="flex bg-white h-[calc(100vh-5rem)] overflow-hidden w-full relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {/* Sidebar - No Mocks */}
      <div className="w-64 md:w-72 bg-[#fcfdff] border-r border-[#f1f5f9] hidden md:flex flex-col flex-shrink-0 z-10">
        <div className="p-6">
          <button
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#e2e8f0] text-[#0f172a] font-bold text-sm rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95 mb-10"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>

          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-black uppercase text-[#94a3b8] tracking-[0.2em] mb-4 px-2">History</h3>
              <div className="space-y-1">
                {messages.length > 0 ? (
                  <button className="w-full flex items-center gap-3 text-left px-3 py-2.5 text-sm text-blue-600 bg-blue-50 rounded-xl font-bold border border-blue-100">
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-white">
        {/* Net Background */}
        <div
          className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(#0ea5e9 1px, transparent 1px),
              linear-gradient(90deg, #0ea5e9 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Messages list */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-24 pt-10 pb-32 space-y-10 relative z-10"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-full py-10 text-center max-w-xl mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-[#f0f9ff] rounded-[2.5rem] flex items-center justify-center mb-8 border border-[#e0f2fe] shadow-inner"
              >
                <Sparkles className="h-10 w-10 text-[#0ea5e9]" />
              </motion.div>
              <h1 className="text-4xl font-black text-[#0f172a] mb-3 tracking-tight">What's the plan?</h1>
              <p className="text-[#64748b] mb-10 font-semibold text-base">
                Ask anything about your study materials or let's start a new lesson.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className="relative z-10 max-w-4xl mx-auto">
              <TutorMessage
                msg={{
                  ...msg,
                  text: msg.answer || msg.query,
                  role: msg.answer ? 'tutor' : 'student'
                }}
                isCompact={false}
                onAction={(action) => {
                  if (action.type === 'quiz_answer') handleSend(action.answer);
                }}
              />
              {msg.answer && msg.sources?.length > 0 && (
                <div className="flex justify-start sm:pl-16 mb-8 -mt-6">
                  <div className="max-w-[90%] w-full">
                    <button
                      onClick={() => toggleSource(msg.id)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b] hover:text-[#0ea5e9] transition-colors bg-white px-3 py-1.5 rounded-lg border border-[#e2e8f0] shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {msg.sources.length} sources referenced
                    </button>
                    <AnimatePresence>
                      {expandedSources[msg.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-3 pl-4 border-l-2 border-[#bae6fd] overflow-hidden"
                        >
                          {msg.sources.map((src, i) => (
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
              <div className="flex items-center gap-1.5 p-4 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                <span className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-10" />
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white to-transparent pt-16 pb-8 px-4 z-30 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <div className="bg-white border border-[#e2e8f0] focus-within:border-[#7dd3fc] focus-within:ring-4 focus-within:ring-[#f0f9ff] rounded-[2.5rem] shadow-2xl shadow-[#e2e8f0]/40 p-2 transition-all">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex flex-col"
              >
                <div className="flex items-end px-4 pt-3">
                  <ChatInput
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask Sage anything..."
                    className="min-h-[48px] max-h-[200px] resize-none bg-transparent border-0 px-1 py-1 shadow-none focus-visible:ring-0 text-base font-medium text-[#0f172a] placeholder:text-[#94a3b8] flex-1"
                    disabled={loading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="ml-3 mb-1 h-11 w-11 flex text-white items-center justify-center bg-[#0f172a] rounded-full shadow-lg transition-all hover:bg-black active:scale-95 flex-shrink-0 disabled:opacity-20"
                  >
                    <ArrowUp className="h-5 w-5" strokeWidth={3} />
                  </motion.button>
                </div>

                <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={triggerFileUpload}
                      className={`p-2 rounded-xl transition-all flex items-center gap-2 ${isPhotoActive ? 'text-[#0ea5e9] bg-[#f0f9ff] border border-[#e0f2fe]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'}`}
                      title="Attach Image"
                    >
                      <ImageIcon className="h-5 w-5" />
                      {isPhotoActive && <span className="text-[10px] font-black uppercase tracking-wider pr-1">Image Loaded</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                      className={`p-2 rounded-xl transition-all flex items-center gap-2 ${isWebSearchEnabled ? 'text-[#0ea5e9] bg-[#f0f9ff] border border-[#e0f2fe]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]'}`}
                      title="Web Search"
                    >
                      <Globe className="h-5 w-5" />
                      {isWebSearchEnabled && <span className="text-[10px] font-black uppercase tracking-wider pr-1">Web Active</span>}
                    </button>

                    <div className="h-4 w-px bg-[#f1f5f9] mx-2" />

                    <div className="relative flex items-center group">
                      <select
                        value={selectedDocId || ''}
                        onChange={e => setSelectedDocId(e.target.value)}
                        className="bg-[#f8fafc] border border-transparent hover:border-[#e2e8f0] text-[11px] font-bold text-[#475569] py-1.5 pl-3 pr-8 rounded-xl outline-none cursor-pointer appearance-none transition-all"
                      >
                        <option value="">Knowledge Vault</option>
                        {readyDocs.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.originalName || doc.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8] pointer-events-none" />
                    </div>
                  </div>

                  <p className="text-[10px] font-black text-[#cbd5e1] uppercase tracking-[0.25em] hidden sm:block">
                    {loading ? 'SAGE PROCESSING' : 'SAGE 1.5 PRO'}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
