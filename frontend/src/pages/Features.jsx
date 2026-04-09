import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import {
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  Layers,
  Search,
  Shield,
  Zap,
  ArrowRight,
  Database,
  Sparkles,
  CheckCircle2,
  Play,
  X,
  FileText,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FeatureLiveDemo from '../components/features/FeatureLiveDemo';
import SEO from '../components/common/SEO';

const featureGroups = [
  {
    title: 'Core Learning Modes',
    description: 'Four distinct ways to interact with your material and master your subjects.',
    items: [
      {
        icon: BookOpen,
        title: 'Learn Mode',
        text: 'Step-by-step learning modules auto-generated from your documents with periodic comprehension checks.',
        demo: true,
        hoverPreview: (
          <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <div className="h-2 w-3/4 bg-blue-200 rounded-full animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="p-1 px-2 bg-white rounded border border-blue-100 text-[8px] font-black text-blue-600">Quiz: What is RAG?</div>
            </div>
            <div className="h-2 w-1/2 bg-blue-100 rounded-full" />
          </div>
        ),
      },
      {
        icon: MessageCircle,
        title: 'Chat Mode',
        text: 'Natural language interface with your personal knowledge base. Get answers with direct source citations.',
        demo: true,
        hoverPreview: (
          <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-emerald-600 text-[8px] text-white p-2 rounded-lg rounded-tr-none">Explain the process...</div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-white border border-emerald-100 text-[8px] p-2 rounded-lg rounded-tl-none italic text-emerald-800">According to page 12... [1]</div>
            </div>
          </div>
        ),
      },
      {
        icon: ClipboardCheck,
        title: 'Quiz Mode',
        text: 'Verify mastery with dynamically generated assessments that adapt to your knowledge gaps.',
        demo: true,
        hoverPreview: (
          <div className="space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex items-center justify-between p-1 px-2 rounded border text-[8px] font-bold ${i === 2 ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-white border-purple-100 text-gray-400'}`}>
                  Option {i === 2 ? 'B (Correct)' : String.fromCharCode(64 + i)}
                  {i === 2 && <CheckCircle2 className="h-2 w-2" />}
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        icon: Layers,
        title: 'Flashcards',
        text: 'AI-distilled study deck for quick review, powered by active recall and spaced repetition.',
        demo: true,
        hoverPreview: (
          <div className="flex items-center justify-center p-4">
            <div className="w-24 h-16 bg-white border-2 border-orange-100 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1.5 transform rotate-3 transition-transform group-hover:rotate-0">
              <div className="w-12 h-1 bg-orange-100 rounded-full" />
              <div className="w-8 h-1 bg-orange-50 rounded-full" />
              <div className="mt-1 text-[8px] font-black text-orange-400">FLIP</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Intelligent Infrastructure',
    description: 'The study engine behind StudyRAG is designed for context, retrieval, and verification.',
    items: [
      { icon: Database, title: 'Knowledge Workspace', text: 'Keep class notes, PDFs, and reading material in one study workspace built around your own source material.' },
      { icon: Search, title: 'Contextual Retrieval', text: 'Relevant paragraphs are retrieved before the AI responds so answers stay closer to the document context.' },
      { icon: Shield, title: 'Source Awareness', text: 'Grounded answers point back to supporting material, making it easier to verify what the model is using.' },
      { icon: Zap, title: 'Advanced AI Reasoning', text: 'Reasoning-focused models support explanation, summarization, and study guidance across complex subjects.' },
    ],
  },
];

const workflowCards = [
  {
    icon: FileText,
    title: 'Exam revision from your own material',
    text: 'Bring in lecture notes, readings, and study guides, then revise from the same material your course actually uses.',
  },
  {
    icon: Brain,
    title: 'Research-heavy learning and clarification',
    text: 'Move through dense papers and long PDFs faster by asking focused questions with the source context already attached.',
  },
  {
    icon: ClipboardCheck,
    title: 'From explanation to self-testing',
    text: 'Understand a topic, quiz yourself on it, and reinforce it with flashcards without switching to a different platform.',
  },
];

const featureSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'StudyRAG Features',
    url: 'https://studyrag.co/features',
    description: 'Overview of StudyRAG study features including grounded chat, learning modules, quizzes, flashcards, and contextual retrieval.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: featureGroups.flatMap((group) => group.items).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      description: item.text,
    })),
  },
];

