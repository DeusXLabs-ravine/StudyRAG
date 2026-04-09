import { useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, Switch, Text, View } from 'react-native';
import { FeatureCard } from '@/components/cards/FeatureCard';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { iconRegistry } from '@/lib/theme/iconRegistry';
import { colors, fonts } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useBillingStore } from '@/stores/billing-store';
import { useSettingsStore } from '@/stores/settings-store';

export default function ProfileTabScreen() {
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const offerings = useBillingStore(state => state.offerings);
  const customerInfo = useBillingStore(state => state.customerInfo);
  const syncBilling = useBillingStore(state => state.sync);
  const restorePurchases = useBillingStore(state => state.restorePurchases);
  const settings = useSettingsStore(state => state.settings);
  const fetchSettings = useSettingsStore(state => state.fetchSettings);
  const setSetting = useSettingsStore(state => state.setSetting);

  useEffect(() => {
    fetchSettings().catch(() => undefined);
    syncBilling().catch(() => undefined);
  }, [fetchSettings, syncBilling]);

  return (
    <Screen>
      <SectionTitle
        eyebrow="Profile"
        title={profile?.displayName || 'StudyRAG Profile'}
        subtitle={profile?.email || 'Your account, accessibility, and subscription controls live here.'}
      />

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 11, textTransform: 'uppercase' }}>
            Subscription
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 24 }}>
            {profile?.subscription_tier?.toUpperCase() || 'FREE'}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
            RevenueCat keeps mobile entitlements in sync while your StudyRAG backend continues to enforce product access.
          </Text>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiMedium, fontSize: 13 }}>
            Current offering: {offerings?.current?.identifier || 'Not loaded'}
          </Text>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiMedium, fontSize: 13 }}>
            Active entitlements: {Object.keys(customerInfo?.entitlements.active || {}).join(', ') || 'None'}
          </Text>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Voice input</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
              Mirror your accessibility setting from web.
            </Text>
          </View>
          <Switch
            value={settings.a11y_voice_input === 'true'}
            onValueChange={value => setSetting('a11y_voice_input', value ? 'true' : 'false')}
          />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Reduced motion</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
              Keep transitions calm and accessible.
            </Text>
          </View>
          <Switch
            value={settings.a11y_reduced_motion === 'true'}
            onValueChange={value => setSetting('a11y_reduced_motion', value ? 'true' : 'false')}
          />
        </View>
      </Card>

      <FeatureCard icon={iconRegistry.analytics} title="Open analytics" subtitle="See your weak areas, streaks, and study activity." onPress={() => router.push('/analytics')} />
      <FeatureCard icon={iconRegistry.premium} title="Upgrade or manage plan" subtitle="Browse current RevenueCat offerings, purchase, or restore access." onPress={() => router.push('/upgrade')} tone="purple" />

      <PrimaryButton
        label="Restore purchases"
        onPress={() =>
          restorePurchases()
            .then(() => Alert.alert('Purchases restored', 'RevenueCat restored any available mobile purchases.'))
            .catch(error => Alert.alert('Restore failed', error.message))
        }
        variant="secondary"
      />
      <PrimaryButton
        label="Sign out"
        onPress={() =>
          signOut()
            .then(() => router.replace('/(intro)'))
            .catch(error => Alert.alert('Sign out failed', error.message))
        }
        variant="ghost"
      />
    </Screen>
  );
}
