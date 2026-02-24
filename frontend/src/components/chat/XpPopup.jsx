import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import useGameStore from '../../store/gameStore';

export default function XpPopup() {
  const xpToast = useGameStore(s => s.xpToast);

  return (
    <AnimatePresence>
      {xpToast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.5 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="fixed bottom-24 right-8 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-2xl shadow-2xl shadow-amber-500/30 font-black text-lg">
            <Zap className="h-5 w-5 fill-current" />
            +{xpToast.amount} XP
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
