import '../global.css';
import { Sentry } from '@/lib/sentry';

import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { Stack, usePathname, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  Caveat_600SemiBold,
  useFonts as useCaveatFonts,
} from '@expo-google-fonts/caveat';
import { Kalam_400Regular, Kalam_700Bold, useFonts as useKalamFonts } from '@expo-google-fonts/kalam';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_900Black,
  useFonts as useOutfitFonts,
} from '@expo-google-fonts/outfit';
import { AppProviders } from '@/providers/AppProviders';
import { TutorialProvider } from '@/components/tutorial/TutorialProvider';
import { syncWidgets } from '@/native/widgets';
import { colors, fonts } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

function SplashState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        gap: 14,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontFamily: fonts.uiSemiBold, fontSize: 15 }}>
        Booting your StudyRAG workspace...
      </Text>
    </View>
  );
}

function RootNavigator() {
  const initialize = useAuthStore(state => state.initialize);
  const loading = useAuthStore(state => state.loading);
  const session = useAuthStore(state => state.session);
  const profile = useAuthStore(state => state.profile);
  const handleIncomingUrl = useAuthStore(state => state.handleIncomingUrl);
  const segments = useSegments();
  const pathname = usePathname();

  const [outfitLoaded] = useOutfitFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
  });
  const [kalamLoaded] = useKalamFonts({
    Kalam_400Regular,
    Kalam_700Bold,
  });
  const [caveatLoaded] = useCaveatFonts({
    Caveat_600SemiBold,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', event => {
      handleIncomingUrl(event.url);
    });

    Linking.getInitialURL().then(url => {
      if (url) {
        handleIncomingUrl(url);
      }
    });

    return () => sub.remove();
  }, [handleIncomingUrl]);

  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Keep widgets fresh — sync on login and on foreground. syncWidgets() is a
  // no-op in Expo Go (no native bridge), so this is safe everywhere.
  useEffect(() => {
    if (!session?.user) return;
    syncWidgets();
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') syncWidgets();
    });
    return () => sub.remove();
  }, [session?.user]);

  const fontsReady = outfitLoaded && kalamLoaded && caveatLoaded;
  const topSegment = segments[0];
  const isIntroRoute = topSegment === '(intro)';
  const isAuthRoute = topSegment === '(auth)';
  const needsProfile = Boolean(session?.user && !profile?.onboardingCompleted);

  useEffect(() => {
    if (!fontsReady || loading || !rootNavigationState?.key) return;

    if (!session?.user && !isIntroRoute && !isAuthRoute) {
      router.replace('/(intro)');
    } else if (session?.user && needsProfile && pathname !== '/profile-onboarding') {
      router.replace('/profile-onboarding');
    } else if (session?.user && !needsProfile && (isIntroRoute || isAuthRoute || pathname === '/')) {
      router.replace('/(tabs)');
    }
  }, [session?.user, needsProfile, isIntroRoute, isAuthRoute, pathname, fontsReady, loading, rootNavigationState?.key, router]);

  if (!fontsReady || loading) {
    return <SplashState />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(intro)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile-onboarding" />
      <Stack.Screen name="learn/[documentId]" />
      <Stack.Screen name="teach" options={{ presentation: 'modal' }} />
      <Stack.Screen name="podcast" options={{ presentation: 'modal' }} />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="exam" />
      <Stack.Screen name="simulations" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function RootLayout() {
  return (
    <AppProviders>
      <TutorialProvider>
        <RootNavigator />
      </TutorialProvider>
    </AppProviders>
  );
}

export default Sentry.wrap(RootLayout);
