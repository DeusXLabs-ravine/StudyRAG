import React, { useState, useEffect } from 'react';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { 
    ShieldCheck, Lock, FileText, Search, Cpu, Quote, Loader2, 
    BookOpenCheck, Shield, Sigma 
} from 'lucide-react';

export default function About() {
    const [stage, setStage] = useState(0);

    // Animation sequence loop
    useEffect(() => {
        let isMounted = true;
        
        const runSequence = () => {
            if (!isMounted) return;
            setStage(0); // Reset
            setTimeout(() => isMounted && setStage(1), 800);   // 1. Show question
            setTimeout(() => isMounted && setStage(2), 2000);  // 2. Show searching
            setTimeout(() => isMounted && setStage(3), 3800);  // 3. Show answer
            setTimeout(() => isMounted && setStage(4), 4800);  // 4. Show citations
            setTimeout(() => isMounted && setStage(5), 6500);  // 5. Show refusal
            setTimeout(runSequence, 12000);                    // 6. Loop after holding
        };

        const timer = setTimeout(runSequence, 100);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col font-sans bg-slate-50">
            <PublicNavbar />
            <main className="flex-1">
                
                {/* Hero Section — upgraded with live animation */}
                <section className="relative overflow-hidden bg-slate-950 text-white">
                    {/* background texture */}
                    <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
                    <div className="absolute -top-40 right-[-12rem] h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-[120px]" />
                    <div className="absolute -bottom-56 left-[-10rem] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[140px]" />

                    <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20">
                        <div className="grid items-center gap-14 lg:grid-cols-2">
                            
                            {/* Left: Copy */}
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200">
                                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                                    Research-grade study assistant
                                    <span className="text-slate-500">•</span>
                                    Citation-first
                                </div>

                                <h1 className="mt-8 text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
                                    Study with proof, <br />
                                    not probability.
                                </h1>

                                <p className="mt-6 max-w-xl text-lg md:text-xl text-slate-300 leading-relaxed">
                                    StudyRAG answers questions <span className="text-white font-semibold">from your documents</span> and
                                    shows <span className="text-white font-semibold">exact citations</span> for every claim.
                                    If it’s not in your material, it says so.
                                </p>

                                {/* credibility strip */}
                                <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                                    {["Citations", "Private by design", "Built for serious study"].map((t) => (
                                        <span key={t} className="rounded-full border border-slate-800 bg-white/5 px-4 py-2">
                                            {t}
                                        </span>
                                    ))}
                                </div>

                                {/* CTA-ish actions */}
                                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                                    <button className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
                                        See how it works
                                    </button>
                                    <button className="rounded-xl border border-slate-800 bg-white/0 px-6 py-3 font-semibold text-slate-200 hover:bg-white/5 transition-all">
                                        View example answer
                                    </button>
                                </div>
                            </div>

                            {/* Right: Live Proof UI */}
                            <div className="relative z-10 h-[500px]">
                                <div className="absolute inset-0 rounded-3xl border border-slate-800 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.8)] flex flex-col backdrop-blur-sm">
                                    
                                    {/* Small top bar */}
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                            <span className={`h-2 w-2 rounded-full transition-colors duration-300 ${stage >= 2 && stage < 3 ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'}`} />
                                            {stage >= 2 && stage < 3 ? 'Retrieving context...' : 'Answer grounded in your notes'}
                                        </div>
                                        <div className="text-xs text-slate-500">StudyRAG • live view</div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pt-4 space-y-4">
                                        {/* 1. Question */}
                                        <div className={`transition-all duration-500 ease-out transform ${stage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                                                <div className="text-xs font-semibold text-slate-400">Question</div>
                                                <div className="mt-1 text-sm text-slate-100">
                                                    What are the 3 steps of the RAG pipeline in our lecture notes?
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Loading / Searching State */}
                                        <div className={`transition-all duration-300 overflow-hidden ${stage === 2 ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="flex items-center gap-3 text-xs font-medium text-cyan-400 p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/50 w-max">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Scanning CS401_notes.pdf & Slides.pdf...
                                            </div>
                                        </div>

                                        {/* 3. Answer */}
                                        <div className={`transition-all duration-500 ease-out transform ${stage >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                            <div className="rounded-2xl border border-slate-800 bg-white/5 p-4 relative overflow-hidden">
                                                <div className="text-xs font-semibold text-slate-400">Answer</div>
                                                <div className="mt-2 text-sm text-slate-200 leading-relaxed">
                                                    The pipeline is: <span className="text-white font-semibold">Index</span> (chunk + embed documents),
                                                    <span className="text-white font-semibold"> Retrieve</span> (semantic search for relevant passages),
                                                    and <span className="text-white font-semibold"> Synthesize</span> (generate an answer using retrieved context).
                                                </div>

                                                {/* 4. Citations */}
                                                <div className={`mt-4 flex flex-wrap gap-2 transition-opacity duration-700 ${stage >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                                                    {[
                                                        { text: "CS401_notes.pdf • p.12", delay: "delay-0" },
                                                        { text: "Week3_RAG.docx • §2.1", delay: "delay-100" },
                                                        { text: "Slides.pdf • p.7", delay: "delay-200" },
                                                    ].map((c, i) => (
                                                        <span key={i} className={`rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-cyan-300 shadow-sm transition-all duration-500 transform ${stage >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`} style={{ transitionDelay: `${i * 150}ms` }}>
                                                            {c.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5. Refusal Example */}
                                        <div className={`transition-all duration-700 ease-out transform ${stage >= 5 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 hidden'}`}>
                                            <div className="rounded-2xl border border-amber-900/40 bg-amber-500/5 p-4">
                                                <div className="text-xs font-semibold text-amber-200 flex items-center gap-2">
                                                    <ShieldCheck className="w-3 h-3" /> When it’s not in your material
                                                </div>
                                                <div className="mt-2 text-sm text-amber-100/90 italic">
                                                    “I can’t find evidence for that in your uploaded documents. Try uploading the lecture slides or provide the section.”
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Label */}
                                <div className="absolute -bottom-4 left-6 rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-semibold text-slate-300 shadow-lg backdrop-blur-md z-20">
                                    Evidence-first answers
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust & Privacy Band */}
                <div className="bg-slate-950 border-y border-slate-800">
                    <div className="max-w-6xl mx-auto px-6 py-10">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-800 bg-white/5 p-5">
                                <div className="flex items-start gap-3">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900/60">
                                        <Lock className="h-5 w-5 text-cyan-400" />
                                    </span>
                                    <div>
                                        <div className="font-semibold text-slate-100">Encrypted by default</div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            Data encrypted in transit and at rest.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-white/5 p-5">
                                <div className="flex items-start gap-3">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900/60">
                                        <ShieldCheck className="h-5 w-5 text-cyan-400" />
                                    </span>
                                    <div>
                                        <div className="font-semibold text-slate-100">Your docs stay yours</div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            Not used to train global models.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-white/5 p-5">
                                <div className="flex items-start gap-3">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900/60">
                                        <FileText className="h-5 w-5 text-cyan-400" />
                                    </span>
                                    <div>
                                        <div className="font-semibold text-slate-100">Evidence-first answers</div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            Citations or a transparent “not found”.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Core Philosophy & RAG Visual */}
                <section className="py-24 px-6 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">
                                    Rigorous by Design
                               </h2>
                                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                                    Standard AI tools use statistical probability to guess the next word, which inevitably leads to confident inaccuracies. In academic and professional fields, guessing is not acceptable.
                                </p>
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    StudyRAG utilizes <span className="text-cyan-700 font-semibold">Retrieval-Augmented Generation (RAG)</span>. When you query your knowledge base, our system isolates the exact context from your uploaded documents before synthesizing an answer. If the data isn't in your text, we don't invent it.
                                </p>
                            </div>

                            {/* "How RAG Works" Div-based Diagram */}
                            <div className="p-8 md:p-12 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-8 text-center">How It Works</h3>
                                <div className="space-y-4 relative">
                                    {/* Connecting Line */}
                                    <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 hidden md:block" />
                                    
                                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-sm hover:border-cyan-200 hover:shadow-md transition-all">
                                        <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                                            <FileText className="w-5 h-5 text-cyan-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">1. Index</h4>
                                            <p className="text-sm text-slate-500">Your documents are securely embedded.</p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-sm hover:border-cyan-200 hover:shadow-md transition-all">
                                        <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                                            <Search className="w-5 h-5 text-cyan-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">2. Retrieve</h4>
                                            <p className="text-sm text-slate-500">Semantic search isolates exact evidence.</p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-sm hover:border-cyan-200 hover:shadow-md transition-all">
                                        <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                                            <Cpu className="w-5 h-5 text-cyan-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">3. Synthesize</h4>
                                            <p className="text-sm text-slate-500">Answers are generated with inline citations.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grounded Credibility Stats / Product Pillars */}
                        <div className="grid md:grid-cols-3 gap-6 mb-24">
                            {[
                                {
                                    title: 'Citation-Grounded',
                                    desc: 'Every generated claim is rigorously mapped to a specific primary source within your indexed documents.',
                                    icon: BookOpenCheck,
                                },
                                {
                                    title: 'Private & Secure',
                                    desc: 'Your intellectual property remains yours. We operate with zero data retention for global model training.',
                                    icon: Shield,
                                },
                                {
                                    title: 'STEM Optimized',
                                    desc: 'Advanced architectural parsing for native LaTeX rendering, chemical formulas, and complex tabular data.',
                                    icon: Sigma,
                                },
                            ].map((pillar, i) => {
                                const Icon = pillar.icon;
                                return (
                                    <div 
                                        key={i} 
                                        className="group relative flex flex-col p-8 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 ease-out overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-100 to-transparent group-hover:via-cyan-100 transition-colors duration-500" />
                                        
                                        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 group-hover:bg-cyan-50/50 group-hover:text-cyan-700 group-hover:border-cyan-100/80 transition-all duration-300">
                                            <Icon size={22} strokeWidth={1.5} />
                                        </div>
                                        
                                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-2.5">
                                            {pillar.title}
                                        </h3>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                            {pillar.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Testimonial & Badges */}
                        <div className="max-w-4xl mx-auto text-center border-t border-slate-200 pt-20">
                            <Quote className="w-10 h-10 mx-auto text-cyan-200 mb-6 rotate-180" />
                            <blockquote className="text-2xl md:text-3xl font-medium text-slate-900 leading-snug mb-8">
                                "Finally, a tool that respects the scientific method. It doesn't write for me; it instantly retrieves the exact literature I need to write for myself."
                            </blockquote>
                            <div className="text-slate-500 font-medium mb-16">— PhD Candidate, Bioengineering</div>

                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Engineered For</span>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {['Medicine', 'Law', 'Engineering', 'Academic Research', 'Data Science'].map((field) => (
                                        <span key={field} className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 bg-white shadow-sm hover:border-cyan-200 hover:text-cyan-700 transition-colors cursor-default">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}