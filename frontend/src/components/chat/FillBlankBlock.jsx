import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Trophy, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function FillBlankBlock({ block, onComplete }) {
  const items = block.items || [];
  const [answers, setAnswers] = useState(items.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  const handleChange = (idx, value) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    const itemResults = items.map((item, idx) => {
      const userAnswer = (answers[idx] || '').trim().toLowerCase();
      const correctAnswer = (item.answer || '').trim().toLowerCase();
      return {
        isCorrect: userAnswer === correctAnswer,
        userAnswer: answers[idx],
        correctAnswer: item.answer,
      };
    });

    setResults(itemResults);
    setSubmitted(true);

    const correctCount = itemResults.filter(r => r.isCorrect).length;
    if (onComplete) {
      onComplete({
        gameType: 'fill_blank',
        score: correctCount,
        correct: correctCount,
        total: items.length,
        combo: 0,
      });
    }
  };

  if (submitted && results) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const isPerfect = correctCount === items.length;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5">
          <div className="text-center mb-5">
            <Trophy className={`h-10 w-10 mx-auto mb-2 ${isPerfect ? 'text-yellow-500' : 'text-purple-500'}`} />
            <h3 className="text-lg font-black text-gray-900">{isPerfect ? 'Perfect!' : 'Results'}</h3>
            <p className="text-2xl font-black text-purple-600">{correctCount}/{items.length}</p>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const r = results[idx];
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 ${r.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}
                >
                  <div className="text-sm font-bold text-gray-800 mb-2 prose prose-sm max-w-none [&_p]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {item.sentence.replace('____', r.isCorrect ? `**${r.correctAnswer}**` : `~~${r.userAnswer || '(empty)'}~~ → **${r.correctAnswer}**`)}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold">
                    {r.isCorrect
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> <span className="text-emerald-600">Correct</span></>
                      : <><XCircle className="h-3.5 w-3.5 text-red-500" /> <span className="text-red-600">Answer: {r.correctAnswer}</span></>
                    }
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center text-sm font-bold text-purple-500">
            +{block.xpReward || 12} XP earned
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="h-1.5 bg-purple-100">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-0" />
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Fill in the Blanks</span>
        </div>

        <div className="space-y-5">
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="text-sm font-bold text-gray-800 mb-3 leading-relaxed [&_p]:inline">
                {item.sentence.split('____').map((part, pIdx, arr) => (
                  <span key={pIdx}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{part}</ReactMarkdown>
                    {pIdx < arr.length - 1 && (
                      <input
                        type="text"
                        value={answers[idx] || ''}
                        onChange={e => handleChange(idx, e.target.value)}
                        placeholder="..."
                        className="inline-block w-28 mx-1 px-2 py-0.5 bg-white border-2 border-purple-200 rounded-lg text-sm font-bold text-purple-700 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none text-center"
                      />
                    )}
                  </span>
                ))}
              </div>
              {item.hint && (
                <div className="text-[11px] font-medium text-gray-400 italic [&_p]:inline">Hint: <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{item.hint}</ReactMarkdown></div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={answers.every(a => !a.trim())}
          className="mt-5 w-full px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm shadow-lg hover:brightness-110 transition-all disabled:opacity-40"
        >
          Check Answers
        </motion.button>
      </div>
    </div>
  );
}
