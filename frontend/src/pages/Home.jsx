import { Link } from 'react-router-dom';
import { BookOpen, MessageCircle, ClipboardCheck, Layers, FileText, Upload, Sparkles, ArrowRight, Brain } from 'lucide-react';

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
    color: 'bg-purple-50 text-purple-600',
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
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white py-24 px-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary-400 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-bold mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles className="h-4 w-4 text-primary-200" />
            <span className="text-primary-50">Revolutionize your study routine with AI</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black mb-6 tracking-tight leading-tight">
            Master Any Subject <br />
            <span className="text-primary-200">With AI Study RAG</span>
          </h1>
          <p className="text-xl sm:text-2xl text-primary-100/90 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            Upload your materials and watch them transform into immersive learning journeys,
            interactive assessments, and intelligent study aids.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/documents"
              className="inline-flex items-center justify-center gap-3 bg-white text-primary-700 px-8 py-4 rounded-2xl font-black text-lg hover:bg-primary-50 transition-all shadow-xl shadow-black/10 active:scale-95"
            >
              <Upload className="h-6 w-6" />
              Get Started Free
            </Link>
            <Link
              to="/learn"
              className="inline-flex items-center justify-center gap-3 bg-primary-800/50 backdrop-blur-md border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-white/10 transition-all active:scale-95"
            >
              <BookOpen className="h-6 w-6" />
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-4">Core Features</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-gray-900">Four Ways to Master Your Materials</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.path}
                  to={feature.path}
                  className="sleek-card sleek-card-hover p-8 group relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <div className={`inline-flex p-4 rounded-2xl ${feature.color} mb-6 transition-transform group-hover:scale-110 duration-500 shadow-sm`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    {feature.description}
                  </p>
                  <div className="mt-8 flex items-center text-primary font-black text-sm group-hover:gap-2 transition-all opacity-0 group-hover:opacity-100">
                    Explore Now <ArrowRight className="h-4 w-4" />
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
              { step: '1', icon: FileText, title: 'Upload', desc: 'Securely upload your PDFs, Word documents, or plain text files to our study vault.' },
              { step: '2', icon: Brain, title: 'Analyze', desc: 'Our advanced AI reads and cross-references your material to build a knowledge graph.' },
              { step: '3', icon: ClipboardCheck, title: 'Master', desc: 'Interact with your docs through modules, quizzes, and AI-powered flashcards.' },
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
    </div>
  );
}
