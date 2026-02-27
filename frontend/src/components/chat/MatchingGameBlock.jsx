import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, CheckCircle2, Shuffle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingGameBlock({ block, onComplete }) {
  const pairs = block.pairs || [];

  const shuffledTerms = useMemo(() => shuffle(pairs.map((p, i) => ({ ...p, origIdx: i }))), []);
  const shuffledDefs = useMemo(() => shuffle(pairs.map((p, i) => ({ ...p, origIdx: i }))), []);

  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedDef, setSelectedDef] = useState(null);
  const [matched, setMatched] = useState(new Set()); // set of origIdx
  const [wrongPair, setWrongPair] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);

  const tryMatch = (termIdx, defIdx) => {
    if (termIdx === null || defIdx === null) return;

    const term = shuffledTerms[termIdx];
    const def = shuffledDefs[defIdx];
    setAttempts(a => a + 1);

    if (term.origIdx === def.origIdx) {
      // Correct match
      const newMatched = new Set(matched);
      newMatched.add(term.origIdx);
      setMatched(newMatched);
      setSelectedTerm(null);
      setSelectedDef(null);

      if (newMatched.size === pairs.length) {
        setFinished(true);
        if (onComplete) {
          onComplete({
            gameType: 'matching',
            score: pairs.length,
            correct: pairs.length,
            total: pairs.length,
            combo: 0,
          });
        }
      }
    } else {
      // Wrong match — shake and reset
      setWrongPair({ termIdx, defIdx });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedTerm(null);
        setSelectedDef(null);
      }, 600);
    }
  };

  const handleTermClick = (idx) => {
    if (matched.has(shuffledTerms[idx].origIdx)) return;
    setSelectedTerm(idx);
    if (selectedDef !== null) {
      tryMatch(idx, selectedDef);
    }
  };

  const handleDefClick = (idx) => {
    if (matched.has(shuffledDefs[idx].origIdx)) return;
    setSelectedDef(idx);
    if (selectedTerm !== null) {
      tryMatch(selectedTerm, idx);
    }
  };

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-100"
      >
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
          <h3 className="text-lg font-black text-gray-900 mb-1">All Matched!</h3>
          <p className="text-sm font-bold text-gray-500">{pairs.length} pairs in {attempts} attempts</p>
          <div className="mt-3 text-sm font-bold text-cyan-600">
            +{block.xpReward || 15} XP earned
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-cyan-500" />
            <span className="text-xs font-black text-cyan-600 uppercase tracking-widest">Match the Pairs</span>
          </div>
          <span className="text-xs font-bold text-gray-400">{matched.size}/{pairs.length} matched</span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-gray-100 rounded-full mb-5">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            animate={{ width: `${(matched.size / pairs.length) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Terms column */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Terms</p>
            {shuffledTerms.map((item, idx) => {
              const isMatched = matched.has(item.origIdx);
              const isSelected = selectedTerm === idx;
              const isWrong = wrongPair?.termIdx === idx;

              return (
                <motion.button
                  key={`term-${idx}`}
                  animate={isWrong ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  onClick={() => handleTermClick(idx)}
                  disabled={isMatched}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all border-2 ${
                    isMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-700 opacity-60' :
                    isSelected ? 'bg-cyan-50 border-cyan-400 text-cyan-800 shadow-md' :
                    isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                    'bg-gray-50 border-gray-200 text-gray-800 hover:border-cyan-300 hover:bg-cyan-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMatched && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                    <span className="truncate [&_p]:inline"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{item.term}</ReactMarkdown></span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Definitions column */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Definitions</p>
            {shuffledDefs.map((item, idx) => {
              const isMatched = matched.has(item.origIdx);
              const isSelected = selectedDef === idx;
              const isWrong = wrongPair?.defIdx === idx;

              return (
                <motion.button
                  key={`def-${idx}`}
                  animate={isWrong ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  onClick={() => handleDefClick(idx)}
                  disabled={isMatched}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all border-2 ${
                    isMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-700 opacity-60' :
                    isSelected ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-md' :
                    isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                    'bg-gray-50 border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMatched && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                    <span className="line-clamp-2 text-xs [&_p]:inline"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{item.definition}</ReactMarkdown></span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
