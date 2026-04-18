import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Apple, Mail, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { HeroBackdrop } from '@/components/ui/HeroBackdrop';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { mobileSupabaseConfigured } from '@/lib/auth/supabase';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const sendMagicLink = useAuthStore(state => state.sendMagicLink);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signInWithApple = useAuthStore(state => state.signInWithApple);

  async function onMagicLink() {
    try {
      setSending(true);
      await sendMagicLink(email);
      Alert.alert('Check your email', 'A StudyRAG sign-in link is on its way.');
    } catch (error) {
      Alert.alert('Could not send magic link', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <HeroBackdrop variant="ocean" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LogoWordmark />

          <View style={{ gap: 10, marginTop: 8 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(14,165,233,0.12)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: 'rgba(14,165,233,0.22)',
              }}
            >
              <Sparkles color={colors.primary} size={13} strokeWidth={2.6} />
              <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: 11, letterSpacing: 1.4 }}>
                SIGN IN
              </Text>
            </View>

            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 32, lineHeight: 38 }}>
              Get back into your{'\n'}
              <Text style={{ color: colors.primary }}>study workspace.</Text>
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 22 }}>
              Same account as the web app. Use a magic link or sign in with your provider — your library, progress,
              and subscription sync automatically.
            </Text>
          </View>

          {!mobileSupabaseConfigured ? (
            <Card style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
              <Text style={{ color: colors.danger, fontFamily: fonts.uiBold, fontSize: 14, lineHeight: 20 }}>
                Supabase env vars are missing. Copy values from `mobile/.env.example` before testing auth.
              </Text>
            </Card>
          ) : null}

          <Card>
            <View style={{ gap: 14 }}>
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontFamily: fonts.uiBlack,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textSoft}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontFamily: fonts.uiMedium,
                    fontSize: 15,
                    color: colors.text,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>
              <PrimaryButton
                label={sending ? 'Sending link...' : 'Send magic link'}
                onPress={onMagicLink}
                icon={Mail}
                loading={sending}
                disabled={!email || sending}
              />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text
              style={{
                color: colors.textSoft,
                fontFamily: fonts.uiBold,
                fontSize: 11,
                letterSpacing: 1.6,
              }}
            >
              OR CONTINUE WITH
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <View style={{ gap: 10 }}>
            <PrimaryButton
              label="Continue with Apple"
              onPress={() => signInWithApple().catch(error => Alert.alert('Apple sign-in failed', error.message))}
              variant="secondary"
              icon={Apple}
            />
            <PrimaryButton
              label="Continue with Google"
              onPress={() => signInWithGoogle().catch(error => Alert.alert('Google sign-in failed', error.message))}
              variant="secondary"
              icon={ShieldCheck}
            />
          </View>

          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <PrimaryButton
              label="Back to onboarding"
              onPress={() => router.replace('/(intro)')}
              variant="ghost"
              fullWidth={false}
              size="md"
            />
          </View>

          <Text
            style={{
              color: colors.textSoft,
              fontFamily: fonts.uiMedium,
              fontSize: 12,
              textAlign: 'center',
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            By continuing, you agree to StudyRAG&apos;s Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
