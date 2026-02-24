import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, Target, Trophy } from 'lucide-react';
import useGameStore from '../../store/gameStore';

export default function XpBar() {
  const { stats, fetchStats } = useGameStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!stats) return null;

  const { totalXP, level, progressToNextLevel, currentStreak, dailyXPGoal, dailyXPEarned } = stats;
  const dailyPct = Math.min(100, Math.round((dailyXPEarned / (dailyXPGoal || 20)) * 100));

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
      {/* Level Badge */}
      <div className="flex items-center gap-1.5">
        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
          <Star className="h-3.5 w-3.5 text-white fill-current" />
        </div>
        <div className="leading-none">
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Level</p>
          <p className="text-sm font-black text-indigo-700">{level}</p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{totalXP} XP</span>
          <span className="text-[9px] font-bold text-gray-400">{progressToNextLevel}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressToNextLevel}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Streak */}
      {currentStreak > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-lg">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-black text-orange-700">{currentStreak}</span>
        </div>
      )}

      {/* Daily Goal */}
      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg" title={`Daily: ${dailyXPEarned}/${dailyXPGoal} XP`}>
        <Target className="h-3.5 w-3.5 text-emerald-500" />
        <div className="w-8 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${dailyPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
