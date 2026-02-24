import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Target, Users, Sparkles } from 'lucide-react';

export default function About() {
    return (
        <div className="min-h-screen flex flex-col">
            <PublicNavbar />
            <main className="flex-1">
                <section className="py-24 px-6 bg-slate-950 text-white relative overflow-hidden">
                    <div className="absolute inset-0 z-0 opacity-10">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500 rounded-full blur-[120px] -mr-64 -mt-64" />
                    </div>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h1 className="text-4xl md:text-7xl font-black mb-8 tracking-tight leading-tight">
                            The Science of <br /><span className="text-cyan-400">Perfect Recall</span>
                        </h1>
                        <p className="text-lg md:text-2xl text-slate-400 font-medium leading-relaxed mb-12 max-w-2xl mx-auto">
                            StudyRAG was built to solve a single, critical problem: <span className="text-white italic">AI hallucinations in education.</span>
                        </p>
                    </div>
                </section>

                <section className="py-24 px-6 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-20 items-center mb-24">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-6">Why StudyRAG is Different</h2>
                                <p className="text-slate-600 text-lg font-medium leading-relaxed mb-6">
                                    Standard AI tools guess. They use statistical probability to predict the next word, which often leads to "hallucinations"—confidently stating facts that aren't true.
                                </p>
                                <p className="text-slate-600 text-lg font-medium leading-relaxed">
                                    StudyRAG uses <span className="text-primary font-bold">Retrieval-Augmented Generation (RAG)</span>. Every time you ask a question, our system first searches your specific documents for the exact context, then uses that evidence to construct an answer. If it's not in your notes, we don't make it up.
                                </p>
                            </div>
                            <div className="p-12 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                                <div className="space-y-8">
                                    {[
                                        { title: 'Evidence-First', desc: 'No answer is generated without a primary source citation.' },
                                        { title: 'Zero Data Training', desc: 'Your private documents are never used to train global models.' },
                                        { title: 'STEM Optimized', desc: 'Specialized reasoning for LaTeX, chemical formulas, and complex logic.' },
                                    ].map((point, i) => (
                                        <div key={i}>
                                            <h4 className="font-black text-slate-900 text-lg mb-1">{point.title}</h4>
                                            <p className="text-slate-500 font-medium">{point.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 border-t border-slate-100 pt-24 text-center">
                            {[
                                { title: '100% Accuracy', desc: 'Powered by citation-grounded retrieval.' },
                                { title: '2x Speed', desc: 'Automated synthesis of thousands of pages.' },
                                { title: 'Global Trust', desc: 'Used by med students, lawyers, and PhDs.' },
                            ].map((stat, i) => (
                                <div key={i}>
                                    <div className="text-4xl font-black text-primary mb-2">{stat.title}</div>
                                    <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{stat.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
