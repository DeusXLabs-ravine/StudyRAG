import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, ChevronRight, Zap, Trophy, Gamepad2,
    Star, Info, Quote, Globe, ExternalLink, Image as ImageIcon, Activity,
    Copy, Check, StickyNote, BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { segmentMarkdown } from '../../services/tutorUtils';

// Lazy-load heavy components
const MermaidDiagram = lazy(() => import('../learn/MermaidDiagram'));
const InlineQuizBlock = lazy(() => import('./InlineQuizBlock'));
const SpeedRoundBlock = lazy(() => import('./SpeedRoundBlock'));
const FillBlankBlock = lazy(() => import('./FillBlankBlock'));
const MatchingGameBlock = lazy(() => import('./MatchingGameBlock'));
const RunnableCodeBlock = lazy(() => import('./RunnableCodeBlock'));
const InlineChart = lazy(() => import('./InlineChart'));
const CalculatorWidget = lazy(() => import('./CalculatorWidget'));

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

// Enhanced markdown components — all code fences go through RunnableCodeBlock (IDE-style),
// mermaid → diagram, plus styled tables, blockquotes, task lists, hr, images
function useMarkdownComponents(isCompact) {
    return useCallback(() => ({
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeStr = String(children).replace(/\n$/, '');

            // Inline code
            if (inline || (!lang && codeStr.split('\n').length <= 1)) {
                return (
                    <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded-md text-[0.85em] font-mono font-semibold" {...props}>
                        {children}
                    </code>
                );
            }

            // Mermaid diagrams
            if (lang === 'mermaid') {
                return (
                    <Suspense fallback={<div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400">Loading diagram...</div>}>
                        <div className="my-2">
                            <MermaidDiagram code={codeStr} />
                        </div>
                    </Suspense>
                );
            }

            // LaTeX block (```latex or ```tex)
            if (lang === 'latex' || lang === 'tex') {
                return (
                    <div className="my-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center overflow-x-auto">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {`$$${codeStr}$$`}
                        </ReactMarkdown>
                    </div>
                );
            }

            // ALL code blocks → RunnableCodeBlock (handles syntax highlighting + optional execution)
            const runnable = ['python', 'py', 'javascript', 'js', 'typescript', 'ts'].includes(lang?.toLowerCase());
            return (
                <Suspense fallback={<div className="p-3 bg-gray-900 rounded-lg text-xs text-gray-500 animate-pulse">Loading code...</div>}>
                    <RunnableCodeBlock code={codeStr} language={lang || 'text'} runnable={runnable} />
                </Suspense>
            );
        },
        // GFM tables
        table({ children }) {
            return (
                <div className="overflow-x-auto my-3 rounded-xl border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table>
                </div>
            );
        },
        thead({ children }) { return <thead className="bg-gray-50">{children}</thead>; },
        th({ children }) {
            return <th className="px-3 py-2 text-left text-xs font-black text-gray-600 uppercase tracking-wider border-b border-gray-200">{children}</th>;
        },
        td({ children }) { return <td className="px-3 py-2 text-xs font-medium text-gray-700 border-t border-gray-100">{children}</td>; },
        tr({ children, ...props }) { return <tr className="even:bg-gray-50/50 hover:bg-blue-50/30 transition-colors" {...props}>{children}</tr>; },

        // Blockquotes
        blockquote({ children }) {
            return (
                <blockquote className="my-3 pl-4 border-l-4 border-blue-300 bg-blue-50/30 py-2 pr-3 rounded-r-lg italic text-gray-700">
                    {children}
                </blockquote>
            );
        },

        // Horizontal rules
        hr() {
            return <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />;
        },

        // Images
        img({ src, alt }) {
            return (
                <img src={src} alt={alt || ''} className="rounded-xl max-w-full my-2 border border-gray-200 shadow-sm" loading="lazy" />
            );
        },

        // Task list items (GFM)
        li({ children, className, ...props }) {
            const isTask = className === 'task-list-item';
            return (
                <li className={isTask ? 'list-none flex items-start gap-2' : ''} {...props}>
                    {children}
                </li>
            );
        },
        input({ type, checked, ...props }) {
            if (type === 'checkbox') {
                return (
                    <input type="checkbox" checked={checked} readOnly className="mt-1 rounded border-gray-300 text-blue-600 accent-blue-600" {...props} />
                );
            }
            return <input type={type} {...props} />;
        },

        // Links
        a({ href, children }) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-semibold">
                    {children}
                </a>
            );
        },
        // Paragraphs
        p({ children }) {
            return <p className={`${isCompact ? 'mb-2' : 'mb-4'} last:mb-0 leading-relaxed`}>{children}</p>;
        },
        // Lists
        ul({ children }) {
            return <ul className={`list-disc list-outside ml-6 ${isCompact ? 'mb-2' : 'mb-4'} space-y-1`}>{children}</ul>;
        },
        ol({ children }) {
            return <ol className={`list-decimal list-outside ml-6 ${isCompact ? 'mb-2' : 'mb-4'} space-y-1`}>{children}</ol>;
        },
        li({ children }) {
            return <li className="pl-1">{children}</li>;
        },
    }), [isCompact]);
}

