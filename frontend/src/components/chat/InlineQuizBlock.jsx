import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, Trophy, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const BUTTON_COLORS = [
  'from-red-500 to-rose-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-yellow-600',
];

export default function InlineQuizBlock({ block, onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]);

  const questions = block.questions || [];
  const question = questions[currentQ];

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);

    const isCorrect = idx === question.correct;
    if (isCorrect) {
      const newCombo = combo + 1;
      setScore(s => s + 1);
      setCombo(newCombo);
      setMaxCombo(m => Math.max(m, newCombo));
    } else {
      setCombo(0);
    }
    setAnswers(a => [...a, { questionIdx: currentQ, selected: idx, correct: question.correct, isCorrect }]);
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      if (onComplete) {
        onComplete({
          gameType: 'quiz',
          score,
          correct: score + (selected === question?.correct ? 0 : 0),
          total: questions.length,
          combo: maxCombo,
        });
      }
    } else {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  if (finished) {
    const finalScore = answers.filter(a => a.isCorrect).length;
    const isPerfect = finalScore === questions.length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100"
      >
        <div className="text-center">
          <Trophy className={`h-12 w-12 mx-auto mb-3 ${isPerfect ? 'text-yellow-500' : 'text-indigo-500'}`} />
          <h3 className="text-lg font-black text-gray-900 mb-1">
            {isPerfect ? 'Perfect Score!' : 'Quiz Complete!'}
          </h3>
          <p className="text-3xl font-black text-indigo-600 mb-2">{finalScore}/{questions.length}</p>
          {maxCombo > 1 && (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
              <Zap className="h-3 w-3" /> Best Combo: {maxCombo}x
            </div>
          )}
          <div className="mt-3 text-sm font-bold text-indigo-500">
            +{block.xpReward || 10} XP earned
          </div>
        </div>
      </motion.div>
    );
  }

  if (!question) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQ) / questions.length) * 100}%` }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Question {currentQ + 1}/{questions.length}
          </span>
          {combo > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black"
            >
              <Zap className="h-3 w-3 fill-current" /> {combo}x COMBO
            </motion.div>
          )}
        </div>

        {/* Question */}
        <div className="prose prose-sm max-w-none mb-5 font-bold text-gray-900">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {question.question}
          </ReactMarkdown>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(question.options || []).map((opt, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === question.correct;
            const showResult = selected !== null;

            let btnClass = `bg-gradient-to-r ${BUTTON_COLORS[idx % BUTTON_COLORS.length]} text-white`;
            if (showResult) {
              if (isCorrect) btnClass = 'bg-emerald-500 text-white ring-2 ring-emerald-300';
              else if (isSelected && !isCorrect) btnClass = 'bg-red-500 text-white ring-2 ring-red-300';
              else btnClass = 'bg-gray-200 text-gray-500';
            }

            return (
              <motion.button
                key={idx}
                whileHover={!showResult ? { scale: 1.02 } : {}}
                whileTap={!showResult ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={`relative px-4 py-3 rounded-xl font-bold text-sm text-left transition-all shadow-sm ${btnClass}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 [&_p]:inline"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown></span>
                  {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 flex-shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 flex-shrink-0" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && question.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100"
            >
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Explanation</p>
              <div className="text-sm font-medium text-blue-900 prose prose-sm max-w-none [&_p]:mb-1">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{question.explanation}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next button */}
        {selected !== null && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext}
            className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:brightness-110 transition-all"
          >
            {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'}
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
