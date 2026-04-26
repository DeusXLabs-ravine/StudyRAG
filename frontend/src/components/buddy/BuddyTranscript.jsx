import { useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bookmark, 
  BookOpen, 
  Loader2, 
  ExternalLink, 
  Image as ImageIcon,
  BrainCircuit,
  ArrowDown
} from 'lucide-react';
import useBuddyStore from '../../store/buddyStore';
import { getGeneratedDiagramImageUrl } from '../../services/diagramService';

function ToolEvent({ tool }) {
  const isPending = tool.state === 'pending';
  const [imageUrl, setImageUrl] = useState(null);

  // Load image if it's an illustration tool and done
  useEffect(() => {
    if (tool.name === 'generate_illustration' && tool.state === 'done' && tool.result?.diagramId) {
      getGeneratedDiagramImageUrl(tool.result.diagramId).then(setImageUrl).catch(() => {});
    }
  }, [tool.name, tool.state, tool.result?.diagramId]);

  if (tool.name === 'search_external_knowledge') {
    const result = tool.result;
    return (
      <div className="my-3 mx-1">
        {isPending ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/40 backdrop-blur-md border border-stone-200/50 text-stone-500 text-[13px] shadow-sm animate-pulse">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
              <Search className="w-4 h-4 text-stone-400" />
            </div>
            <span>Buddy is searching the web...</span>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50/50 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <Search className="w-3.5 h-3.5" />
                Web Intelligence
              </div>
              <span className="text-[10px] text-stone-400 font-medium px-2 py-0.5 rounded-full bg-white border border-stone-100">
                {result?.query || tool.args?.query}
              </span>
            </div>
            
            <div className="p-4">
              {result?.summary && (
                <p className="text-[13.5px] text-stone-700 leading-relaxed font-light mb-4">
                  {result.summary}
                </p>
              )}
              
              {result?.sources?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-stone-400 uppercase font-bold tracking-tight px-1">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-stone-50 border border-stone-100 text-[11px] text-stone-600 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all duration-300 cursor-pointer max-w-[200px]"
                      >
                        <div className="w-5 h-5 rounded-full bg-white border border-stone-100 flex items-center justify-center group-hover:bg-white/10 group-hover:border-transparent">
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400 group-hover:text-white" />
                        </div>
                        <span className="truncate">{s.title || s.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tool.name === 'generate_illustration') {
    return (
      <div className="my-4 mx-1">
        {isPending ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/40 backdrop-blur-md border border-stone-200/50 text-stone-500 text-[13px] shadow-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <span>Creating a visual for you...</span>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
             <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50/30 border-b border-indigo-100/50 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                <ImageIcon className="w-3.5 h-3.5" />
                Visual Illustration
              </div>
              <div className="p-3">
                {imageUrl ? (
                  <div className="relative group rounded-xl overflow-hidden aspect-video bg-stone-100 border border-stone-100">
                    <img 
                      src={imageUrl} 
                      alt={tool.args?.prompt || 'Illustration'} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                       <p className="text-[12px] text-white font-medium line-clamp-1">{tool.args?.prompt}</p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-stone-100 rounded-xl flex flex-col items-center justify-center text-stone-400 gap-2">
                    <ImageIcon className="w-8 h-8 opacity-20" />
                    <span className="text-[11px] font-medium">Image processing...</span>
                  </div>
                )}
                {tool.result?.explanation && (
                  <p className="mt-3 px-1 text-[13px] text-stone-600 leading-relaxed italic">
                    "{tool.result.explanation}"
                  </p>
                )}
              </div>
          </div>
        )}
      </div>
    );
  }

  if (tool.name === 'save_note') {
    return (
      <div className="my-2 mx-1">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 shadow-sm text-amber-900 text-[12.5px] transition-all hover:bg-amber-100">
          <div className="w-5 h-5 rounded-full bg-amber-200/50 flex items-center justify-center">
            <Bookmark className="w-3 h-3 text-amber-700" />
          </div>
          {isPending ? 'Saving note...' : (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Clipped to Notebook</span>
              {tool.args?.content && (
                <span className="text-amber-700/70 font-normal truncate max-w-[140px]">· {tool.args.content}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tool.name === 'glance_document' && isPending) {
    return (
      <div className="my-2 mx-1">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-stone-100/80 backdrop-blur-sm border border-stone-200/50 text-stone-600 text-[12.5px]">
          <BrainCircuit className="w-3.5 h-3.5 text-stone-400 animate-pulse" />
          <span>Buddy is skimming context...</span>
        </div>
      </div>
    );
  }

  return null;
}

export default function BuddyTranscript({ className = '', maxLines = 80 }) {
  const transcript = useBuddyStore(s => s.live.transcript);
  const tools = useBuddyStore(s => s.live.tools);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Merge transcript messages and tool events into a single chronological feed.
  const feed = useMemo(() => {
    const messages = transcript.slice(-maxLines).map(t => ({ kind: 'message', ...t }));
    const events = tools.slice(-30).map(t => ({ kind: 'tool', ...t }));
    return [...messages, ...events].sort((a, b) => a.ts - b.ts);
  }, [transcript, tools, maxLines]);

  // Group consecutive same-role messages together for compactness.
  const grouped = useMemo(() => {
    const out = [];
    for (const item of feed) {
      if (item.kind === 'tool') {
        out.push(item);
        continue;
      }
      const prev = out[out.length - 1];
      if (prev && prev.kind === 'message' && prev.role === item.role && (item.ts - prev.lastTs) < 4000) {
        prev.text += ' ' + item.text;
        prev.lastTs = item.ts;
      } else {
        out.push({ ...item, lastTs: item.ts });
      }
    }
    return out;
  }, [feed]);

  // Smooth scroll to bottom whenever the feed grows
  useEffect(() => {
    if (bottomRef.current && !showScrollBottom) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [grouped.length, grouped[grouped.length - 1]?.text, grouped[grouped.length - 1]?.state, showScrollBottom]);

  // Track scroll position to show/hide "Jump to bottom"
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 150;
      setShowScrollBottom(!isAtBottom);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  if (!grouped.length) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 text-center px-8 py-12 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center border border-stone-100">
          <BookOpen className="w-6 h-6 text-stone-300" />
        </div>
        <div className="space-y-1">
          <p className="text-[13.5px] font-medium text-stone-400">Your session transcript</p>
          <p className="text-[12px] text-stone-400 leading-relaxed max-w-[200px]">
            Key insights, web searches, and notes will appear here as you talk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollRef}
        className={`overflow-y-auto px-3 py-4 space-y-4 scroll-smooth scrollbar-hide flex-1 ${className}`}
        aria-live="polite"
        aria-atomic="false"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {grouped.map((item, idx) => {
            if (item.kind === 'tool') {
              const visible = item.name === 'search_external_knowledge' || 
                             item.name === 'save_note' ||
                             item.name === 'generate_illustration' ||
                             (item.name === 'glance_document' && item.state === 'pending');
              if (!visible) return null;
              return (
                <motion.div
                  key={item.ts + '-tool-' + idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  <ToolEvent tool={item} />
                </motion.div>
              );
            }

            return (
              <motion.div
                key={item.ts + '-' + idx}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className={`flex w-full ${item.role === 'you' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'relative max-w-[85%] px-4 py-2.5 rounded-[1.25rem] text-[14.5px] leading-relaxed shadow-sm',
                    item.role === 'you'
                      ? 'buddy-bubble-user rounded-br-sm'
                      : 'buddy-bubble-buddy rounded-bl-sm',
                  ].join(' ')}
                >
                  {item.text}
                  
                  {/* Visual tail indicator */}
                  <div className={[
                    'absolute bottom-0 w-4 h-4',
                    item.role === 'you' 
                      ? 'right-[-2px] text-slate-800' 
                      : 'left-[-2px] text-white/70'
                  ].join(' ')}>
                    <svg viewBox="0 0 16 16" className="w-full h-full fill-current">
                      {item.role === 'you' 
                        ? <path d="M0,16 Q8,16 16,0 L16,16 Z" />
                        : <path d="M16,16 Q8,16 0,0 L0,16 Z" />
                      }
                    </svg>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} className="h-px w-full shrink-0" />
      </div>

      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              setShowScrollBottom(false);
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-stone-900 text-white text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-stone-800 transition-colors z-20"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            New Messages
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
