import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ user: session.user, session });
        await get().fetchProfile();
      }
      set({ loading: false });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user || null,
          session: session || null,
        });
        if (session?.user) {
          get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } catch (err) {
      console.error('Auth initialization failed:', err);
      set({ loading: false });
    }
  },

  sendMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/profile');
      set({ profile: data.profile });
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/auth/profile', profileData);
    set({ profile: data.profile });
    return data.profile;
  },

  createProfile: async (profileData) => {
    const { data } = await api.post('/auth/profile', profileData);
    set({ profile: data.profile });
    return data.profile;
  },

  getAccessToken: () => {
    return get().session?.access_token || null;
  },
}));

export default useAuthStore;
