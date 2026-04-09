import { create } from 'zustand';
import { getSettings, updateSetting, getLearningProfile } from '../services/analyticsService';

// Font scale steps (px) for the font size slider
export const FONT_SCALE_STEPS = [13, 14, 15, 16, 18, 20, 22, 24];

const useSettingsStore = create((set, get) => ({
  settings: {},
  voices: [],
  loaded: false,
  tutorial_completed: false,

  learningProfile: null,
  learningProfileLoaded: false,

  fetchSettings: async () => {
    try {
      const settings = await getSettings();
      set({
        settings: settings || {},
        loaded: true,
        tutorial_completed: settings?.tutorial_completed === 'true' || settings?.tutorial_completed === true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setSetting: async (key, value) => {
    set(state => ({ settings: { ...state.settings, [key]: value } }));
    try { await updateSetting(key, value); } catch { /* optimistic ok */ }
  },

  getVoiceId: () => get().settings.tts_voice_id || 'Kore',

  // ─── Accessibility helpers ──────────────────────────────────
  getA11y: (key) => get().settings[`a11y_${key}`] === 'true',

  /**
   * Apply all accessibility settings to <body> / <html> classes + CSS variables.
   * Called after any a11y setting changes and on initial load.
   */
  applyA11yClasses: () => {
    const s = get().settings;
    const body = document.body;
    const html = document.documentElement;

    // ── Boolean body class toggles ──────────────────────────
    const bodyMap = {
      'a11y-dyslexia':       s.a11y_dyslexia_mode === 'true',
      'a11y-focus':          s.a11y_adhd_focus_mode === 'true',
      'a11y-bionic':         s.a11y_bionic_reading === 'true',
      'a11y-high-contrast':  s.a11y_high_contrast === 'true',
      'a11y-large-text':     s.a11y_large_text === 'true',
      'a11y-reduced-motion': s.a11y_reduced_motion === 'true',
      'a11y-reading-ruler':  s.a11y_reading_ruler === 'true',
      // New
      'a11y-text-spacing':   s.a11y_text_spacing === 'true',
      'a11y-focus-enhanced': s.a11y_focus_enhanced === 'true',
      'a11y-dark':           s.a11y_dark_mode === 'true',
      'a11y-desaturate':     s.a11y_desaturate === 'true',
      'a11y-grayscale':      s.a11y_grayscale === 'true',
    };
    Object.entries(bodyMap).forEach(([cls, on]) => body.classList.toggle(cls, on));

    // ── Line height ─────────────────────────────────────────
    body.classList.toggle('a11y-line-relaxed', s.a11y_line_height === 'relaxed');
    body.classList.toggle('a11y-line-loose',   s.a11y_line_height === 'loose');

    // ── Word spacing ────────────────────────────────────────
    body.classList.toggle('a11y-word-wide',  s.a11y_word_spacing === 'wide');
    body.classList.toggle('a11y-word-wider', s.a11y_word_spacing === 'wider');

    // ── Cursor size ─────────────────────────────────────────
    body.classList.toggle('a11y-cursor-large',  s.a11y_cursor_size === 'large');
    body.classList.toggle('a11y-cursor-xlarge', s.a11y_cursor_size === 'xlarge');

    // ── Colour-blind filters (html element) ─────────────────
    const cbModes = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
    cbModes.forEach(m => html.classList.toggle(`a11y-cb-${m}`, s.a11y_colorblind_mode === m));

    // ── Font size (CSS variable on <html>) ──────────────────
    const fontPx = parseInt(s.a11y_font_size_px, 10);
    if (fontPx && fontPx >= 12 && fontPx <= 30) {
      html.style.setProperty('--a11y-font-scale', `${fontPx}px`);
    } else {
      html.style.removeProperty('--a11y-font-scale');
    }

    // ── Reading ruler colour ─────────────────────────────────
    if (s.a11y_ruler_color) {
      html.style.setProperty('--ruler-color', s.a11y_ruler_color);
    }
  },

  setTutorialCompleted: async (completed) => {
    set({ tutorial_completed: completed });
    try { await updateSetting('tutorial_completed', completed); } catch { /* ok */ }
  },

  setVoices: (voices) => set({ voices: Array.isArray(voices) ? voices : [] }),

  // ─── Learning Style & Pace ────────────────────────────────
  fetchLearningProfile: async () => {
    try {
      const profile = await getLearningProfile();
      set({ learningProfile: profile, learningProfileLoaded: true });
    } catch {
      set({ learningProfileLoaded: true });
    }
  },

  setLearningStyle: async (style) => {
    set(state => ({ settings: { ...state.settings, learning_style: style } }));
    try {
      await updateSetting('learning_style', style);
      const profile = await getLearningProfile();
      set({ learningProfile: profile });
    } catch { /* ok */ }
  },

  setLearningPace: async (pace) => {
    set(state => ({ settings: { ...state.settings, learning_pace: pace } }));
    try {
      await updateSetting('learning_pace', pace);
      const profile = await getLearningProfile();
      set({ learningProfile: profile });
    } catch { /* ok */ }
  },
}));

export default useSettingsStore;
