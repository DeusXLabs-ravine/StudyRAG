import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';
import { supabase } from '@/lib/auth/supabase';
import { configureRevenueCat, resetRevenueCatIdentity } from '@/lib/billing/revenuecat';
import { createProfile, fetchProfile, updateProfile, type Profile } from '@/services/core';

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  initialized: boolean;
  loading: boolean;
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null;
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null;
  profile: Profile | null;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  handleIncomingUrl: (url: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  completeProfileOnboarding: (payload: Parameters<typeof createProfile>[0]) => Promise<void>;
  updateProfile: (payload: Partial<Profile>) => Promise<void>;
};

function getRedirectUrl() {
  return Linking.createURL('/auth/callback');
}

async function openOAuthSession(provider: 'google' | 'apple') {
  const redirectTo = getRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success' && result.url) {
    await useAuthStore.getState().handleIncomingUrl(result.url);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  loading: true,
  session: null,
  user: null,
  profile: null,
  initialize: async () => {
    if (get().initialized) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      session,
      user: session?.user ?? null,
    });

    if (session?.user) {
      await configureRevenueCat(session.user.id);
      await get().refreshProfile();
    }

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
      });

      if (nextSession?.user) {
        await configureRevenueCat(nextSession.user.id);
        await get().refreshProfile();
      } else {
        await resetRevenueCatIdentity();
        set({ profile: null });
      }
    });

    set({
      initialized: true,
      loading: false,
    });
  },
  refreshProfile: async () => {
    try {
      const profile = await fetchProfile();
      set({ profile });
      return profile;
    } catch {
      set({ profile: null });
      return null;
    }
  },
  handleIncomingUrl: async url => {
    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get('code');
      const accessToken = parsed.searchParams.get('access_token');
      const refreshToken = parsed.searchParams.get('refresh_token');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      await get().refreshProfile();
    } catch (error) {
      console.warn('[Auth] Failed to process auth callback URL.', error);
    }
  },
  sendMagicLink: async email => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });

    if (error) throw error;
  },
  signInWithGoogle: async () => {
    await openOAuthSession('google');
  },
  signInWithApple: async () => {
    await openOAuthSession('apple');
  },
  signOut: async () => {
    await supabase.auth.signOut();
    await resetRevenueCatIdentity();
    set({ session: null, user: null, profile: null });
  },
  completeProfileOnboarding: async payload => {
    const profile = await createProfile(payload);
    set({ profile });
  },
  updateProfile: async payload => {
    const profile = await updateProfile(payload);
    set({ profile });
  },
}));
