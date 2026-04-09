import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { colors, fonts } from '@/lib/theme/tokens';
import { Text, View } from 'react-native';

export default function IntroUpgradeScreen() {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Upgrade Path"
        title="Free to start, premium when you want more range."
        subtitle="RevenueCat-managed subscriptions unlock premium mobile experiences like advanced simulations, teach mode, and expanded premium tools."
      />

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 18 }}>What premium unlocks</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 22 }}>
            Teach mode, premium simulations, expanded study capacity, and synced entitlement handling across your mobile subscription lifecycle.
          </Text>
        </View>
      </Card>

      <PrimaryButton label="Sign in to continue" onPress={() => router.replace('/(auth)/sign-in')} />
    </Screen>
  );
}
