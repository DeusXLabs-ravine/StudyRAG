import { create } from 'zustand';
import * as gameService from '../services/gameService';

const useGameStore = create((set, get) => ({
  stats: null,
  achievements: [],
  combo: 0,
  sessionXp: 0,
  xpToast: null,       // { amount, source } — shown briefly
  achievementToast: null, // { key, tier, label } — shown briefly
  loading: false,

  fetchStats: async () => {
    try {
      const stats = await gameService.getGameStats();
      set({ stats });
    } catch {
      // Stats unavailable
    }
  },

  fetchAchievements: async () => {
    try {
      const achievements = await gameService.getAchievements();
      set({ achievements });
    } catch {
      // Achievements unavailable
    }
  },

  generateGame: async (moduleId, gameType, difficulty) => {
    set({ loading: true });
    try {
      const game = await gameService.generateGame(moduleId, gameType, difficulty);
      return game;
    } finally {
      set({ loading: false });
    }
  },

  submitResult: async ({ gameType, score, correct, total, combo, timeMs }) => {
    try {
      const result = await gameService.submitGameResult({ gameType, score, correct, total, combo, timeMs });

      set(state => ({
        sessionXp: state.sessionXp + (result.xpEarned || 0),
        combo: combo || 0,
        stats: state.stats ? {
          ...state.stats,
          totalXP: result.totalXP,
          level: result.level,
          gamesPlayed: result.gamesPlayed,
          currentStreak: result.streak,
        } : state.stats,
      }));

      // Show XP toast
      if (result.xpEarned > 0) {
        set({ xpToast: { amount: result.xpEarned, source: gameType } });
        setTimeout(() => set({ xpToast: null }), 3000);
      }

      // Show achievement toasts
      if (result.newAchievements && result.newAchievements.length > 0) {
        for (const achievement of result.newAchievements) {
          set({ achievementToast: achievement });
          await new Promise(r => setTimeout(r, 4000));
        }
        set({ achievementToast: null });
      }

      return result;
    } catch {
      return null;
    }
  },

  incrementCombo: () => set(state => ({ combo: state.combo + 1 })),
  resetCombo: () => set({ combo: 0 }),
  clearToasts: () => set({ xpToast: null, achievementToast: null }),
}));

export default useGameStore;
