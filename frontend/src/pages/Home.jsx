import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  Layers,
  FileText,
  Upload,
  ArrowRight,
  Brain,
  Sparkles,
  Shield,
  Target,
  Play,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/layout/Footer';
import PublicNavbar from '../components/layout/PublicNavbar';
import Logo from '../components/common/Logo';
import { LampContainer } from '../components/ui/lamp';
import FeatureLiveDemo from '../components/features/FeatureLiveDemo';
import useAuthStore from '../store/authStore';
import SEO from '../components/common/SEO';
import { ArcadeEmbed } from '../components/common/ArcadeEmbed';

const features = [
  {
    icon: BookOpen,
    title: 'Learn Mode',
    text: 'Step-by-step learning modules auto-generated from your documents with periodic comprehension checks.',
    demo: true,
  },
  {
    icon: MessageCircle,
    title: 'Chat Mode',
    text: 'Natural language interface with your personal knowledge base. Get answers with direct source citations.',
    demo: true,
  },
  {
    icon: ClipboardCheck,
    title: 'Quiz Mode',
    text: 'Verify mastery with dynamically generated assessments that adapt to your knowledge gaps.',
    demo: true,
  },
  {
    icon: Layers,
    title: 'Flashcards',
    text: 'AI-distilled study deck for quick review, powered by active recall and spaced repetition.',
    demo: true,
  },
];

const studyUseCases = [
  {
    icon: FileText,
    title: 'Study from real course material',
    text: 'Upload textbooks, lecture slides, class notes, lab manuals, and research papers, then study from the exact material your class or project uses.',
  },
  {
    icon: ClipboardCheck,
    title: 'Prepare for quizzes, tests, and exams',
    text: 'Turn dense reading into practice questions, revision modules, and flashcards so exam prep stays focused and measurable.',
  },
  {
    icon: MessageCircle,
    title: 'Get AI help with source context',
    text: 'Ask follow-up questions, request summaries, or clarify difficult topics while staying anchored to the passages that matter.',
  },
];

const studyPlatformLandscape = [
  {
    name: 'StudyRAG',
    bestFor: 'Document-grounded studying',
    text: 'Strongest when you want one workflow for PDFs, notes, citation-backed AI chat, quizzes, flashcards, and guided study modules.',
  },
  {
    name: 'Quizlet',
    bestFor: 'Fast flashcard review',
    text: 'Popular for quick deck creation and memorization when students already know the material they want to rehearse.',
  },
  {
    name: 'Anki',
    bestFor: 'Spaced repetition power users',
    text: 'A favorite for long-term recall, custom decks, and heavy memorization workflows such as language study or medical review.',
  },
  {
    name: 'Khan Academy',
    bestFor: 'Structured concept lessons',
    text: 'Useful for guided explanations and foundational learning, especially in school-level math, science, and test prep topics.',
  },
  {
    name: 'Coursera',
    bestFor: 'Course-based online learning',
    text: 'Helpful when you want university-style classes, certificates, or a full course experience instead of a document study tool.',
  },
  {
    name: 'edX',
    bestFor: 'Academic online programs',
    text: 'Works well for learners who want institution-led courses, programs, and short classes from established providers.',
  },
  {
    name: 'Udemy',
    bestFor: 'Practical skill tutorials',
    text: 'Common for affordable instructor-led courses across technical, business, and creative topics with self-paced delivery.',
  },
  {
    name: 'StudySmarter',
    bestFor: 'General revision support',
    text: 'A broad student tool for revision, study sets, and planning when you want an all-purpose school companion.',
  },
  {
    name: 'Brainscape',
    bestFor: 'Premade flashcard libraries',
    text: 'Useful for flashcard-first review when speed and ready-made decks matter more than studying directly from your own documents.',
  },
  {
    name: 'ChatGPT',
    bestFor: 'General tutoring and brainstorming',
    text: 'Helpful for broad explanations and idea generation, especially when paired with trustworthy source material and careful prompting.',
  },
];

