import { useEffect } from 'react';
import useBuddyStore from '../store/buddyStore';
import { useSubscription } from './useSubscription';

/**
 * useBuddyProfile
 * Loads the user's active buddy profile + catalog on mount, but only if the
 * user is actually entitled to Buddy (Max tier). Non-Max users get an empty
 * snapshot so UI can render the upgrade wall instead of hitting 403s.
 */
export default function useBuddyProfile() {
  const { canUseBuddy } = useSubscription();
  const profile = useBuddyStore(s => s.profile);
  const profileLoaded = useBuddyStore(s => s.profileLoaded);
  const loadingProfile = useBuddyStore(s => s.loadingProfile);
  const presets = useBuddyStore(s => s.presets);
  const voices = useBuddyStore(s => s.voices);
  const catalogLoaded = useBuddyStore(s => s.catalogLoaded);
  const usage = useBuddyStore(s => s.usage);

  const loadProfile = useBuddyStore(s => s.loadProfile);
  const loadCatalog = useBuddyStore(s => s.loadCatalog);
  const loadUsage = useBuddyStore(s => s.loadUsage);

  useEffect(() => {
    if (!canUseBuddy) return;
    if (!profileLoaded && !loadingProfile) loadProfile();
    if (!catalogLoaded) loadCatalog();
    loadUsage();
  }, [canUseBuddy, profileLoaded, loadingProfile, catalogLoaded, loadProfile, loadCatalog, loadUsage]);

  return {
    canUseBuddy,
    profile,
    profileLoaded,
    loadingProfile,
    needsOnboarding: canUseBuddy && profileLoaded && !profile,
    presets,
    voices,
    catalogLoaded,
    usage,
  };
}
