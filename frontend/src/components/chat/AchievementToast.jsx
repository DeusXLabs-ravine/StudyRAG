import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import useGameStore from '../../store/gameStore';

const TIER_COLORS = [
  'from-gray-400 to-gray-500',     // tier 1 — bronze
  'from-blue-400 to-blue-600',     // tier 2 — silver
  'from-yellow-400 to-amber-500',  // tier 3 — gold
  'from-purple-400 to-pink-500',   // tier 4 — platinum
  'from-red-400 to-rose-600',      // tier 5 — diamond
];

const TIER_LABELS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

export default function AchievementToast() {
  const achievementToast = useGameStore(s => s.achievementToast);

  return (
    <AnimatePresence>
      {achievementToast && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.8 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="fixed top-24 right-8 z-50 pointer-events-none"
        >
          <div className={`flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${TIER_COLORS[(achievementToast.tier || 1) - 1] || TIER_COLORS[0]} text-white rounded-2xl shadow-2xl min-w-[280px]`}>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                Achievement Unlocked!
              </p>
              <p className="text-lg font-black leading-tight">
                {achievementToast.label || achievementToast.key}
              </p>
              <p className="text-xs font-bold opacity-80">
                {TIER_LABELS[(achievementToast.tier || 1) - 1]} Tier
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