// Error boundary for canvas blocks — prevents one broken block from crashing entire chat
function BlockErrorFallback({ type }) {
    return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
            Failed to load {type || 'interactive'} block. Try refreshing.
        </div>
    );
}

// Render a single canvas block
function CanvasBlockRenderer({ block, onAction }) {
    if (!block || !block.type) return null;
    console.log('[Sage] Rendering block:', block.type, block);
    switch (block.type) {
        case 'quiz':
            return (
                <Suspense fallback={<div className="p-4 bg-indigo-50 rounded-xl animate-pulse text-xs font-bold text-indigo-400">Loading quiz game...</div>}>
                    <InlineQuizBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'speed_round':
            return (
                <Suspense fallback={<div className="p-4 bg-orange-50 rounded-xl animate-pulse text-xs font-bold text-orange-400">Loading speed round...</div>}>
                    <SpeedRoundBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'fill_blank':
            return (
                <Suspense fallback={<div className="p-4 bg-purple-50 rounded-xl animate-pulse text-xs font-bold text-purple-400">Loading fill-in-the-blank...</div>}>
                    <FillBlankBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'matching':
            return (
                <Suspense fallback={<div className="p-4 bg-cyan-50 rounded-xl animate-pulse text-xs font-bold text-cyan-400">Loading matching game...</div>}>
                    <MatchingGameBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'graph':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse">Loading chart...</div>}>
                    <InlineChart block={block} />
                </Suspense>
            );
        case 'calculator':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse">Loading calculator...</div>}>
                    <CalculatorWidget />
                </Suspense>
            );
        case 'code':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-900 rounded-xl animate-pulse">Loading...</div>}>
                    <RunnableCodeBlock code={block.code} language={block.language} runnable={block.runnable !== false} />
                </Suspense>
            );
        case 'xp_summary':
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-5 border border-yellow-200"
                >
                    <div className="text-center">
                        <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-black text-yellow-700">+{block.earned} XP</p>
                        <p className="text-xs font-bold text-yellow-600">Total: {block.total} XP</p>
                        {block.streak > 0 && (
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-orange-600 mt-2">
                                <Flame className="h-3.5 w-3.5 fill-current" />
                                <span>{block.streak} day streak</span>
                            </div>
                        )}
                        {block.newAchievements?.length > 0 && (
                            <div className="mt-4 space-y-1.5">
                                {block.newAchievements.map((a, i) => (
                                    <div key={i} className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-100/50 py-1.5 px-3 rounded-full">
                                        <Trophy className="h-3 w-3" />
                                        <span>{a.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            );
        default:
            return null;
    }
}

export default function TutorMessage({ msg, onAction, isCompact }) {
    const isStudent = msg.role === 'student';
    const getComponents = useMarkdownComponents(isCompact);

    if (isStudent) {
        return (
            <div className="flex justify-end pr-1 mb-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className="bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 text-white px-6 py-3.5 rounded-3xl rounded-tr-md max-w-[90%] sm:max-w-[75%] shadow-xl shadow-blue-500/20 relative"
                >
                    <div className="absolute -top-2 -right-2 bg-yellow-400 p-1.5 rounded-full shadow-lg rotate-12">
                        <Zap className="h-3 w-3 text-white fill-current" />
                    </div>
                    <p className={`${isCompact ? 'text-[11px]' : 'text-sm'} font-black leading-relaxed tracking-tight`}>{msg.text}</p>
                </motion.div>
            </div>
        );
    }

    // Segment the tutor's response text
    const segments = segmentMarkdown(msg.text);
    const blocks = msg.blocks || [];

    return (
        <div className="flex flex-col gap-6 mb-12 relative">
            {/* Thread Connector Line (Desktop only) */}
            <div className="absolute left-4 top-10 bottom-4 w-0.5 bg-gradient-to-b from-blue-200 via-cyan-100 to-transparent hidden sm:block opacity-40" />

            {segments.map((segment, idx) => (
                <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 100,
                        delay: idx * 0.15
                    }}
                    className="flex gap-4 group"
                >
                    {/* Playful Segment Icon */}
                    <div className="flex-shrink-0 relative z-10 hidden sm:block">
                        <motion.div
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg transition-all bg-white
                ${segment.type === 'example' ? 'border-amber-200 text-amber-500 shadow-amber-100' :
                                    segment.type === 'quiz' ? 'border-pink-200 text-pink-500 shadow-pink-100' :
                                        segment.type === 'summary' ? 'border-emerald-200 text-emerald-500 shadow-emerald-100' :
                                            segment.type === 'diagram' ? 'border-blue-200 text-blue-500 shadow-blue-100' :
                                                segment.type === 'game' ? 'border-violet-200 text-violet-500 shadow-violet-100' :
                                                    'border-teal-200 text-teal-500 shadow-teal-100'}`}
                        >
                            <SegmentIcon type={segment.type} />
                        </motion.div>
                    </div>

                    {/* Pastel Segment Card */}
                    <div className="flex-1 relative min-w-0">
                        {idx === 0 && (
                            <div className="absolute -right-2 -top-4 opacity-20 pointer-events-none rotate-12">
                                <Sparkles className="h-8 w-8 text-blue-400" />
                            </div>
                        )}

                        <div className={`bg-white border-2 rounded-[2rem] px-5 sm:px-6 py-4 sm:py-5 transition-all hover:shadow-xl relative overflow-hidden
              ${segment.type === 'example' ? 'border-amber-100 bg-amber-50/10' :
                                segment.type === 'quiz' ? 'border-rose-100 bg-rose-50/10' :
                                    segment.type === 'summary' ? 'border-blue-200 bg-blue-50/40 shadow-sm shadow-blue-100/50' :
                                        segment.type === 'diagram' ? 'border-sky-100 bg-sky-50/10' :
                                            segment.type === 'game' ? 'border-indigo-100 bg-indigo-50/10' :
                                                'border-teal-100 bg-teal-50/10'}`}
                        >
                            {/* Corner Accent Color */}
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-10 blur-xl
                ${segment.type === 'example' ? 'bg-amber-400' :
                                    segment.type === 'quiz' ? 'bg-pink-400' :
                                        segment.type === 'summary' ? 'bg-blue-400' :
                                            segment.type === 'diagram' ? 'bg-sky-400' :
                                                segment.type === 'game' ? 'bg-violet-400' :
                                                    'bg-teal-400'}`}
                            />

                            {segment.title && (
                                <div className="flex items-center gap-2 mb-4">
                                    <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-xl
                    ${segment.type === 'example' ? 'bg-amber-100/50 text-amber-700' :
                                            segment.type === 'quiz' ? 'bg-rose-100/50 text-rose-700' :
                                                segment.type === 'summary' ? 'bg-emerald-100/50 text-emerald-700' :
                                                    segment.type === 'diagram' ? 'bg-sky-100/50 text-sky-700' :
                                                        segment.type === 'game' ? 'bg-indigo-100/50 text-indigo-700' :
                                                            'bg-teal-100/50 text-teal-700'}`}
                                    >
                                        <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>
                                            {segment.title}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            <div className={`prose max-w-none prose-headings:font-black prose-p:font-bold prose-p:text-gray-800 prose-strong:text-blue-600 prose-ul:my-2 sm:prose-ul:my-4 prose-li:my-0.5 sm:prose-li:my-1
                                ${isCompact || segment.type === 'summary' || segment.type === 'note' ? 'prose-xs text-[10px] leading-snug prose-p:my-0.5 prose-headings:mb-1' : 'prose-sm'}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={getComponents()}
                                >
                                    {segment.content}
                                </ReactMarkdown>
                            </div>

                            {segment.type === 'quiz' && (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="mt-5 pt-5 border-t border-rose-100/50"
                                >
                                    <button
                                        onClick={() => onAction && onAction({ type: 'quiz_request', title: segment.title })}
                                        className="flex items-center justify-between w-full px-5 py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 rounded-2xl text-white font-black text-sm shadow-lg shadow-rose-200 transition-all hover:brightness-110"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Gamepad2 className={`${isCompact ? 'h-3 w-3' : 'h-5 w-5'}`} />
                                            {isCompact ? 'Quick Game?' : 'Ready for a Quick Game?'}
                                        </div>
                                        <ChevronRight className={`${isCompact ? 'h-3 w-3' : 'h-5 w-5'}`} />
                                    </button>
                                </motion.div>
                            )}

                            {segment.type === 'game' && (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="mt-5 pt-5 border-t border-indigo-100/50"
                                >
                                    <button
                                        onClick={() => onAction && onAction({ type: 'game_request', title: segment.title })}
                                        className="flex items-center justify-between w-full px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl text-white font-black text-sm shadow-lg shadow-indigo-200 transition-all hover:brightness-110"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Activity className={`${isCompact ? 'h-3 w-3' : 'h-5 w-5'}`} />
                                            {isCompact ? 'Level Up!' : 'Start the Challenge!'}
                                        </div>
                                        <ChevronRight className={`${isCompact ? 'h-3 w-3' : 'h-5 w-5'}`} />
                                    </button>
                                </motion.div>
                            )}

                            {segment.type === 'diagram' && (
                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="mt-5 pt-5 border-t border-emerald-100/50"
                                >
                                    <button
                                        onClick={() => onAction && onAction({ type: 'diagram_request', title: segment.title })}
                                        className="flex items-center justify-center w-full px-5 py-4 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl text-emerald-600 font-bold text-sm transition-all hover:bg-emerald-100 hover:border-emerald-300 shadow-sm shadow-emerald-100"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <ImageIcon className="h-6 w-6 text-emerald-400" />
                                            <span>Generate Interactive Visual</span>
                                        </div>
                                    </button>
                                </motion.div>
                            )}

                            {segment.type === 'summary' && (
                                <div className="absolute right-4 bottom-4 rotate-12 opacity-80 scale-75 sm:scale-100">
                                    <div className="bg-blue-100 text-blue-700 border-2 border-dashed border-blue-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        Key Insight
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}

            {/* Canvas Blocks — interactive widgets (games, charts, calculator, etc.) */}
            {blocks.length > 0 && blocks.map((block, idx) => (
                <motion.div
                    key={`block-${block.type}-${idx}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: segments.length * 0.15 + idx * 0.1 }}
                    className="sm:pl-14"
                >
                    <CanvasBlockRenderer block={block} onAction={onAction} />
                </motion.div>
            ))}

            {/* Web Sources Badge */}
            {msg.webSources && msg.webSources.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (segments.length + blocks.length) * 0.15 + 0.1 }}
                    className="flex gap-4 group sm:pl-14"
                >
                    <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl px-4 py-3 w-full">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className="h-3.5 w-3.5 text-sky-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-sky-600">
                                Web Sources
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {msg.webSources.map((src, i) => (
                                <a
                                    key={i}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-sky-100 rounded-xl text-[11px] font-bold text-sky-700 hover:bg-sky-50 hover:border-sky-200 transition-all shadow-sm"
                                >
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate max-w-[200px]">{src.title || src.url}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {msg.timestamp && (
                <div className="flex justify-start ml-14 mt-1">
                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">
                        Sage : {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )}
        </div>
    );
}

function SegmentIcon({ type }) {
    switch (type) {
        case 'example': return <BookOpen className="h-5 w-5" />;
        case 'quiz': return <Trophy className="h-5 w-5" />;
        case 'summary': return <Star className="h-5 w-5" />;
        case 'note': return <StickyNote className="h-5 w-5" />;
        case 'quote': return <Quote className="h-5 w-5" />;
        case 'diagram': return <ImageIcon className="h-5 w-5" />;
        case 'game': return <Activity className="h-5 w-5" />;
        default: return <Info className="h-5 w-5" />;
    }
}
