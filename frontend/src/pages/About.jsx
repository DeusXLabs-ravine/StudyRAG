import { motion } from 'framer-motion';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Target, Users, Sparkles, Shield, Zap, Search } from 'lucide-react';

export default function About() {
    return (
        <div className="min-h-screen flex flex-col bg-white selection:bg-primary selection:text-white">
            <PublicNavbar />
            <main className="flex-1">
                {/* Hero section with sophisticated background */}
                <section className="py-32 px-6 bg-slate-950 text-white relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        {/* Elegant multi-colored gradient */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#1e293b,transparent)] opacity-40" />
                        <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
                        <div className="absolute top-1/2 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />

                        {/* Noise texture overlay */}
                        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                    </div>

                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <span className="inline-block px-4 py-1.5 mb-8 text-[11px] font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 rounded-full text-blue-300 backdrop-blur-sm">
                                The Mission
                            </span>
                            <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]">
                                The Science of <br />
                                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Perfect Recall</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed mb-6 max-w-2xl mx-auto">
                                Founded on a singular principle:
                                <span className="text-white block mt-2 text-2xl md:text-3xl italic font-serif">Education demands evidence.</span>
                            </p>
                        </motion.div>
                    </div>
                </section>

                <section className="py-32 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center mb-32">
                            <motion.div
                                initial={{ opacity: 0, x: -40 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Why StudyRAG exists</h2>
                                <div className="space-y-6 text-slate-600 text-lg font-medium leading-relaxed">
                                    <p>
                                        Modern AI tools are statistical engines. They predict the "most likely" next word, which in academics leads to <span className="text-red-500 font-bold italic">hallucinations</span>—confidently stating facts that do not exist.
                                    </p>
                                    <p>
                                        StudyRAG utilizes <span className="text-primary font-bold">Retrieval-Augmented Generation (RAG)</span>. We don't guess. We search. Every answer is constructed exclusively from your verified sources.
                                    </p>
                                    <div className="pt-4 flex items-center gap-4">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300" />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">Trusted by over 10,000 students</span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="p-8 md:p-12 rounded-[3.5rem] bg-slate-50 border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                                <div className="space-y-10 relative z-10">
                                    {[
                                        { icon: Shield, title: 'Evidence-First', desc: 'No answer is generated without a verified source citation.' },
                                        { icon: Users, title: 'Zero Data Training', desc: 'Your documents stay yours. We never train on your data.' },
                                        { icon: Target, title: 'STEM Precision', desc: 'Logic-first architecture for complex formulas and reasoning.' },
                                    ].map((point, i) => (
                                        <div key={i} className="flex gap-6">
                                            <div className="w-12 h-12 shrink-0 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <point.icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-xl mb-1">{point.title}</h4>
                                                <p className="text-slate-500 font-medium leading-relaxed">{point.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 pt-24 border-t border-slate-100">
                            {[
                                { title: '100% Citation Accuracy', desc: 'Grounded in your specific materials.' },
                                { title: 'Sage 1.5 Pro Engine', desc: 'Advanced reasoning for academic research.' },
                                { title: 'Quantum Encryption', desc: 'Enterprise-grade security for your data.' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-3">{stat.title}</div>
                                    <div className="text-slate-900 font-bold text-lg leading-snug">{stat.desc}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
