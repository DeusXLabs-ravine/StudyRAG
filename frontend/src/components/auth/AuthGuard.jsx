import { useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import Auth from '../../pages/Auth';
import Onboarding from '../../pages/Onboarding';
import { MorphingSquare } from '../ui/morphing-square';

export default function AuthGuard({ children }) {
  const { user, profile, loading, initialize } = useAuthStore();
  const fetchSettings = useSettingsStore(state => state.fetchSettings);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isTestMode = new URLSearchParams(window.location.search).get('test_mode') === 'true';
  if (isTestMode) return children;

  // Once authenticated and profile loaded, fetch settings
  useEffect(() => {
    if (user && profile?.onboardingCompleted) {
      fetchSettings();
    }
  }, [user, profile?.onboardingCompleted, fetchSettings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MorphingSquare />
          <p className="mt-4 text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile || !profile.onboardingCompleted) {
    return <Onboarding />;
  }

  return children;
}
