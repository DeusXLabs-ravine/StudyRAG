import { useEffect } from 'react';
import { router, useGlobalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/stores/auth-store';
import { colors, fonts } from '@/lib/theme/tokens';

export default function AuthCallbackScreen() {
  const params = useGlobalSearchParams();
  const handleIncomingUrl = useAuthStore(state => state.handleIncomingUrl);

  useEffect(() => {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const url = `studyrag://auth/callback${queryString ? `?${queryString}` : ''}`;
    handleIncomingUrl(url).finally(() => {
      router.replace('/(tabs)');
    });
  }, [handleIncomingUrl, params]);

  return (
    <Screen>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.uiBold, fontSize: 16 }}>
        Finishing your sign-in...
      </Text>
    </Screen>
  );
}
