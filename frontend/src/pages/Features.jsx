import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { BookOpen, MessageCircle, ClipboardCheck, Layers, Search, Brain, Shield, Zap, ArrowRight, Database, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Features() {
    const featureGroups = [
        {
            title: "Core Learning Modes",
            description: "Four distinct ways to interact with your data and master your subjects.",
            items: [
                { icon: BookOpen, title: 'Learn Mode', text: 'Step-by-step learning modules auto-generated from your documents with periodic comprehension checks.' },
                { icon: MessageCircle, title: 'Chat Mode', text: 'Natural language interface with your personal knowledge base. Get answers with direct source citations.' },
                { icon: ClipboardCheck, title: 'Quiz Mode', text: 'Verify mastery with dynamically generated assessments that adapt to your knowledge gaps.' },
                { icon: Layers, title: 'Flashcards', text: 'AI-distilled study deck for quick review, powered by active recall and spaced repetition.' },
            ]
        },
        {
            title: "Intelligent Infrastructure",
            description: "The RAG engine that powers StudyRAG goes beyond standard AI chat.",
            items: [
                { icon: Database, title: 'Knowledge Vaults', text: 'Secure, private storage for your academic papers, PDFs, and notes. No data is used for training.' },
                { icon: Search, title: 'Contextual Retrieval', text: 'Proprietary RAG engine that finds the exact paragraph you need from thousands of pages.' },
                { icon: Shield, title: 'Verified Citations', text: 'Every AI claim is backed by a clickable link to the original PDF, eliminating hallucinations.' },
                { icon: Zap, title: 'Sage 1.5 Pro', text: 'Access the most advanced reasoning models specifically tuned for STEM and academic research.' },
            ]
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <PublicNavbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="py-24 px-6 bg-slate-950 text-white relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
                    </div>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Full-Stack <span className="text-cyan-400">Study Intelligence</span></h1>
                        <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed">A specialized ecosystem designed from the ground up for academic mastery.</p>
                    </div>
                </section>

                {/* Groups */}
                {featureGroups.map((group, groupIdx) => (
                    <section key={groupIdx} className={`py-24 px-6 ${groupIdx % 2 === 1 ? 'bg-white' : ''}`}>
                        <div className="max-w-7xl mx-auto">
                            <div className="mb-16">
                                <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-4">{group.title}</h2>
                                <p className="text-2xl font-black text-gray-900">{group.description}</p>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {group.items.map((item, i) => (
                                    <div key={i} className="group p-8 rounded-3xl bg-white border border-gray-100 hover:border-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/5">
                                        <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                            <item.icon className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-3">{item.title}</h3>
                                        <p className="text-gray-500 text-sm font-medium leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                ))}

                {/* CTA */}
                <section className="py-24 px-6 bg-primary">
                    <div className="max-w-4xl mx-auto text-center text-white">
                        <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">Ready to stop skimming and start mastering?</h2>
                        <button className="bg-white text-primary px-10 py-5 rounded-3xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 inline-flex items-center gap-3">
                            Start Your First Session
                            <ArrowRight className="h-6 w-6" />
                        </button>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
