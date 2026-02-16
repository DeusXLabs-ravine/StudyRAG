import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, RotateCcw, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as quizService from '../services/quizService';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';

export default function Quiz() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [config, setConfig] = useState({ numQuestions: 10, difficulty: 'medium', documentId: null, adaptive: false });
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('config'); // config, quiz, result

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await quizService.generateQuiz(config);
      setQuiz(data);
      setAnswers({});
      setCurrentQ(0);
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
      const answerArray = quiz.questions.map(q => answers[q.id] || '');
      const data = await quizService.submitQuiz(quiz.id, answerArray, quiz.questions);
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

  // Config view
  if (view === 'config') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Quiz Mode</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configure Your Quiz</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <select
                value={config.documentId || ''}
                onChange={e => setConfig(prev => ({ ...prev, documentId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Documents</option>
                {readyDocs.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
              <select
                value={config.numQuestions}
                onChange={e => setConfig(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                {[5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map(level => (
                  <button
                    key={level}
                    onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${config.difficulty === level
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.adaptive}
                  onChange={e => setConfig(prev => ({ ...prev, adaptive: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Zap className="h-4 w-4 text-purple-500" /> Adaptive Mode
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Focus questions on your weak topics for targeted practice.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <Spinner size="sm" /> : <Play className="h-4 w-4" />}
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz view
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">{q.question}</h3>

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
                    {option}
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
                {loading ? <Spinner size="sm" /> : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Result view
  if (view === 'result' && result) {
    const passed = result.score >= 70;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 py-12"
      >
        <div className={`relative sleek-card overflow-hidden shadow-2xl mb-8 ${passed ? 'bg-gradient-to-b from-emerald-50 to-white' : 'bg-gradient-to-b from-red-50 to-white'}`}>
          {/* Background Decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          <div className="relative z-10 p-12 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl ${passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
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
                className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 shadow-sm hover:shadow-md ${r.isCorrect ? 'bg-emerald-50/20 border-emerald-100/50 hover:border-emerald-200' : 'bg-red-50/20 border-red-100/50 hover:border-red-200'}`}
              >
                <div className="flex items-start gap-6">
                  <div className={`mt-1 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${r.isCorrect ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                    {r.isCorrect ? <CheckCircle className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Question {i + 1}</span>
                    <p className="text-xl font-bold text-gray-900 mb-6 leading-tight">{r.question}</p>

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
                        {r.explanation}
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
