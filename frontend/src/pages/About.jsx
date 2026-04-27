import { motion } from 'framer-motion';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { Target, Users, Shield, Search, BookOpen, Brain } from 'lucide-react';
import SEO from '../components/common/SEO';

const principles = [
  {
    icon: Shield,
    title: 'Evidence-first responses',
    desc: 'Study help is more useful when the answer stays close to the source material the learner is actually using.',
  },
  {
    icon: Search,
    title: 'Retrieval before generation',
    desc: 'StudyRAG is built around finding relevant passages before the AI explains, summarizes, or quizzes the learner.',
  },
  {
    icon: Users,
    title: 'Built for real learners',
    desc: 'The platform is designed for students, researchers, and professionals who learn from dense notes and documents.',
  },
];

const audiences = [
  {
    icon: BookOpen,
    title: 'Students',
    text: 'Use StudyRAG to revise from lecture slides, textbooks, reading packets, and class notes without losing the original context.',
  },
  {
    icon: Brain,
    title: 'Researchers',
    text: 'Move through long papers, literature reviews, and technical documents with grounded summaries and follow-up questions.',
  },
  {
    icon: Target,
    title: 'Professionals',
    text: 'Study certifications, manuals, playbooks, and training material with AI support that is still anchored to the source.',
  },
];

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About StudyRAG',
  url: 'https://studyrag.co/about',
  description: 'Learn about StudyRAG, an evidence-first AI study platform designed around retrieval, source material, and active learning.',
};

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-primary selection:text-white">
      <SEO
        title="About StudyRAG and Our Evidence-First AI Learning Approach"
        description="Learn how StudyRAG uses retrieval-augmented generation to help students study from notes, PDFs, textbooks, and research material with better context and less guesswork."
        canonical="/about"
        keywords={[
          'about studyrag',
          'evidence first ai',
          'retrieval augmented generation for education',
          'study with source material',
          'ai learning platform mission',
        ]}
        schema={aboutSchema}
      />
      <PublicNavbar />
      <main className="flex-1">
        <section className="py-32 px-6 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#1e293b,transparent)] opacity-40" />
            <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <span className="inline-block px-4 py-1.5 mb-8 text-[11px] font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 rounded-full text-blue-300 backdrop-blur-sm">
                The Mission
              </span>
              <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]">
                The Science of <br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Perfect Recall</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed mb-6 max-w-3xl mx-auto">
                StudyRAG is built on a simple idea:
                <span className="text-white block mt-2 text-2xl md:text-3xl italic font-serif">students learn better when AI stays close to the material they trust.</span>
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
                    Many AI tools are excellent at sounding confident, but academic work and serious study require more than fluency. Learners need answers that stay connected to the notes, readings, and documents they are actually trying to understand.
                  </p>
                  <p>
                    StudyRAG uses <span className="text-primary font-bold">retrieval-augmented generation</span> so the system can retrieve relevant source context before it responds. The goal is not to replace thinking. The goal is to give learners a better starting point for understanding, review, and recall.
                  </p>
                  <div className="pt-4 flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300" />
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-slate-400">Built for coursework, self-study, certification prep, and research reading</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="p-8 md:p-8 rounded-[3.5rem] bg-slate-50 border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="space-y-10 relative z-10">
                  {principles.map((point) => (
                    <div key={point.title} className="flex gap-6">
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

            <div className="grid md:grid-cols-3 gap-8">
              {audiences.map((item, index) => (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-primary flex items-center justify-center mb-6">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{item.text}</p>
                </motion.article>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-8 pt-24 mt-24 border-t border-slate-100">
              {[
                { title: 'Source-grounded answers', desc: 'Designed to keep study help closer to your uploaded material.' },
                { title: 'Document-first workflow', desc: 'Built around notes, slides, PDFs, readings, and research documents.' },
                { title: 'Study-focused experience', desc: 'Made for understanding, revision, self-testing, and longer-term recall.' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.title}
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
