import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';

export default function ReadingRuler() {
  const isEnabled = useSettingsStore(state => state.settings.a11y_reading_ruler === 'true');
  const rulerColor = useSettingsStore(state => state.settings.a11y_ruler_color || '#8b5cf6');
  const [y, setY] = useState(-100);

  useEffect(() => {
    if (!isEnabled) return;
    const onMove = (e) => setY(e.clientY - 20);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isEnabled]);

  if (!isEnabled) return null;

  // Parse hex colour to rgba for tinted background
  const hex = rulerColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return (
    <div
      className="a11y-ruler"
      style={{
        top: `${y}px`,
        borderTopColor: `rgba(${r},${g},${b},0.45)`,
        borderBottomColor: `rgba(${r},${g},${b},0.45)`,
        background: `rgba(${r},${g},${b},0.04)`,
      }}
    />
  );
}
