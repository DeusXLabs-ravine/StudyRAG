import { useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';

/**
 * Headless component that syncs accessibility settings to CSS classes on document.body.
 * Rendered in App.jsx, produces no visible DOM.
 */
export default function AccessibilityEffects() {
  const settings = useSettingsStore(state => state.settings);
  const applyA11yClasses = useSettingsStore(state => state.applyA11yClasses);

  useEffect(() => {
    applyA11yClasses();
  }, [
    settings.a11y_dyslexia_mode,
    settings.a11y_adhd_focus_mode,
    settings.a11y_bionic_reading,
    settings.a11y_high_contrast,
    settings.a11y_large_text,
    settings.a11y_reduced_motion,
    settings.a11y_reading_ruler,
    applyA11yClasses,
  ]);

  return null;
}