const faqItems = [
  {
    question: 'What is StudyRAG?',
    answer: 'StudyRAG is an AI study platform that turns lecture notes, PDFs, slides, textbooks, and research material into grounded chat, learning modules, quizzes, and flashcards. Its core advantage is that the AI works from your source material instead of answering from generic memory alone.',
  },
  {
    question: 'How does StudyRAG help with exam prep?',
    answer: 'StudyRAG helps with exam prep by converting your study material into guided review flows, practice questions, recap explanations, and flashcards. That makes it useful for revision week, mock testing, and finding weak areas before an exam.',
  },
  {
    question: 'Can StudyRAG turn PDFs and notes into flashcards and quizzes?',
    answer: 'Yes. StudyRAG is built to generate flashcards, quizzes, and study modules from uploaded learning material such as PDFs, lecture handouts, textbooks, and notes so you can move from reading to active recall faster.',
  },
  {
    question: 'Is StudyRAG better than generic AI chat for studying?',
    answer: 'StudyRAG is usually the better fit when your studying depends on specific documents. Generic AI chat is useful for broad explanation, but StudyRAG is designed to retrieve relevant passages from your uploaded material and keep answers closer to those sources.',
  },
  {
    question: 'What are the top study platforms students compare today?',
    answer: 'Students often compare StudyRAG with tools such as Quizlet, Anki, Khan Academy, Coursera, edX, Udemy, StudySmarter, Brainscape, and general AI assistants like ChatGPT. The right choice depends on whether you need courses, flashcards, or document-grounded AI study help.',
  },
  {
    question: 'Which study platform is best for notes, textbooks, and lecture slides?',
    answer: 'If your workflow starts with your own notes, textbooks, lecture slides, and PDFs, a document-grounded tool like StudyRAG is a stronger fit than a course marketplace or flashcard-only tool because it is built around the material you already have.',
  },
  {
    question: 'Does StudyRAG work for STEM subjects and research-heavy courses?',
    answer: 'Yes. StudyRAG is designed for subjects where wording, formulas, and source context matter. That makes it useful for STEM courses, technical subjects, and research-heavy study where students need answers tied back to the material they uploaded.',
  },
  {
    question: 'Can I use StudyRAG for self-study as well as school?',
    answer: 'Yes. StudyRAG works for formal education, certification prep, independent learning, and professional upskilling because the workflow starts with any material you want to understand, revise, and recall more effectively.',
  },
  {
    question: 'Is there a free StudyRAG plan?',
    answer: 'Yes. StudyRAG offers a free plan so students can start uploading material and testing the workflow before deciding whether they need higher document limits, more chats, or advanced features.',
  },
];

const homeSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'StudyRAG',
    url: 'https://studyrag.co',
    description: 'StudyRAG is an AI study platform for turning notes, PDFs, textbooks, and lecture slides into guided study workflows.',
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://studyrag.co/chat?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SiteLinksSearchBox',
    url: 'https://studyrag.co',
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: 'https://studyrag.co/chat?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'StudyRAG Navigation',
    itemListElement: [
      {
        '@type': 'SiteNavigationElement',
        position: 1,
        name: 'Features',
        description: 'Explore AI chat, quizzes, flashcards, study modules, and exam prep tools built from your own documents.',
        url: 'https://studyrag.co/features',
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'Pricing',
        description: 'Free, Basic, Pro, and Max plans. Start free — no credit card required.',
        url: 'https://studyrag.co/pricing',
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'About',
        description: 'Learn about the team and mission behind StudyRAG.',
        url: 'https://studyrag.co/about',
      },
      {
        '@type': 'SiteNavigationElement',
        position: 4,
        name: 'AI Chat',
        description: 'Chat with your PDFs, lecture notes, and textbooks using document-grounded AI.',
        url: 'https://studyrag.co/chat',
      },
      {
        '@type': 'SiteNavigationElement',
        position: 5,
        name: 'Flashcards',
        description: 'Auto-generate spaced-repetition flashcard decks from your study materials.',
        url: 'https://studyrag.co/flashcards',
      },
      {
        '@type': 'SiteNavigationElement',
        position: 6,
        name: 'Quiz Mode',
        description: 'Adaptive AI quizzes that target your weak areas based on your own notes.',
        url: 'https://studyrag.co/quiz',
      },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'StudyRAG',
    operatingSystem: 'Web',
    applicationCategory: 'EducationApplication',
    url: 'https://studyrag.co',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Document-grounded AI chat',
      'Learning modules',
      'Quiz generation',
      'Flashcard generation',
      'Study workflows for notes and PDFs',
    ],
    description: 'AI-powered study software that helps students learn from their own documents using grounded retrieval and interactive revision tools.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  },
];

