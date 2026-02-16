import { create } from 'zustand';
import { getSettings, updateSetting } from '../services/analyticsService';

const useSettingsStore = create((set, get) => ({
  settings: {},
  voices: [],
  loaded: false,

  fetchSettings: async () => {
    try {
      const settings = await getSettings();
      set({ settings: settings || {}, loaded: true });
    } catch (err) {
      console.error('Failed to load settings:', err.message);
      set({ loaded: true });
    }
  },

  setSetting: async (key, value) => {
    set(state => ({ settings: { ...state.settings, [key]: value } }));
    try {
      await updateSetting(key, value);
    } catch (err) {
      console.error('Failed to save setting:', err.message);
    }
  },

  getVoiceId: () => {
    return get().settings.tts_voice_id || 'Kore';
  },

  setVoices: (voices) => set({ voices: Array.isArray(voices) ? voices : [] }),
}));

export default useSettingsStore;
