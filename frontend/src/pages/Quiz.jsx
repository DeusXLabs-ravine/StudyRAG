import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, RotateCcw, Trophy, ClipboardCheck, X, Activity, ChevronRight, FileText, Target, LayoutPanelTop } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import * as quizService from '../services/quizService';
import useDocumentStore from '../store/documentStore';
import { MorphingSquare } from '../components/ui/morphing-square';

export default function Quiz() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [config, setConfig] = useState({ numQuestions: 10, difficulty: 'medium', documentId: null, adaptive: false });
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('config'); // config, quiz, result
  const [startTime, setStartTime] = useState(null);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await quizService.generateQuiz(config);
      setQuiz(data);
      setAnswers({});
      setCurrentQ(0);
      setStartTime(Date.now());
      setView('quiz');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
      const answerArray = quiz.questions.map(q => answers[q.id] || '');
      const data = await quizService.submitQuiz(quiz.id, answerArray, quiz.questions, timeSpentSeconds);
      setResult(data);
      setView('result');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setView('config');
  };

  if (view === 'config') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">
            <Target className="h-3 w-3" /> Technical Protocols
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tight uppercase leading-none">Assessments</h1>
          <p className="text-sm md:text-lg text-gray-500 mt-4 font-medium leading-relaxed max-w-md">Validate your proficiency through standardized testing modules and adaptive simulations.</p>
        </div>

        {/* High-Visibility Exam Mode CTA */}
        <Link
          to="/exam"
          className="mb-8 w-full flex items-center justify-between p-8 bg-gray-950 rounded-3xl hover:bg-black transition-all group shadow-2xl shadow-gray-200/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center group-hover:scale-105 transition-transform border border-white/10">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-xl font-black text-white uppercase tracking-tight">Exam Simulation</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">High-fidelity performance analytics</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-2 transition-all border border-white/5 relative z-10">
            <ChevronRight className="h-6 w-6 text-white" />
          </div>
        </Link>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm mb-10 relative">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
            <h2 className="text-[10px] font-black text-gray-950 uppercase tracking-[0.3em] flex items-center gap-2">
              <LayoutPanelTop className="h-3.5 w-3.5 text-primary" />
              Module Config
            </h2>
            <div className="px-2 py-0.5 rounded-lg bg-gray-50 text-[8px] font-black text-gray-500 uppercase tracking-widest border border-gray-100">
              Protocol v4.2
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subject Material</label>
              <div className="relative group">
                <select
                  value={config.documentId || ''}
                  onChange={e => setConfig(prev => ({ ...prev, documentId: e.target.value || null }))}
                  className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm outline-none pr-10"
                >
                  <option value="">All Documents</option>
                  {readyDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                  <Play className="h-4 w-4 rotate-90" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Questions Count</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setConfig(prev => ({ ...prev, numQuestions: n }))}
                      className={`py-2.5 rounded-xl text-xs font-black transition-all ${config.numQuestions === n
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Challenge Level</label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map(level => (
                    <button
                      key={level}
                      onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black capitalize transition-all border ${config.difficulty === level
                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                        : 'border-gray-100 text-gray-600 bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={config.adaptive}
                    onChange={e => setConfig(prev => ({ ...prev, adaptive: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${config.adaptive ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.adaptive ? 'translate-x-4' : ''}`} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Target className={`h-4 w-4 ${config.adaptive ? 'text-primary' : 'text-gray-300'}`} />
                    Adaptive Mode
                  </span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Dynamic difficulty calibration</p>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-8 w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? <MorphingSquare size="sm" /> : <Play className="h-5 w-5" />}
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  if (view === 'quiz' && quiz) {
    const q = quiz.questions[currentQ];
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900">Quiz</h1>
          <span className="text-sm text-gray-500">
            Question {currentQ + 1} of {quiz.questions.length}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-primary-600 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-lg font-medium text-gray-900 mb-4 prose prose-sm max-w-none [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_code]:text-sm [&_p]:mb-2">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.question}</ReactMarkdown>
          </div>

          {q.type === 'multiple_choice' && q.options && (
            <div className="space-y-2">
              {q.options.map((option, i) => {
                const letter = option.charAt(0);
                const isSelected = answers[q.id] === letter;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(q.id, letter)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <span className="prose prose-sm max-w-none [&_p]:mb-0 [&_p]:inline [&_code]:text-xs [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{option}</ReactMarkdown>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="flex gap-3">
              {['true', 'false'].map(val => (
                <button
                  key={val}
                  onClick={() => handleAnswer(q.id, val)}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${answers[q.id] === val
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {val}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Previous
            </button>
            {currentQ < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={answeredCount < quiz.questions.length || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? <MorphingSquare size="sm" /> : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'result' && result) {
    const passed = result.score >= 70;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 py-12"
      >
        <div className={`relative sleek-card overflow-hidden shadow-2xl mb-8 ${passed ? 'bg-gradient-to-b from-emerald-50 to-white' : 'bg-gradient-to-b from-red-50 to-white'}`}>
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className={`absolute -top-8 -left-10 w-40 h-40 rounded-full blur-3xl ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          <div className="relative z-10 p-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl ${passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
            >
              <Trophy className="h-12 w-12" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black text-gray-900 mb-2"
            >
              Quiz Mastery
            </motion.h2>

            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className={`text-8xl font-black ${passed ? 'text-emerald-600' : 'text-red-600'} drop-shadow-sm`}>
                  {result.score}<span className="text-4xl opacity-50">%</span>
                </span>
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className={`mt-4 px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-sm border ${passed ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}
              >
                {passed ? 'Achievement Unlocked' : 'Level Up Needed'}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center gap-8 border-t border-gray-100 pt-8"
            >
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">{result.correct}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Correct</p>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">{result.total}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">{Math.round((result.correct / result.total) * 100)}%</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Accuracy</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <div className="px-2 mb-2">
            <h3 className="text-2xl font-black text-gray-900">Performance Breakdown</h3>
            <p className="text-sm text-gray-500 font-medium">Review your responses and learn from the explanations.</p>
          </div>

          <AnimatePresence>
            {result.results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + (i * 0.1) }}
                className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${r.isCorrect ? 'bg-emerald-50/20 border-emerald-100/50 hover:border-emerald-200' : 'bg-red-50/20 border-red-100/50 hover:border-red-200'}`}
              >
                <div className="flex items-start gap-6">
                  <div className={`mt-1 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${r.isCorrect ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                    {r.isCorrect ? <CheckCircle className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Question {i + 1}</span>
                    <div className="text-xl font-bold text-gray-900 mb-6 leading-tight prose prose-sm max-w-none [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_table]:w-full [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{r.question}</ReactMarkdown>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border shadow-sm ${r.isCorrect ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-red-100 text-red-700'}`}>
                        <span className="opacity-40">Your Choice</span>
                        <span className={`px-2 py-0.5 rounded-lg ${r.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>{r.userAnswer || 'Skipped'}</span>
                      </div>
                      {!r.isCorrect && (
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                          <span>Correct Key</span>
                          <span className="bg-white/20 px-2 py-0.5 rounded-lg">{r.correctAnswer}</span>
                        </div>
                      )}
                    </div>

                    {r.explanation && (
                      <div className="relative p-8 bg-white rounded-3xl text-sm text-gray-600 leading-relaxed border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                        <div className="absolute -left-1.5 top-8 w-3 h-3 bg-white border-l border-b border-gray-100 rotate-45" />
                        <span className="font-black text-gray-900 block mb-3 text-[10px] uppercase tracking-[0.2em] opacity-30">Expert Explanation</span>
                        <div className="prose prose-sm max-w-none [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_code]:text-sm">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{r.explanation}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={handleRetry}
          className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-[0.98] shadow-xl shadow-primary/20"
        >
          <RotateCcw className="h-5 w-5" /> Start Fresh Session
        </motion.button>
      </motion.div>
    );
  }

  return null;
}
