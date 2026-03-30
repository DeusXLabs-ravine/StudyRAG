import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, Zap, Trophy, Gamepad2,
    Star, Info, Quote, Globe, ExternalLink, Image as ImageIcon, Activity,
    Copy, Check, StickyNote, BookOpen, Brain, ChevronDown, Clock
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
const SimulationBlock = lazy(() => import('./SimulationBlock'));

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

// Enhanced markdown components
function useMarkdownComponents(isCompact) {
    return useCallback(() => ({
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeStr = String(children).replace(/\n$/, '');

            if (inline || (!lang && codeStr.split('\n').length <= 1)) {
                return (
                    <code className="px-1.5 py-0.5 bg-gray-100 text-primary rounded-md text-[0.85em] font-mono font-semibold" {...props}>
                        {children}
                    </code>
                );
            }

            if (lang === 'mermaid') {
                return (
                    <Suspense fallback={<div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400">Loading diagram...</div>}>
                        <div className="my-2">
                            <MermaidDiagram code={codeStr} />
                        </div>
                    </Suspense>
                );
            }

            if (lang === 'latex' || lang === 'tex') {
                return (
                    <div className="my-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center overflow-x-auto">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {`$$${codeStr}$$`}
                        </ReactMarkdown>
                    </div>
                );
            }

            const runnable = ['python', 'py', 'javascript', 'js', 'typescript', 'ts'].includes(lang?.toLowerCase());
            return (
                <Suspense fallback={<div className="p-3 bg-gray-900 rounded-lg text-xs text-gray-500 animate-pulse">Loading code...</div>}>
                    <RunnableCodeBlock code={codeStr} language={lang || 'text'} runnable={runnable} />
                </Suspense>
            );
        },
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
        tr({ children, ...props }) { return <tr className="even:bg-gray-50/50 hover:bg-gray-100/30 transition-colors" {...props}>{children}</tr>; },
        blockquote({ children }) {
            return (
                <blockquote className="my-3 pl-4 border-l-4 border-primary/30 bg-gray-50/50 py-2 pr-3 rounded-r-lg italic text-gray-700">
                    {children}
                </blockquote>
            );
        },
        hr() {
            return <hr className="my-4 border-0 h-px bg-gray-200" />;
        },
        img({ src, alt }) {
            return (
                <img src={src} alt={alt || ''} className="rounded-xl max-w-full my-2 border border-gray-200 shadow-sm" loading="lazy" />
            );
        },
        input({ type, checked, ...props }) {
            if (type === 'checkbox') {
                return (
                    <input type="checkbox" checked={checked} readOnly className="mt-1 rounded border-gray-300 text-primary accent-primary" {...props} />
                );
            }
            return <input type={type} {...props} />;
        },
        a({ href, children }) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 font-semibold">
                    {children}
                </a>
            );
        },
        p({ children }) {
            return <p className={`${isCompact ? 'mb-2' : 'mb-4'} last:mb-0 leading-relaxed`}>{children}</p>;
        },
        ul({ children }) {
            return <ul className={`list-disc list-outside ml-6 ${isCompact ? 'mb-2' : 'mb-4'} space-y-1`}>{children}</ul>;
        },
        ol({ children }) {
            return <ol className={`list-decimal list-outside ml-6 ${isCompact ? 'mb-2' : 'mb-4'} space-y-1`}>{children}</ol>;
        },
        li({ children, className, ...props }) {
            const isTask = className === 'task-list-item';
            return (
                <li className={`pl-1 ${isTask ? 'list-none flex items-start gap-2' : ''}`} {...props}>
                    {children}
                </li>
            );
        },
    }), [isCompact]);
}

