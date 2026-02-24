import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, MessageCircle, ClipboardCheck, Layers, FileText, Upload,
  ArrowRight, Brain, LogIn
} from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/layout/Footer';
import PublicNavbar from '../components/layout/PublicNavbar';
import Logo from '../components/common/Logo';
import { LampContainer } from '../components/ui/lamp';
import useAuthStore from '../store/authStore';

const features = [
  {
    icon: BookOpen,
    title: 'Learn Mode',
    description: 'AI-generated learning modules with comprehension checks from your study materials.',
    path: '/learn',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat Mode',
    description: 'Ask questions about your materials and get AI-powered answers with citations.',
    path: '/chat',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: ClipboardCheck,
    title: 'Quiz Mode',
    description: 'Test your knowledge with auto-generated quizzes from your documents.',
    path: '/quiz',
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: Layers,
    title: 'Flashcards',
    description: 'Review key concepts with AI-generated flashcards and spaced repetition.',
    path: '/flashcards',
    color: 'bg-orange-50 text-orange-600',
  },
];

export default function Home() {
  const { user, profile, initialize } = useAuthStore();
  const isAuthenticated = user && profile?.onboardingCompleted;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    initialize();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [initialize]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Public header - Dynamic based on scroll */}
      <PublicNavbar transparent={!scrolled} />

      {/* Hero Overhaul with Lamp */}
      <LampContainer>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
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
              <Upload className="h-4 w-4 sm:h-5 sm:h-5" />
              Get Started
            </Link>
            <Link
              to="/learn"
              className="inline-flex items-center justify-center gap-2.5 bg-slate-900 border border-white/10 text-white px-5 sm:px-8 py-3 rounded-xl font-black text-sm sm:text-base hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap"
            >
              <BookOpen className="h-4 w-4 sm:h-5 sm:h-5" />
              View Demo
            </Link>
          </div>
        </motion.div>
      </LampContainer>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Core Features</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Four Ways to Master Your Materials</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon;

              // Define specific layout spans and heights to create a true bento box feel
              const isLarge = idx === 0; // Learn Mode gets a large feature slot
              const isWide = idx === 3; // Flashcards gets a wide slot

              return (
                <Link
                  key={feature.path}
                  to={feature.path}
                  className={`group relative overflow-hidden rounded-[2rem] bg-gray-50 flex flex-col justify-end p-6 transition-all hover:shadow-2xl hover:-translate-y-1 ${isLarge ? 'md:col-span-2 md:row-span-2 min-h-[320px] md:min-h-[380px]' :
                    isWide ? 'lg:col-span-2 min-h-[240px]' :
                      'min-h-[240px]'
                    }`}
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  {/* Premium Background Image */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={`/images/${['learn_mode_bg.png', 'chat_mode_bg.png', 'quiz_mode_bg.png', 'flashcards_mode_bg.png'][idx]}`}
                      alt={feature.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-gray-900/60"></div>
                  </div>

                  <div className="relative z-10">
                    <div className={`inline-flex p-3 rounded-xl bg-white/10 backdrop-blur-md text-white mb-4 border border-white/20 transition-transform group-hover:scale-110 duration-500 shadow-xl`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed font-medium">
                      {feature.description}
                    </p>
                    <div className="mt-6 flex items-center text-white font-black text-xs group-hover:gap-2 group-hover:text-blue-200 transition-all">
                      Explore {feature.title.split(' ')[0]} <ArrowRight className="h-4 w-4 text-blue-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-24 px-6 relative overflow-hidden border-t border-gray-100">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-4">The Process</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-gray-900">How StudyRAG Works</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-12 relative">
            <div className="hidden sm:block absolute top-10 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-gray-100" />
            {[
              { step: '1', icon: FileText, title: 'Upload & Index', desc: 'Securely upload your PDFs or research links. Our system instantly parses and indexes the text for retrieval.' },
              { step: '2', icon: Brain, title: 'Contextual Analysis', desc: 'When you ask a question, our RAG engine finds the exact paragraph in your data to ground the AI\'s reasoning.' },
              { step: '3', icon: ClipboardCheck, title: 'Mastery & Recall', desc: 'Interact with your materials through verified chat, adaptive quizzes, and active-recall flashcards.' },
            ].map((item, idx) => (
              <div key={item.step} className="text-center relative animate-in fade-in zoom-in duration-700" style={{ animationDelay: `${idx * 200}ms` }}>
                <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center mx-auto mb-8 text-2xl font-black shadow-xl shadow-primary/30 relative z-10 transition-transform hover:rotate-6 duration-300">
                  <item.icon className="h-10 w-10 text-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 scale-150" />
                  <span className="relative z-10">{item.step}</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