export default function Features() {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [activePreview, setActivePreview] = useState(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-primary selection:text-white">
      <SEO
        title="AI Study Features for Notes, PDFs, Quizzes, and Flashcards"
        description="Explore StudyRAG's AI study features: grounded chat with citations, guided learning modules, quizzes, flashcards, and contextual retrieval for notes and PDFs."
        canonical="/features"
        keywords={[
          'ai study features',
          'study with pdf ai',
          'chat with citations',
          'quiz generator from notes',
          'flashcards from pdf',
          'rag study app',
        ]}
        schema={featureSchema}
      />
      <PublicNavbar />
      <main className="flex-1">
        <section className="py-32 px-6 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
            <div className="absolute -top-48 -right-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
          </div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[0.95]">
                Full-Stack <br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Study Intelligence</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-3xl mx-auto mt-6">
                StudyRAG brings together document-grounded chat, guided learning, practice quizzes, and flashcards so students can study from notes, PDFs, lecture slides, and readings in one place.
              </p>
            </motion.div>
          </div>
        </section>

        {featureGroups.map((group, groupIdx) => (
          <section key={group.title} className={`py-32 px-6 ${groupIdx % 2 === 1 ? 'bg-white' : ''}`}>
            <div className="max-w-7xl mx-auto">
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">{group.title}</h2>
                  <p className="text-3xl font-black text-slate-900 tracking-tight">{group.description}</p>
                </motion.div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {group.items.map((item, i) => {
                  const globalIdx = `${groupIdx}-${i}`;
                  const isHovered = hoveredIdx === globalIdx;
                  const isClickable = groupIdx === 0;

                  return (
                    <motion.div
                      key={item.title}
                      layoutId={`card-${item.title}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      onMouseEnter={() => setHoveredIdx(globalIdx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => isClickable && setActivePreview(item.title)}
                      className={`group relative flex flex-col p-8 rounded-[2.5rem] bg-white border border-slate-100 transition-all hover:shadow-[0_20px_50px_rgba(14,165,233,0.08)] overflow-hidden cursor-default ${isClickable ? 'hover:border-primary/20 cursor-pointer active:scale-95' : ''}`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <motion.div
                        layoutId={`icon-${item.title}`}
                        className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm relative z-10"
                      >
                        <item.icon className={`h-7 w-7 transition-all duration-500 ${isHovered ? 'scale-110' : ''}`} />
                      </motion.div>

                      <div className="flex-1 relative z-10">
                        <motion.h3
                          layoutId={`title-${item.title}`}
                          className="text-xl font-black text-slate-900 mb-3 flex items-center gap-2"
                        >
                          {item.title}
                          {item.demo && <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />}
                        </motion.h3>

                        <div className="relative h-[96px] overflow-hidden">
                          <AnimatePresence mode="wait">
                            {isHovered && item.hoverPreview ? (
                              <motion.div
                                key="demo"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute inset-0 pt-1"
                              >
                                {item.hoverPreview}
                              </motion.div>
                            ) : (
                              <motion.p
                                key="text"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-4"
                              >
                                {item.text}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-between relative z-10">
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${item.demo ? 'text-primary' : 'text-slate-300'}`}>
                          {item.demo ? 'Click to Launch' : 'Core Tech'}
                        </span>
                        <div className={`p-2 rounded-xl transition-all duration-500 ${isHovered ? 'bg-primary text-white translate-x-1' : 'bg-slate-50 text-slate-300'}`}>
                          <Play className="h-3 w-3 fill-current" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        <section className="py-32 px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Use Cases</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Features built around real study workflows</h3>
              <p className="max-w-3xl mx-auto mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
                These features are designed for students who study from documents, not just students who want generic AI answers.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {workflowCards.map((item, index) => (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-[2rem] bg-white border border-slate-200 p-8 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{item.text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6 bg-white">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Why It Matters</h2>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Why grounded AI features matter for learning</h3>
            <p className="mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
              In a study workflow, better answers come from better context. StudyRAG focuses on retrieval, source awareness, and active recall so learners can move from reading to understanding and then to memory.
            </p>
            <div className="mt-12">
              <Link
                to="/documents"
                className="inline-flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-primary-600 transition-colors"
              >
                Start Studying with Your Material
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

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

        <section className="py-32 px-6 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_center,white,transparent)]" />
          <div className="max-w-4xl mx-auto text-center text-white relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-10 leading-[0.9] tracking-tighter">
              Ready to stop skimming <br />
              and start mastering?
            </h2>
            <Link to="/documents" className="bg-white text-primary px-12 py-6 rounded-[2rem] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] inline-flex items-center gap-4 group">
              Start Your First Session
              <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
