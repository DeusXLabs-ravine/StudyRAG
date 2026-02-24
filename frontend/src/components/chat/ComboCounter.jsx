import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function ComboCounter({ combo }) {
  if (!combo || combo < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={combo}
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg shadow-orange-500/30 font-black text-sm"
      >
        <Zap className="h-4 w-4 fill-current" />
        {combo}x COMBO
        {combo >= 5 && <span className="ml-1">🔥</span>}
      </motion.div>
    </AnimatePresence>
  );
}
