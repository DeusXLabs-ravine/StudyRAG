import { create } from 'zustand';
import { getLearningProfile, getSettings, updateSetting } from '@/services/core';

type SettingsState = {
  settings: Record<string, string>;
  learningProfile: unknown;
  fetchSettings: () => Promise<void>;
  fetchLearningProfile: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  learningProfile: null,
  fetchSettings: async () => {
    const settings = await getSettings();
    set({ settings });
  },
  fetchLearningProfile: async () => {
    const learningProfile = await getLearningProfile();
    set({ learningProfile });
  },
  setSetting: async (key, value) => {
    set(state => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    }));
    await updateSetting(key, value);
  },
}));
