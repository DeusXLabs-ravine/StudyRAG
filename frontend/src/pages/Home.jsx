import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, MessageCircle, ClipboardCheck, Layers, FileText, Upload,
  ArrowRight, Brain, Sparkles, Shield, Target, Play, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/layout/Footer';
import PublicNavbar from '../components/layout/PublicNavbar';
import Logo from '../components/common/Logo';
import { LampContainer } from '../components/ui/lamp';
import FeatureLiveDemo from '../components/features/FeatureLiveDemo';
import useAuthStore from '../store/authStore';
import SEO from '../components/common/SEO';

const features = [
  {
    icon: BookOpen,
    title: 'Learn Mode',
    text: 'Step-by-step learning modules auto-generated from your documents with periodic comprehension checks.',
    demo: true
  },
  {
    icon: MessageCircle,
    title: 'Chat Mode',
    text: 'Natural language interface with your personal knowledge base. Get answers with direct source citations.',
    demo: true
  },
  {
    icon: ClipboardCheck,
    title: 'Quiz Mode',
    text: 'Verify mastery with dynamically generated assessments that adapt to your knowledge gaps.',
    demo: true
  },
  {
    icon: Layers,
    title: 'Flashcards',
    text: 'AI-distilled study deck for quick review, powered by active recall and spaced repetition.',
    demo: true
  },
];

