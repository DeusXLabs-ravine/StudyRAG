import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, Target, Trophy } from 'lucide-react';
import useGameStore from '../../store/gameStore';

export default function XpBar({ variant = 'stacked' }) {
  const { stats, fetchStats } = useGameStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!stats) return null;

  const { totalXP, level, progressToNextLevel, currentStreak, dailyXPGoal, dailyXPEarned } = stats;
  const dailyPct = Math.min(100, Math.round((dailyXPEarned / (dailyXPGoal || 20)) * 100));

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-white border border-blue-100 rounded-xl shadow-sm">
        {/* Level */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-gray-100">
          <div className="w-6 h-6 bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] rounded-lg flex items-center justify-center">
            <Star className="h-3 w-3 text-white fill-current" />
          </div>
          <span className="text-sm font-black text-[#0f172a]">{level}</span>
        </div>

        {/* XP Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{totalXP} XP</span>
            <span className="text-[9px] font-bold text-blue-500">{progressToNextLevel}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#0EA5E9] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Streak & Goal icons */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500 fill-current" />
              <span className="text-xs font-black text-orange-600">{currentStreak}</span>
            </div>
          )}
          <div className="relative w-6 h-6" title={`Daily: ${dailyPct}%`}>
            <svg className="w-6 h-6 -rotate-90">
              <circle cx="12" cy="12" r="10" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
              <circle
                cx="12" cy="12" r="10" fill="transparent" stroke="#10b981" strokeWidth="3"
                strokeDasharray={62.8}
                strokeDashoffset={62.8 - (62.8 * dailyPct) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <Target className="absolute inset-0 m-auto h-2.5 w-2.5 text-emerald-500/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Level Card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
        <div className="w-9 h-9 bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
          <Star className="h-4 w-4 text-white fill-current" />
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Quantum Level</p>
          <p className="text-base font-black text-[#0f172a] leading-none">{level}</p>
        </div>
      </div>

      {/* XP Progress Card */}
      <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{totalXP} Total XP</span>
          </div>
          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{progressToNextLevel}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressToNextLevel}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Activity Card */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${currentStreak > 0 ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-300'}`}>
            <Flame className="h-4 w-4 fill-current" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Streak</p>
            <p className={`text-sm font-black leading-none ${currentStreak > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              {currentStreak} Days
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-100 mx-1" />

        <div className="flex items-center gap-2" title={`Daily: ${dailyXPEarned}/${dailyXPGoal} XP`}>
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Daily Goal</p>
            <p className="text-sm font-black text-emerald-600 leading-none">{dailyPct}%</p>
          </div>
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90">
              <circle cx="16" cy="16" r="14" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
              <circle
                cx="16" cy="16" r="14" fill="transparent" stroke="#10b981" strokeWidth="4"
                strokeDasharray={88}
                strokeDashoffset={88 - (88 * dailyPct) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <Target className="absolute inset-0 m-auto h-3 w-3 text-emerald-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
