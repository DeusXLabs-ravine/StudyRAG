import { create } from 'zustand';
import { getSettings, updateSetting, getLearningProfile } from '../services/analyticsService';

const useSettingsStore = create((set, get) => ({
  settings: {},
  voices: [],
  loaded: false,
  tutorial_completed: false,

  // Learning profile (resolved effective style + pace, preferences, detected)
  learningProfile: null,
  learningProfileLoaded: false,

  fetchSettings: async () => {
    try {
      const settings = await getSettings();
      set({
        settings: settings || {},
        loaded: true,
        tutorial_completed: settings?.tutorial_completed === 'true' || settings?.tutorial_completed === true
      });
    } catch (err) {
      // settings load failed — defaults will be used
      set({ loaded: true });
    }
  },

  setSetting: async (key, value) => {
    set(state => ({ settings: { ...state.settings, [key]: value } }));
    try {
      await updateSetting(key, value);
    } catch (err) {
      // save failed — optimistic update already applied
    }
  },

  getVoiceId: () => {
    return get().settings.tts_voice_id || 'Kore';
  },

  // ─── Accessibility ──────────────────────────────────────
  getA11y: (key) => get().settings[`a11y_${key}`] === 'true',

  applyA11yClasses: () => {
    const s = get().settings;
    const body = document.body;
    const map = {
      'a11y-dyslexia': s.a11y_dyslexia_mode === 'true',
      'a11y-focus': s.a11y_adhd_focus_mode === 'true',
      'a11y-bionic': s.a11y_bionic_reading === 'true',
      'a11y-high-contrast': s.a11y_high_contrast === 'true',
      'a11y-large-text': s.a11y_large_text === 'true',
      'a11y-reduced-motion': s.a11y_reduced_motion === 'true',
      'a11y-reading-ruler': s.a11y_reading_ruler === 'true',
    };
    Object.entries(map).forEach(([cls, on]) => body.classList.toggle(cls, on));
  },

  setTutorialCompleted: async (completed) => {
    set({ tutorial_completed: completed });
    try {
      await updateSetting('tutorial_completed', completed);
    } catch (err) {
      // save failed — optimistic update already applied
    }
  },

  setVoices: (voices) => set({ voices: Array.isArray(voices) ? voices : [] }),

  // ─── Learning Style & Pace ────────────────────────────────

  fetchLearningProfile: async () => {
    try {
      const profile = await getLearningProfile();
      set({ learningProfile: profile, learningProfileLoaded: true });
    } catch (err) {
      // profile load failed — defaults will be used
      set({ learningProfileLoaded: true });
    }
  },

  setLearningStyle: async (style) => {
    // Update setting and refresh profile
    set(state => ({ settings: { ...state.settings, learning_style: style } }));
    try {
      await updateSetting('learning_style', style);
      // Refresh the profile to get the resolved effective values
      const profile = await getLearningProfile();
      set({ learningProfile: profile });
    } catch (err) {
      // save failed — optimistic update already applied
    }
  },

  setLearningPace: async (pace) => {
    set(state => ({ settings: { ...state.settings, learning_pace: pace } }));
    try {
      await updateSetting('learning_pace', pace);
      const profile = await getLearningProfile();
      set({ learningProfile: profile });
    } catch (err) {
      // save failed — optimistic update already applied
    }
  },
}));

export default useSettingsStore;
