import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, ArrowRight, MessageSquare,
    Layers, BookOpen, ClipboardCheck, CornerDownRight,
    RotateCcw, Sparkles
} from 'lucide-react';

const MINI_LEARN_DATA = [
    {
        title: "Retreival-Augmented Generation",
        text: "StudyRAG uses RAG to ground AI answers in your documents. It first searches for relevant snippets, then synthesizes an answer.",
        tag: "Concepts"
    },
    {
        title: "Citation Verified",
        text: "Every claim made by the AI includes a direct link to the source document, eliminating hallucinations completely.",
        tag: "Accuracy"
    },
    {
        question: "How does StudyRAG eliminate AI hallucinations?",
        options: [
            "By guessing better",
            "By using only verified document context",
            "By reading every book in the world"
        ],
        correct: 1
    }
];

const MINI_QUIZ_DATA = [
    {
        q: "Which technology is at the core of StudyRAG?",
        options: ["RAG", "Random Guessing", "Direct Search"],
        correct: 0
    },
    {
        q: "What is the primary benefit of verified citations?",
        options: ["Legal compliance", "Trust and accuracy", "Better formatting"],
        correct: 1
    }
];

const MINI_FLASH_DATA = [
    { front: "RAG", back: "Retrieval-Augmented Generation: Grounding LLMs in external data." },
    { front: "Hallucination", back: "When AI generates plausible but factually incorrect information." },
    { front: "Vector DB", back: "A database optimized for storing and searching semantic embeddings." }
];

