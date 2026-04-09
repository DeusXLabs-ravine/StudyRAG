import { useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';

/**
 * Headless component — syncs accessibility settings to CSS classes / variables.
 * Rendered once in App.jsx, produces no visible DOM.
 */
export default function AccessibilityEffects() {
  const settings = useSettingsStore(state => state.settings);
  const applyA11yClasses = useSettingsStore(state => state.applyA11yClasses);

  useEffect(() => {
    applyA11yClasses();
  }, [
    // Original toggles
    settings.a11y_dyslexia_mode,
    settings.a11y_adhd_focus_mode,
    settings.a11y_bionic_reading,
    settings.a11y_high_contrast,
    settings.a11y_large_text,
    settings.a11y_reduced_motion,
    settings.a11y_reading_ruler,
    // New settings
    settings.a11y_text_spacing,
    settings.a11y_focus_enhanced,
    settings.a11y_dark_mode,
    settings.a11y_desaturate,
    settings.a11y_grayscale,
    settings.a11y_line_height,
    settings.a11y_word_spacing,
    settings.a11y_cursor_size,
    settings.a11y_colorblind_mode,
    settings.a11y_font_size_px,
    settings.a11y_ruler_color,
    applyA11yClasses,
  ]);

  return null;
}
