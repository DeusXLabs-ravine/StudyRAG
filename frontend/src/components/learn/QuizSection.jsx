import { useState } from 'react';
import { CheckCircle, XCircle, ArrowLeft, Trophy } from 'lucide-react';
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
    await submitProgress(module.id, score);
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
      <div className="sleek-card overflow-hidden">
        <div className={`p-12 text-center ${passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg ${passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            <Trophy className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            {passed ? 'Outstanding Work!' : 'Almost There!'}
          </h2>
          <div className="flex flex-col items-center">
            <span className={`text-6xl font-black mb-2 ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
              {score}%
            </span>
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${passed ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
              {passed ? 'Passed' : 'Needs Review'}
            </div>
          </div>
          <p className="text-gray-600 mt-6 max-w-md mx-auto leading-relaxed">
            {passed
              ? 'You have successfully mastered the material in this module. Ready for the next challenge?'
              : 'You need at least 70% to pass this module. We recommend reviewing the lesson material before trying again.'}
          </p>
        </div>

        <div className="p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 px-2">Question Review</h3>
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer?.toLowerCase() === q.correct?.toLowerCase();
              return (
                <div key={q.id} className={`p-6 rounded-2xl border transition-all ${isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-3">{idx + 1}. {q.question}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div className={`px-4 py-2 rounded-lg text-xs font-medium ${isCorrect ? 'bg-emerald-100/50 text-emerald-800' : 'bg-red-100/50 text-red-800'}`}>
                          Your answer: <span className="font-bold">{userAnswer || 'Skipped'}</span>
                        </div>
                        {!isCorrect && (
                          <div className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-100/50 text-emerald-800">
                            Correct: <span className="font-bold">{q.correct}</span>
                          </div>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="p-4 bg-white/50 rounded-xl text-xs text-gray-600 leading-relaxed border border-gray-100">
                          <span className="font-bold text-gray-800 block mb-1">Explanation:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            Review Lesson
          </button>
          {passed && onComplete && (
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Continue Journey
            </button>
          )}
        </div>
      </div>
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

      <div className="p-10">
        <div className="mb-10 text-center">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">
            Question {currentQ + 1} of {questions.length}
          </span>
          <h3 className="text-2xl font-extrabold text-gray-900 leading-tight md:px-10">{q.question}</h3>
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

        <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-100 max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all disabled:opacity-0"
          >
            ← Previous
          </button>
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              disabled={!answers[q.id]}
              className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-95"
            >
              Next Question →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length}
              className="px-10 py-3 bg-emerald-600 text-white rounded-xl text-sm font-extrabold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-700/25 disabled:opacity-50 active:scale-95 uppercase tracking-wider"
            >
              Submit Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
