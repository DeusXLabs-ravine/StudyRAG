import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle, XCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import useModuleStore from '../../store/moduleStore';

export default function QuizSection({ module, onBack, onComplete }) {
  const { submitProgress } = useModuleStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = module.questions || [];

  const handleAnswer = (questionId, answer) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);

    let correct = 0;
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer?.toLowerCase() === q.correct?.toLowerCase()) {
        correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    try {
      await submitProgress(module.id, score);
    } catch (err) {
      console.error('Failed to save progress:', err.message);
    }
  };

  const score = (() => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id]?.toLowerCase() === q.correct?.toLowerCase()) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  })();

  if (questions.length === 0) {
    return (
      <div className="sleek-card p-20 text-center">
        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="h-8 w-8" />
        </div>
        <p className="text-gray-500 mb-6">No comprehension questions available for this module.</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
        >
          Back to lesson
        </button>
      </div>
    );
  }

  if (submitted) {
    const passed = score >= 70;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sleek-card overflow-hidden"
      >
        <div className={`relative p-6 md:p-12 text-center overflow-hidden ${passed ? 'bg-gradient-to-b from-emerald-50 to-white' : 'bg-gradient-to-b from-red-50 to-white'}`}>
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl relative z-10 ${passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
          >
            <Trophy className="h-12 w-12" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black text-gray-900 mb-2"
          >
            {passed ? 'Outstanding Work!' : 'Almost There!'}
          </motion.h2>

          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <span className={`text-6xl md:text-8xl font-black ${passed ? 'text-emerald-600' : 'text-red-600'} drop-shadow-sm`}>
                {score}<span className="text-2xl md:text-4xl opacity-50">%</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={`mt-4 px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-sm ${passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}`}
            >
              {passed ? 'Mastery Achieved' : 'Learning Opportunity'}
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-gray-500 text-base max-w-md mx-auto leading-relaxed font-medium"
          >
            {passed
              ? 'You have successfully mastered the material in this module. Ready for the next challenge?'
              : 'You need at least 70% to pass this module. We recommend reviewing the lesson material before trying again.'}
          </motion.p>
        </div>

        <div className="p-5 md:p-10 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 px-2 gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900">Question Review</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">Check where you excelled and what to revisit.</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] md:text-xs font-bold text-gray-600 flex items-center gap-1.5 border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> {questions.filter(q => answers[q.id]?.toLowerCase() === q.correct?.toLowerCase()).length} Correct
              </div>
              <div className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] md:text-xs font-bold text-gray-600 flex items-center gap-1.5 border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-red-500" /> {questions.length - questions.filter(q => answers[q.id]?.toLowerCase() === q.correct?.toLowerCase()).length} Wrong
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer?.toLowerCase() === q.correct?.toLowerCase();
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + (idx * 0.1) }}
                  className={`group relative p-6 rounded-3xl border-2 transition-all duration-300 ${isCorrect ? 'bg-emerald-50/20 border-emerald-100/50 hover:border-emerald-200' : 'bg-red-50/20 border-red-100/50 hover:border-red-200'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${isCorrect ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                      {isCorrect ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Question {idx + 1}</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 mb-4 leading-tight">{q.question}</p>

                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${isCorrect ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-red-100 text-red-700'}`}>
                          <span className="opacity-50">Your Answer:</span>
                          <span className="bg-gray-50 px-2 py-0.5 rounded-lg">{userAnswer || 'Skipped'}</span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-md shadow-emerald-200">
                            <span>Correct Answer:</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded-lg">{q.correct}</span>
                          </div>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="relative p-6 bg-white rounded-2xl text-sm text-gray-600 leading-relaxed border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                          <div className="absolute -left-1.5 top-6 w-3 h-3 bg-white border-l border-b border-gray-100 rotate-45" />
                          <span className="font-black text-gray-900 block mb-2 text-xs uppercase tracking-widest opacity-40">Explanation</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="p-6 md:p-10 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-10 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3"
          >
            <ArrowLeft className="h-4 w-4" /> Review Lesson
          </button>
          {passed && onComplete && (
            <button
              onClick={onComplete}
              className="w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20 transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <Trophy className="h-4 w-4" /> Continue Journey
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="sleek-card overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all">
          <ArrowLeft className="h-4 w-4" /> Exit Quiz
        </button>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Progress</span>
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-8 h-1.5 rounded-full transition-all duration-500 ${i === currentQ ? 'bg-primary w-12' : i < currentQ ? 'bg-primary/40' : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10">
        <div className="mb-8 md:mb-10 text-center">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">
            Question {currentQ + 1} of {questions.length}
          </span>
          <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-tight md:px-10">{q.question}</h3>
        </div>

        {q.type === 'multiple_choice' && q.options && (
          <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
            {q.options.map((option, i) => {
              const letter = option.charAt(0);
              const isSelected = answers[q.id] === letter;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(q.id, letter)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group relative ${isSelected
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                    : 'border-gray-100 hover:border-primary/30 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white border-2 border-gray-100 text-gray-400 group-hover:border-primary/30'
                      }`}>
                      {letter}
                    </div>
                    <span className={`text-sm font-bold transition-all ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {option.substring(3)}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-primary">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {q.type === 'true_false' && (
          <div className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto">
            {['true', 'false'].map(val => {
              const isSelected = answers[q.id] === val;
              return (
                <button
                  key={val}
                  onClick={() => handleAnswer(q.id, val)}
                  className={`flex-1 p-8 rounded-3xl border-2 transition-all duration-200 group relative ${isSelected
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.02]'
                    : 'border-gray-100 hover:border-primary/30 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl transition-all ${isSelected ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'bg-gray-100 text-gray-400 group-hover:text-gray-900'
                      }`}>
                      {val.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-lg font-black capitalize transition-all ${isSelected ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>
                      {val}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between mt-12 pt-8 border-t border-gray-100 max-w-2xl mx-auto gap-4">
          <button
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="w-full md:w-auto px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all disabled:opacity-0 order-2 md:order-1"
          >
            ← Previous
          </button>
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              disabled={!answers[q.id]}
              className="w-full md:w-auto px-8 py-3.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-95 order-1 md:order-2"
            >
              Next Question →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length}
              className="w-full md:w-auto px-10 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-extrabold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-700/25 disabled:opacity-50 active:scale-95 uppercase tracking-wider order-1 md:order-2"
            >
              Submit Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
