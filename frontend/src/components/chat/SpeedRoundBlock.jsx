import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Zap, Trophy, Timer } from 'lucide-react';

export default function SpeedRoundBlock({ block, onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(block.timePerQuestion || 8);
  const [finished, setFinished] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef(null);

  const statements = block.statements || [];
  const statement = statements[currentIdx];
  const timePerQ = block.timePerQuestion || 8;

  const advance = useCallback((answer) => {
    if (finished || !statement) return;

    clearInterval(timerRef.current);
    const isCorrect = answer === statement.isTrue;

    const newCombo = isCorrect ? combo + 1 : 0;
    if (isCorrect) setMaxCombo(m => Math.max(m, newCombo));
    setCombo(newCombo);

    const newAnswers = [...answers, { idx: currentIdx, answer, correct: statement.isTrue, isCorrect }];
    setAnswers(newAnswers);
    setShowResult(true);

    setTimeout(() => {
      setShowResult(false);
      if (currentIdx + 1 >= statements.length) {
        setFinished(true);
        const correctCount = newAnswers.filter(a => a.isCorrect).length;
        if (onComplete) {
          onComplete({
            gameType: 'speed_round',
            score: correctCount,
            correct: correctCount,
            total: statements.length,
            combo: Math.max(maxCombo, newCombo),
          });
        }
      } else {
        setCurrentIdx(i => i + 1);
        setTimeLeft(timePerQ);
      }
    }, 1000);
  }, [currentIdx, combo, maxCombo, answers, finished, statement, statements.length, onComplete, timePerQ]);

  // Timer countdown
  useEffect(() => {
    if (finished || showResult) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          advance(null); // timeout = wrong
          return timePerQ;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIdx, finished, showResult, advance, timePerQ]);

  if (finished) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const isPerfect = correctCount === statements.length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100"
      >
        <div className="text-center">
          <Trophy className={`h-12 w-12 mx-auto mb-3 ${isPerfect ? 'text-yellow-500' : 'text-orange-500'}`} />
          <h3 className="text-lg font-black text-gray-900 mb-1">Speed Round Complete!</h3>
          <p className="text-3xl font-black text-orange-600 mb-2">{correctCount}/{statements.length}</p>
          {maxCombo > 1 && (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
              <Zap className="h-3 w-3" /> Best Combo: {maxCombo}x
            </div>
          )}
          <div className="mt-3 text-sm font-bold text-orange-500">
            +{block.xpReward || 20} XP earned
          </div>
        </div>
      </motion.div>
    );
  }

  if (!statement) return null;

  const timerPct = (timeLeft / timePerQ) * 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Timer bar */}
      <div className="h-2 bg-gray-100">
        <motion.div
          className={`h-full rounded-r-full transition-colors ${timerPct > 50 ? 'bg-emerald-500' : timerPct > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {currentIdx + 1}/{statements.length}
          </span>
          <div className="flex items-center gap-3">
            {combo > 1 && (
              <motion.div
                key={combo}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black"
              >
                <Zap className="h-3 w-3 fill-current" /> {combo}x
              </motion.div>
            )}
            <div className="flex items-center gap-1 text-sm font-black text-gray-600">
              <Timer className="h-4 w-4" /> {timeLeft}s
            </div>
          </div>
        </div>

        {/* Statement */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center mb-6"
          >
            <p className="text-lg font-bold text-gray-900 leading-relaxed">{statement.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Result flash */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 flex items-center justify-center z-10 ${answers[answers.length - 1]?.isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'} rounded-2xl`}
            >
              {answers[answers.length - 1]?.isCorrect
                ? <Check className="h-16 w-16 text-emerald-500" />
                : <X className="h-16 w-16 text-red-500" />
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* True / False buttons */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => advance(true)}
            disabled={showResult}
            className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-black text-lg shadow-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="h-6 w-6" /> True
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => advance(false)}
            disabled={showResult}
            className="px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-black text-lg shadow-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="h-6 w-6" /> False
          </motion.button>
        </div>

        {/* Score tracker */}
        <div className="mt-4 flex justify-center gap-1">
          {answers.map((a, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${a.isCorrect ? 'bg-emerald-400' : 'bg-red-400'}`}
            />
          ))}
          {Array.from({ length: statements.length - answers.length }).map((_, i) => (
            <div key={`remaining-${i}`} className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
