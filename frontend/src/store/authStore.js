import { create } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import api from '../services/api';

const PROFILE_CACHE_KEY = 'studyrag_cached_profile';
const PROFILE_CACHE_VERSION = 'v3'; // admin-unlimited metadata changed; invalidate older cached profiles
const PROFILE_VERSION_KEY = 'studyrag_profile_version';

// One-time cache bust: clear old profile cache when version changes
if (typeof window !== 'undefined') {
  const storedVersion = localStorage.getItem(PROFILE_VERSION_KEY);
  if (storedVersion !== PROFILE_CACHE_VERSION) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.setItem(PROFILE_VERSION_KEY, PROFILE_CACHE_VERSION);
  }
}

let _initStarted = false;

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    if (_initStarted) return;
    _initStarted = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Immediately apply cached profile so the app renders without a spinner
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          try {
            const cachedProfile = JSON.parse(cached);
            set({ user: session.user, session, profile: cachedProfile, loading: false });
          } catch {
            set({ user: session.user, session, loading: false });
          }
        } else {
          set({ user: session.user, session });
          await get().fetchProfile();
        }
        // Refresh profile in background (no await) to pick up any server-side changes
        get().fetchProfile();
      }
      set({ loading: false });

      supabase.auth.onAuthStateChange((event, session) => {
        set({
          user: session?.user || null,
          session: session || null,
        });
        if (session?.user) {
          get().fetchProfile();
          if (event === 'SIGNED_IN') {
            toast.success('Successfully Signed In', {
              description: 'Welcome back to your personalized study dashboard.'
            });
            if (window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname === '/auth/callback') {
              window.location.href = '/library';
            }
          }
        } else {
          set({ profile: null });
        }
      });
    } catch (err) {
      // auth init failed — loading:false will show login
      set({ loading: false });
    }
  },

  sendMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  },

  signInWithApple: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(PROFILE_CACHE_KEY);
    set({ user: null, session: null, profile: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/profile');
      set({ profile: data.profile });
      try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data.profile)); } catch {}
    } catch (err) {
      if (err.response?.status === 401) {
        // Verify session is actually gone before signing out (avoids sign-out on transient 401)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) get().signOut();
      }
      // fetch profile failed — cached profile (if any) remains in use
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/auth/profile', profileData);
    set({ profile: data.profile });
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data.profile)); } catch {}
    return data.profile;
  },

  createProfile: async (profileData) => {
    const { data } = await api.post('/auth/profile', profileData);
    set({ profile: data.profile });
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data.profile)); } catch {}
    return data.profile;
  },

  getAccessToken: () => {
    return get().session?.access_token || null;
  },
}));

export default useAuthStore;
