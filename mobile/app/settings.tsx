import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartColumnBig, ChevronLeft, Crown, LifeBuoy, LogOut, RefreshCw, User } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useTutorial } from '@/components/tutorial/TutorialProvider';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { resolveSubscriptionAccess } from '@/lib/subscription';
import { colors, fonts } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useBillingStore } from '@/stores/billing-store';
import { useSettingsStore } from '@/stores/settings-store';

export default function SettingsScreen() {
  const { isTablet } = useBreakpoint();
  const profile = useAuthStore(s => s.profile);
  const signOut = useAuthStore(s => s.signOut);
  const access = resolveSubscriptionAccess(profile);
  const restorePurchases = useBillingStore(s => s.restorePurchases);
  const syncBilling = useBillingStore(s => s.sync);
  const settings = useSettingsStore(s => s.settings);
  const fetchSettings = useSettingsStore(s => s.fetchSettings);
  const setSetting = useSettingsStore(s => s.setSetting);
  const { resetAll } = useTutorial();

  useEffect(() => {
    fetchSettings().catch(() => undefined);
    syncBilling().catch(() => undefined);
  }, [fetchSettings, syncBilling]);

  const confirmResetTutorials = () => {
    Alert.alert(
      'Reset tutorials?',
      'All the in-app coach marks will show again the next time you open a screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            Alert.alert('Tutorials reset', 'Switch tabs to see them again.');
          },
        },
      ],
    );
  };

  // Center the content column on tablet so controls don't stretch edge-to-edge.
  const contentColumnStyle = {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    maxWidth: isTablet ? 640 : undefined,
    alignSelf: 'center' as const,
    width: '100%' as const,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: isTablet ? 640 : undefined, alignSelf: 'center', width: '100%' }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} color={colors.textMuted} />
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 22 }}>Settings</Text>
      </View>

      <Screen padded={false} contentContainerStyle={contentColumnStyle}>
        {/* Profile card */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User color={colors.primaryDeep} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>
                {profile?.displayName || 'StudyRAG user'}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
                {profile?.email || '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Plan */}
        <Pressable onPress={() => router.push('/upgrade')}>
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: '#BAE6FD' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(3,105,161,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown color={colors.primaryDeep} size={20} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.4 }}>
                  PLAN
                </Text>
                <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: 18 }}>
                  {access.planLabel}
                </Text>
                {access.isAdminGranted ? (
                  <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 12, marginTop: 2 }}>
                    Admin unlimited override
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 14 }}>Manage ›</Text>
            </View>
          </Card>
        </Pressable>

        {/* Accessibility toggles */}
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.6, paddingLeft: 4 }}>
            ACCESSIBILITY
          </Text>
          <ToggleRow
            label="Voice input"
            hint="Mirror your web setting"
            value={settings.a11y_voice_input === 'true'}
            onChange={v => setSetting('a11y_voice_input', v ? 'true' : 'false')}
          />
          <ToggleRow
            label="Reduced motion"
            hint="Keep transitions calm"
            value={settings.a11y_reduced_motion === 'true'}
            onChange={v => setSetting('a11y_reduced_motion', v ? 'true' : 'false')}
          />
          <ToggleRow
            label="Dyslexia-friendly type"
            hint="Larger line height and spacing"
            value={settings.a11y_dyslexia === 'true'}
            onChange={v => setSetting('a11y_dyslexia', v ? 'true' : 'false')}
          />
        </View>

        {/* Analytics link */}
        <Pressable onPress={() => router.push('/analytics')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(139,92,246,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChartColumnBig color="#8B5CF6" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>Analytics</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                  Streaks, weak areas, study minutes
                </Text>
              </View>
              <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 14 }}>›</Text>
            </View>
          </Card>
        </Pressable>

        {/* Help */}
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.6, paddingLeft: 4 }}>
            HELP
          </Text>
          <Pressable onPress={confirmResetTutorials}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: 'rgba(14,165,233,0.14)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LifeBuoy color={colors.primary} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>Reset tutorials</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                    Show the in-app coach marks again
                  </Text>
                </View>
                <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 14 }}>›</Text>
              </View>
            </Card>
          </Pressable>
        </View>

        <PrimaryButton
          label="Restore purchases"
          icon={RefreshCw}
          variant="secondary"
          onPress={() =>
            restorePurchases()
              .then(() => Alert.alert('Purchases restored', 'RevenueCat restored any available purchases.'))
              .catch(e => Alert.alert('Restore failed', e instanceof Error ? e.message : 'Try again'))
          }
        />

        <PrimaryButton
          label="Sign out"
          icon={LogOut}
          variant="ghost"
          onPress={() =>
            signOut()
              .then(() => router.replace('/(intro)'))
              .catch(e => Alert.alert('Sign out failed', e instanceof Error ? e.message : 'Try again'))
          }
        />
      </Screen>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>{label}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>{hint}</Text>
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: '#CBD5E1' }} />
      </View>
    </Card>
  );
}