export default function Home() {
  const { initialize } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [activePreview, setActivePreview] = useState(null);
  const [showArcade, setShowArcade] = useState(false);

  useEffect(() => {
    initialize();
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [initialize]);

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-primary selection:text-white">
      <SEO
        title="AI Study Platform for Notes, PDFs, Flashcards, and Exam Prep"
        description="StudyRAG turns lecture notes, PDFs, textbooks, and research papers into grounded AI chat, study modules, quizzes, and flashcards for exam prep and deep understanding."
        canonical="/"
        keywords={[
          'ai study platform',
          'study app for pdfs',
          'exam prep ai',
          'flashcards from notes',
          'quiz generator from pdf',
          'study with lecture slides',
          'document based ai study tool',
          'best study platform for students',
        ]}
        schema={homeSchema}
      />
      <PublicNavbar transparent={!scrolled} />

      <main>
        <LampContainer>
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
            className="relative z-50 flex flex-col items-center justify-center px-4"
          >
            <div className="inline-flex items-center px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-[10px] sm:text-xs font-bold mb-8 text-blue-200 uppercase tracking-widest">
              <span>AI-Powered Learning Context Retrieval</span>
            </div>

            <h1 className="bg-gradient-to-br from-slate-100 to-slate-400 py-4 bg-clip-text text-center text-4xl font-black tracking-tight text-transparent sm:text-6xl md:text-8xl leading-tight">
              Master Any Subject <br />
              <span className="text-white drop-shadow-2xl">the right way</span>
            </h1>

            <p className="mt-6 text-slate-400 text-center max-w-2xl mx-auto text-base sm:text-lg font-medium leading-relaxed">
              Upload lecture slides, notes, textbooks, and PDFs, then turn them into immersive learning journeys, grounded AI chat, revision quizzes, and flashcards built for real exam prep.
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
                onClick={() => setShowArcade(true)}
                className="inline-flex items-center justify-center gap-2.5 bg-slate-900 border border-white/10 text-white px-5 sm:px-8 py-3 rounded-xl font-black text-sm sm:text-base hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap"
              >
                <Play className="h-4 w-4 sm:h-5" />
                Watch Demo
              </button>
            </div>
          </motion.div>
        </LampContainer>

        <section className="py-32 px-6 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Core Ecosystem</h2>
              <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">Four Pillars of Mastery</h3>
              <p className="max-w-3xl mx-auto mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
                StudyRAG is built for students who learn from their own material. Instead of generic AI answers, these four study modes help you review notes, lecture slides, textbooks, and research papers with structure and context.
              </p>
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

        <section className="py-32 px-6 bg-slate-950 text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />

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
                  StudyRAG is built for students, researchers, and professionals who need AI study help grounded in their own material. We use retrieval-augmented generation so answers stay closer to your notes, PDFs, and source documents instead of drifting into generic guesses.
                </p>
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { icon: Shield, title: 'Evidence-First', desc: 'Source-grounded responses for serious studying.' },
                    { icon: Target, title: 'Exam-Ready', desc: 'Built for revision, recall, and concept mastery.' },
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
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Albert Einstein</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-white py-32 px-6 border-b border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">The Process</h2>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-none">How StudyRAG Works</h3>
              <p className="max-w-3xl mx-auto mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
                The workflow is simple: bring your material in, let StudyRAG organize and retrieve the right context, then move into active learning with chat, quizzes, and flashcards.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-16 relative">
              {[
                { step: '1', icon: FileText, title: 'Upload and Index', desc: 'Securely upload PDFs, lecture notes, study guides, or research links. StudyRAG parses and indexes the content for fast retrieval.' },
                { step: '2', icon: Brain, title: 'Retrieve Context', desc: 'The RAG engine finds the passages most relevant to your question or study goal so the AI has better context to work from.' },
                { step: '3', icon: ClipboardCheck, title: 'Learn and Recall', desc: 'Use grounded chat, adaptive quizzes, and flashcards to understand concepts, rehearse them, and remember them longer.' },
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

        <section className="py-32 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Best For</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Built for how students actually study</h3>
              <p className="max-w-3xl mx-auto mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
                Whether you are revising for finals, understanding a difficult STEM topic, or summarizing a stack of research PDFs, StudyRAG is designed to turn passive reading into active study.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {studyUseCases.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mb-16">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Comparison Guide</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">10 popular study platforms students compare</h3>
              <p className="mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
                There is no single best study platform for everyone. Some tools are best for flashcards, some for full online courses, and some for document-grounded AI learning. This quick landscape is here to help students understand where StudyRAG fits.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {studyPlatformLandscape.map((platform, index) => (
                <motion.article
                  key={platform.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                    Best For
                  </p>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{platform.name}</h3>
                  <p className="text-sm font-bold text-slate-700 mb-4">{platform.bestFor}</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{platform.text}</p>
                </motion.article>
              ))}
            </div>

            <div className="mt-12 rounded-[2rem] bg-slate-950 p-8 md:p-10 text-white">
              <h4 className="text-2xl font-black mb-4">Where StudyRAG stands out</h4>
              <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed max-w-4xl">
                StudyRAG is not trying to replace every course platform or every flashcard tool. It is strongest when your studying starts with your own material and you want one place to chat with it, understand it, test yourself on it, and remember it with better context.
              </p>
            </div>
          </div>
        </section>

        <section className="py-32 px-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mb-16">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">FAQ</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">StudyRAG questions and answers</h3>
              <p className="mt-6 text-slate-500 text-base sm:text-lg font-medium leading-relaxed">
                These answers are visible on-page so students, search engines, and AI assistants can understand what StudyRAG does, who it is for, and how it compares with other study tools.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {faqItems.map((item, index) => (
                <motion.article
                  key={item.question}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{item.question}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{item.answer}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

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

      <AnimatePresence>
        {showArcade && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowArcade(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute top-4 right-4 z-[120]">
                <button
                  onClick={() => setShowArcade(false)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-full transition-all active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <ArcadeEmbed />
              </div>
              <div className="px-6 pb-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                  Interactive Demo &bull; StudyRAG 2026
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