function CanvasBlockRenderer({ block, onAction }) {
    if (!block || !block.type) return null;
    switch (block.type) {
        case 'quiz':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse text-xs font-bold text-gray-400">Loading quiz game...</div>}>
                    <InlineQuizBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'speed_round':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse text-xs font-bold text-gray-400">Loading speed round...</div>}>
                    <SpeedRoundBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'fill_blank':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse text-xs font-bold text-gray-400">Loading fill-in-the-blank...</div>}>
                    <FillBlankBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'matching':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse text-xs font-bold text-gray-400">Loading matching game...</div>}>
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
        case 'simulation':
            return (
                <Suspense fallback={<div className="p-4 bg-gray-50 rounded-xl animate-pulse text-xs font-bold text-gray-400">Loading simulation...</div>}>
                    <SimulationBlock block={block} onComplete={(result) => onAction?.({ type: 'game_complete', ...result })} />
                </Suspense>
            );
        case 'xp_summary':
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                >
                    <div className="text-center">
                        <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-black text-gray-900">+{block.earned} XP</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Progress: {block.total} XP</p>
                        {block.streak > 0 && (
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 mt-3 bg-gray-50 py-1.5 px-3 rounded-full inline-flex">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{block.streak} day streak</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            );
        default:
            return null;
    }
}

function ReasoningPanel({ reasoning }) {
    const [open, setOpen] = useState(false);
    if (!reasoning) return null;
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
                <Brain className="h-3.5 w-3.5" />
                <span>Knowledge Retrieval Reasoning</span>
                <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 max-h-96 overflow-y-auto">
                            <pre className="text-[11px] leading-relaxed text-gray-600 font-mono whitespace-pre-wrap break-words border-t border-gray-100 pt-4">
                                {reasoning}
                            </pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
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
                    className="bg-primary text-white px-6 py-3.5 rounded-3xl rounded-tr-md max-w-[90%] sm:max-w-[75%] shadow-sm relative"
                >
                    <div className={`${isCompact ? 'text-[11px]' : 'text-sm'} font-black leading-relaxed tracking-tight student-bubble-markdown`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                p({ children }) { return <p className="mb-1 last:mb-0">{children}</p>; },
                                code({ inline, className, children, ...props }) {
                                    if (inline || !className) {
                                        return <code className="px-1 py-0.5 bg-white/20 rounded text-[0.9em] font-mono" {...props}>{children}</code>;
                                    }
                                    return <code className="block p-2 my-1 bg-black/20 rounded-lg text-[0.85em] font-mono overflow-x-auto whitespace-pre" {...props}>{children}</code>;
                                },
                                a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-bold">{children}</a>; },
                                ul({ children }) { return <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>; },
                                ol({ children }) { return <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>; },
                                blockquote({ children }) { return <blockquote className="pl-3 border-l-2 border-white/40 my-1 opacity-90">{children}</blockquote>; },
                                table({ children }) { return <div className="overflow-x-auto my-1"><table className="min-w-full text-xs border-collapse">{children}</table></div>; },
                                th({ children }) { return <th className="px-2 py-1 text-left border-b border-white/30 font-black">{children}</th>; },
                                td({ children }) { return <td className="px-2 py-1 border-b border-white/10">{children}</td>; },
                            }}
                        >
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                </motion.div>
            </div>
        );
    }

    // While streaming, render as a single segment to avoid partial-markdown parse artifacts
    const segments = msg._streaming
        ? [{ id: 'stream', type: 'text', content: msg.text, title: null }]
        : segmentMarkdown(msg.text);
    const blocks = msg.blocks || [];

    // Show typing indicator while streaming with no text yet
    if (msg._streaming && !msg.text) {
        return (
            <div className="flex gap-4 mb-12">
                <div className="flex-shrink-0 hidden sm:block">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 bg-white shadow-sm">
                        <Brain className="h-4 w-4 text-blue-500 animate-pulse" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 mb-12 relative">
            {/* Thread Connector Line */}
            <div className="absolute left-4 top-10 bottom-4 w-px bg-gray-100 hidden sm:block" />

            {segments.map((segment, idx) => (
                <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-4 group"
                >
                    <div className="flex-shrink-0 relative z-10 hidden sm:block">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-400 shadow-sm">
                            <SegmentIcon type={segment.type} />
                        </div>
                    </div>

                    <div className="flex-1 relative min-w-0">
                        <div className="bg-white border border-gray-200 rounded-2xl px-5 sm:px-6 py-4 sm:py-5 transition-all shadow-sm relative overflow-hidden">
                            {segment.title && (
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded bg-gray-50 text-gray-500 border border-gray-100">
                                        <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>
                                            {segment.title}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            <div className={`prose max-w-none prose-headings:font-black prose-p:font-medium prose-p:text-gray-700 prose-strong:text-primary prose-ul:my-2 sm:prose-ul:my-4 prose-li:my-0.5 sm:prose-li:my-1
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
                                <div className="mt-5 pt-5 border-t border-gray-100">
                                    <button
                                        onClick={() => onAction && onAction({ type: 'quiz_request', title: segment.title })}
                                        className="flex items-center justify-between w-full px-5 py-4 bg-gray-900 rounded-xl text-white font-black text-sm transition-all hover:bg-black"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Gamepad2 className="h-4 w-4" />
                                            <span>Assessment Module</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {segment.type === 'game' && (
                                <div className="mt-5 pt-5 border-t border-gray-100">
                                    <button
                                        onClick={() => onAction && onAction({ type: 'game_request', title: segment.title })}
                                        className="flex items-center justify-between w-full px-5 py-4 bg-primary rounded-xl text-white font-black text-sm transition-all hover:opacity-90"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Activity className="h-4 w-4" />
                                            <span>Interactive Exercise</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {segment.type === 'diagram' && (
                                <div className="mt-5 pt-5 border-t border-gray-100">
                                    <button
                                        onClick={() => onAction && onAction({ type: 'diagram_request', title: segment.title })}
                                        className="flex items-center justify-center w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-bold text-sm transition-all hover:bg-gray-100"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <ImageIcon className="h-5 w-5 text-gray-400" />
                                            <span className="text-[10px] uppercase tracking-widest font-black">Generate Technical Diagram</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}

            {blocks.length > 0 && blocks.map((block, idx) => (
                <motion.div
                    key={`block-${block.type}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: segments.length * 0.1 + idx * 0.1 }}
                    className="sm:pl-14"
                >
                    <CanvasBlockRenderer block={block} onAction={onAction} />
                </motion.div>
            ))}

            {msg.reasoning && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (segments.length + blocks.length) * 0.1 }}
                    className="sm:pl-14"
                >
                    <ReasoningPanel reasoning={msg.reasoning} />
                </motion.div>
            )}

            {msg.webSources && msg.webSources.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (segments.length + blocks.length) * 0.1 + 0.1 }}
                    className="flex gap-4 group sm:pl-14"
                >
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 w-full">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                                Reference Sources
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {msg.webSources.map((src, i) => (
                                <a
                                    key={i}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 hover:border-primary transition-all shadow-sm"
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
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        Ref : {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )}
        </div>
    );
}

function SegmentIcon({ type }) {
    switch (type) {
        case 'example': return <BookOpen className="h-4 w-4" />;
        case 'quiz': return <Trophy className="h-4 w-4" />;
        case 'summary': return <Star className="h-4 w-4" />;
        case 'note': return <StickyNote className="h-4 w-4" />;
        case 'quote': return <Quote className="h-4 w-4" />;
        case 'diagram': return <ImageIcon className="h-4 w-4" />;
        case 'game': return <Activity className="h-4 w-4" />;
        default: return <Info className="h-4 w-4" />;
    }
}