export default function FeatureLiveDemo({ mode, onClose }) {
    const [step, setStep] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [chatHistory, setChatHistory] = useState([
        { role: 'ai', content: "Hello! I'm your StudyRAG assistant. I've indexed your 'Physics 101' PDF. What would you like to know?" }
    ]);
    const [flashIndex, setFlashIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleLearnNext = (answerIdx) => {
        if (answerIdx !== undefined) {
            if (answerIdx === MINI_LEARN_DATA[step].correct) {
                setFeedback('correct');
                setTimeout(() => {
                    setFeedback(null);
                    setStep(step + 1);
                }, 1000);
            } else {
                setFeedback('wrong');
                setTimeout(() => setFeedback(null), 1000);
            }
        } else {
            setStep(step + 1);
        }
    };

    const handleChatAction = (action) => {
        const responses = {
            'citations': "I use citations [1] to show exactly which sentence in your PDF generated this answer.",
            'hallucinate': "I prevent hallucinations by only using the context found in your documents. If it's not there, I say I don't know."
        };

        setChatHistory(prev => [
            ...prev,
            { role: 'user', content: action === 'citations' ? "How do citations work?" : "How do you stop hallucinations?" },
            { role: 'ai', content: responses[action], citation: action === 'citations' ? "[1] Page 4: Document Retrieval Mechanism" : null }
        ]);
    };

    const handleQuizOption = (idx) => {
        if (idx === MINI_QUIZ_DATA[step].correct) {
            setScore(score + 1);
            setFeedback('correct');
        } else {
            setFeedback('wrong');
        }

        setTimeout(() => {
            setFeedback(null);
            setStep(step + 1);
        }, 800);
    };

    const renderLearn = () => {
        const current = MINI_LEARN_DATA[step];
        if (!current) return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Lesson Complete!</h3>
                <p className="text-slate-500 text-sm mb-6">You've mastered the fundamentals of RAG-based learning.</p>
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-primary font-bold text-sm">
                    <RotateCcw className="h-4 w-4" /> Restart Demo
                </button>
            </div>
        );

        return (
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-1 h-1 flex-1 bg-slate-100 rounded-full overflow-hidden mr-4">
                        {MINI_LEARN_DATA.map((_, i) => (
                            <div key={i} className={`flex-1 transition-all duration-500 ${step >= i ? 'bg-primary' : ''}`} />
                        ))}
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Section {step + 1}</span>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1"
                    >
                        {current.question ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-slate-900 leading-tight mb-6">{current.question}</h3>
                                {current.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleLearnNext(i)}
                                        className={`w-full p-4 rounded-2xl border-2 text-left text-sm font-bold transition-all group flex items-center justify-between ${feedback === 'correct' && i === current.correct ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                                                feedback === 'wrong' && i !== current.correct ? 'border-red-200 bg-red-50 text-red-700' :
                                                    'border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50'
                                            }`}
                                    >
                                        {opt}
                                        {feedback === 'correct' && i === current.correct && <CheckCircle2 className="h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <span className="px-2 py-1 bg-blue-50 text-primary text-[10px] font-black rounded uppercase tracking-widest">{current.tag}</span>
                                <h3 className="text-2xl font-black text-slate-950 leading-tight">{current.title}</h3>
                                <p className="text-slate-600 font-medium leading-relaxed">{current.text}</p>
                                <div className="pt-6">
                                    <button
                                        onClick={() => handleLearnNext()}
                                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                    >
                                        Next Concept <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    };

    const renderChat = () => {
        return (
            <div className="flex flex-col h-full bg-slate-50 rounded-b-[2rem]">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                    {chatHistory.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'ai' ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm' : 'bg-primary text-white rounded-tr-none'
                                }`}>
                                {msg.content}
                                {msg.citation && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 group cursor-help">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-[10px] font-black text-primary uppercase">
                                            Citation <Sparkles className="h-2 w-2" />
                                        </div>
                                        <span className="text-[10px] text-slate-400 italic">{msg.citation}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                    <button
                        onClick={() => handleChatAction('citations')}
                        className="flex-1 p-3 rounded-xl border border-slate-100 bg-slate-50 text-[10px] sm:text-xs font-black text-slate-600 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                        <CornerDownRight className="h-3 w-3" /> How do citations work?
                    </button>
                    <button
                        onClick={() => handleChatAction('hallucinate')}
                        className="flex-1 p-3 rounded-xl border border-slate-100 bg-slate-50 text-[10px] sm:text-xs font-black text-slate-600 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                        <CornerDownRight className="h-3 w-3" /> Stop hallucinations?
                    </button>
                </div>
            </div>
        );
    };

    const renderQuiz = () => {
        const current = MINI_QUIZ_DATA[step];
        if (!current) return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="text-4xl font-black text-primary mb-2">{(score / MINI_QUIZ_DATA.length) * 100}%</div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Mastery Gained!</h3>
                <p className="text-slate-500 text-sm mb-6">You've correctly identified the core pillars of the platform.</p>
                <button onClick={() => { setStep(0); setScore(0); }} className="flex items-center gap-2 text-primary font-bold text-sm">
                    <RotateCcw className="h-4 w-4" /> Take Again
                </button>
            </div>
        );

        return (
            <div className="p-8 h-full flex flex-col justify-center">
                <div className="mb-8">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Question {step + 1}</span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{current.q}</h3>
                </div>
                <div className="space-y-3">
                    {current.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => handleQuizOption(i)}
                            className={`w-full p-4 rounded-2xl border-2 text-slate-900 font-bold transition-all text-sm text-left flex justify-between items-center ${feedback === 'correct' && i === current.correct ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
                                    feedback === 'wrong' && i !== current.correct ? 'bg-red-50 border-red-200' :
                                        'bg-slate-50 border-transparent hover:border-primary/20'
                                }`}
                        >
                            {opt}
                            {feedback === 'correct' && i === current.correct && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderFlashcards = () => {
        const current = MINI_FLASH_DATA[flashIndex];
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center overflow-hidden">
                <div className="relative w-full max-w-sm aspect-[3/2]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={flashIndex + (isFlipped ? '_back' : '_front')}
                            initial={{ rotateX: 90, opacity: 0 }}
                            animate={{ rotateX: 0, opacity: 1 }}
                            exit={{ rotateX: -90, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            onClick={() => setIsFlipped(!isFlipped)}
                            className={`w-full h-full rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl transition-all duration-500 ${isFlipped ? 'bg-slate-900 text-white' : 'bg-white border-2 border-orange-100 text-slate-900'
                                }`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-4">{isFlipped ? 'Answer' : 'Term'}</span>
                            <div className={`text-2xl font-black ${isFlipped ? 'text-orange-400' : 'text-slate-950'}`}>
                                {isFlipped ? current.back : current.front}
                            </div>
                            <div className="mt-8 text-[10px] font-bold text-slate-400 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" /> Click to Flip
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={() => {
                            const next = (flashIndex + 1) % MINI_FLASH_DATA.length;
                            setFlashIndex(next);
                            setIsFlipped(false);
                        }}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:scale-105 transition-all shadow-xl"
                    >
                        Next Card
                    </button>
                </div>
            </div>
        );
    };

    const getModeSpecifics = () => {
        switch (mode.toLowerCase()) {
            case 'learn mode': return { icon: BookOpen, color: 'text-blue-500', render: renderLearn };
            case 'chat mode': return { icon: MessageSquare, color: 'text-emerald-500', render: renderChat };
            case 'quiz mode': return { icon: ClipboardCheck, color: 'text-purple-500', render: renderQuiz };
            case 'flashcards': return { icon: Layers, color: 'text-orange-500', render: renderFlashcards };
            default: return { icon: Sparkles, color: 'text-primary', render: () => <div>Demo not found</div> };
        }
    };

    const specs = getModeSpecifics();

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${specs.color}`}>
                        <specs.icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-950 leading-none">{mode}</h2>
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary mt-1 block">Live Prototype</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Now
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white relative overflow-hidden">
                {specs.render()}
            </div>
        </div>
    );
}

