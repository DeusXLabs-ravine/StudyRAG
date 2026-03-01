import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';

const BREAK_INTERVAL_MS = 25 * 60 * 1000; // 25 minutes (Pomodoro)

const MESSAGES = [
  'Time for a quick break. Stand up and stretch for a minute.',
  "You've been studying for 25 minutes. Take a breather.",
  'Good focus session. Rest your eyes for a moment.',
  'Break time. Grab some water and come back refreshed.',
];

/**
 * Shows a break reminder toast every 25 minutes when ADHD focus mode is active.
 */
export default function BreakReminder() {
  const isEnabled = useSettingsStore(state => state.settings.a11y_adhd_focus_mode === 'true');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      toast(msg, {
        duration: 10000,
        icon: <Clock size={16} className="text-primary" />,
      });
    }, BREAK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isEnabled]);

  return null;
}