export default function Home() {
  const { initialize } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [activePreview, setActivePreview] = useState(null);

  useEffect(() => {
    initialize();
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [initialize]);

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-primary selection:text-white">
      <SEO
        title="Master Your Knowledge with AI"
        description="StudyRAG uses Retrieval-Augmented Generation to transform your documents into interactive learning modules, quizzes, and flashcards."
        canonical="/"
        schema={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "StudyRAG",
          "operatingSystem": "Web",
          "applicationCategory": "EducationApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "description": "AI-powered learning platform using RAG to master any subject through interactive document analysis."
        }}
      />
      <PublicNavbar transparent={!scrolled} />

      <main>
        {/* Hero Section */}
        <LampContainer>
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            className="relative z-50 flex flex-col items-center justify-center px-4"
          >
            <div className="inline-flex items-center px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-[10px] sm:text-xs font-bold mb-8 text-blue-200 uppercase tracking-widest">
              <span>AI-Powered Learning Context Retrieval</span>
            </div>

            <h1 className="bg-gradient-to-br from-slate-100 to-slate-400 py-4 bg-clip-text text-center text-4xl font-black tracking-tight text-transparent sm:text-6xl md:text-8xl leading-tight">
              Master Any Subject <br />
              <span className="text-white drop-shadow-2xl">the right way</span>
            </h1>

            <p className="mt-6 text-slate-400 text-center max-w-xl mx-auto text-base sm:text-lg font-medium leading-relaxed">
              Upload your materials and watch them transform into immersive learning journeys and intelligent study aids.
            </p>

            <div className="mt-10 flex flex-row gap-4 justify-center w-full max-w-md mx-auto">
              <Link
                to="/documents"
                className="inline-flex items-center justify-center gap-2.5 bg-white text-slate-950 px-5 sm:px-8 py-3 rounded-xl font-black text-sm sm:text-base hover:bg-slate-200 transition-all shadow-2xl shadow-cyan-500/20 active:scale-95 whitespace-nowrap"
              >
                <Upload className="h-4 w-4 sm:h-5" />
                Get Started
              </Link>
              <button
                onClick={() => setActivePreview('Learn Mode')}
                className="inline-flex items-center justify-center gap-2.5 bg-slate-900 border border-white/10 text-white px-5 sm:px-8 py-3 rounded-xl font-black text-sm sm:text-base hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap"
              >
                <Play className="h-4 w-4 sm:h-5" />
                Watch Demo
              </button>
            </div>
          </motion.div>
        </LampContainer>

        {/* Features Section - Structured Overview */}
        <section className="py-32 px-6 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Core Ecosystem</h2>
              <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">Four Pillars of Mastery</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((item, i) => {
                const isHovered = hoveredIdx === i;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setActivePreview(item.title)}
                    className="group relative flex flex-col p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 transition-all hover:shadow-[0_20px_50px_rgba(14,165,233,0.08)] overflow-hidden cursor-pointer active:scale-95"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="w-14 h-14 bg-white text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm relative z-10">
                      <item.icon className="h-7 w-7" />
                    </div>

                    <div className="flex-1 relative z-10 text-left">
                      <h3 className="text-xl font-black text-slate-900 mb-3 flex items-center gap-2">
                        {item.title}
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                      </h3>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        {item.text}
                      </p>
                    </div>

                    <div className="mt-8 flex items-center justify-between relative z-10 pt-4 border-t border-slate-200/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Try It Now
                      </span>
                      <div className="p-2 rounded-xl bg-white text-slate-300 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <Link
                to="/features"
                className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em]"
              >
                Explore Detailed Capabilities <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Mission Section (About Summary) */}
        <section className="py-32 px-6 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-6 block">Our Mission</span>
                <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-none text-white">
                  The Science of <br />
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Perfect Recall</span>
                </h2>
                <p className="text-xl text-slate-400 font-medium leading-relaxed mb-8">
                  Education demands evidence. We utilize Retrieval-Augmented Generation to ensure every answer is constructed exclusively from your verified sources. No hallucinations, only truth.
                </p>
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { icon: Shield, title: 'Evidence-First', desc: 'Verified source citations.' },
                    { icon: Target, title: 'STEM Precision', desc: 'Complex reasoning support.' }
                  ].map((box, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <box.icon className="h-6 w-6 text-primary mb-3" />
                      <h4 className="font-black text-white text-lg mb-1">{box.title}</h4>
                      <p className="text-slate-400 text-sm">{box.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/10 group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 mix-blend-overlay" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-8 rounded-[2rem] bg-slate-900 shadow-2xl border border-white/10 text-center max-w-xs rotate-3 group-hover:rotate-0 transition-transform duration-700">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Logo className="h-6 w-6" />
                    </div>
                    <h4 className="text-xl font-black mb-2 italic font-serif">"Education is what remains after one has forgotten what one has learned in school."</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">— Albert Einstein</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="bg-white py-32 px-6 border-b border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">The Process</h2>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-none">How StudyRAG Works</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-16 relative">
              {[
                { step: '1', icon: FileText, title: 'Upload & Index', desc: 'Securely upload PDFs or research links. Our system parses and indexes text for instant retrieval.' },
                { step: '2', icon: Brain, title: 'Contextual Analysis', desc: 'Our RAG engine finds the exact paragraph in your data to ground the AI\'s reasoning.' },
                { step: '3', icon: ClipboardCheck, title: 'Mastery & Recall', desc: 'Interact with verified chat, adaptive quizzes, and active-recall flashcards.' },
              ].map((item, idx) => (
                <div key={idx} className="text-center group">
                  <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-8 text-2xl font-black border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm relative overflow-hidden">
                    <span className="relative z-10">{item.step}</span>
                    <item.icon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 opacity-5 scale-150 rotate-12" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_center,white,transparent)]" />
          <div className="max-w-4xl mx-auto text-center text-white relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-10 leading-[0.9] tracking-tighter">Ready to stop skimming <br />and start mastering?</h2>
            <Link to="/documents" className="bg-white text-primary px-12 py-6 rounded-[2rem] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] inline-flex items-center gap-4 group">
              Start Your First Session
              <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>

      {/* Expanded Preview Overlay (Re-using logic from Features) */}
      <AnimatePresence>
        {activePreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePreview(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            <motion.div
              layoutId={`card-${activePreview}`}
              className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              <div className="absolute top-6 right-8 z-[120]">
                <button
                  onClick={() => setActivePreview(null)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-full transition-all active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4">
                <FeatureLiveDemo
                  mode={activePreview}
                  onClose={() => setActivePreview(null)}
                />
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                  Interactive Concept Demo &bull; StudyRAG 2026
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
