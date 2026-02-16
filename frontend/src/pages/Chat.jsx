import { useState, useRef, useEffect } from 'react';
import { Trash2, ChevronDown, FileText, Sparkles, Paperclip, Mic, CornerDownLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import * as chatService from '../services/chatService';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';
import { ChatInput } from '@/components/ui/chat-input';
import { Button } from '@/components/ui/button';

export default function Chat() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    chatService.getChatHistory().then(setMessages).catch(() => {});
  }, [fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const readyDocs = documents.filter(d => d.status === 'ready');

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput('');
    setLoading(true);

    try {
      const result = await chatService.sendQuery(query, selectedDocId);
      setMessages(prev => [...prev, result]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        query,
        answer: `Error: ${err.message}`,
        sources: [],
        timestamp: new Date().toISOString(),
      }]);
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

  const suggestions = [
    'Summarize the key concepts from my materials',
    'What are the most important topics?',
    'Explain the main ideas in simple terms',
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Chat with Your Materials</h1>
        <div className="flex items-center gap-2">
          {readyDocs.length > 0 && (
            <select
              value={selectedDocId || ''}
              onChange={e => setSelectedDocId(e.target.value || null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Documents</option>
              {readyDocs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.originalName}</option>
              ))}
            </select>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && !loading && (
          <div className="text-center py-16">
            <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Ask a question about your study materials</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="space-y-3">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-primary-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-md max-w-[80%]">
                <p className="text-sm">{msg.query}</p>
              </div>
            </div>

            {/* AI response */}
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-md max-w-[85%]">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.answer}</ReactMarkdown>
                </div>

                {/* Sources */}
                {msg.sources?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => toggleSource(msg.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <FileText className="h-3 w-3" />
                      {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSources[msg.id] ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSources[msg.id] && (
                      <div className="mt-2 space-y-1">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="text-xs p-2 bg-white rounded border border-gray-100">
                            <p className="font-medium text-gray-700">{src.documentName}</p>
                            {src.heading && <p className="text-gray-500">{src.heading}</p>}
                            <p className="text-gray-400 mt-1 line-clamp-2">{src.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-md">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-4">
        <form
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
        >
          <ChatInput
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question about your study materials..."
            className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
            disabled={loading}
          />
          <div className="flex items-center p-3 pt-0">
            <Button variant="ghost" size="icon" type="button">
              <Paperclip className="size-4" />
              <span className="sr-only">Attach file</span>
            </Button>

            <Button variant="ghost" size="icon" type="button">
              <Mic className="size-4" />
              <span className="sr-only">Use Microphone</span>
            </Button>

            <Button
              type="submit"
              size="sm"
              className="ml-auto gap-1.5"
              disabled={!input.trim() || loading}
            >
              Send Message
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
