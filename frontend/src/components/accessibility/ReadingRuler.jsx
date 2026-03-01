import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';

/**
 * Floating horizontal reading guide that follows the mouse cursor.
 * Helps users with dyslexia track which line they're reading.
 */
export default function ReadingRuler() {
  const isEnabled = useSettingsStore(state => state.settings.a11y_reading_ruler === 'true');
  const [y, setY] = useState(-100);

  useEffect(() => {
    if (!isEnabled) return;

    const onMove = (e) => setY(e.clientY - 20);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isEnabled]);

  if (!isEnabled) return null;

  return <div className="a11y-ruler" style={{ top: `${y}px` }} />;
}
