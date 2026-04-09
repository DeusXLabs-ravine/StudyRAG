import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { Apple, Mail, ShieldCheck } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
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
    <Screen>
      <LogoWordmark />
      <SectionTitle
        eyebrow="Sign In"
        title="Get back into your study workspace."
        subtitle="Use a magic link or sign in with your provider. Your mobile app syncs against the same StudyRAG backend and profile."
      />

      {!mobileSupabaseConfigured ? (
        <Card style={{ backgroundColor: '#FEF2F2' }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.uiBold, fontSize: 15 }}>
            Supabase mobile env vars are missing. Add the values from `mobile/.env.example` before testing auth.
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: 14 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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
            }}
          />
          <PrimaryButton label={sending ? 'Sending...' : 'Send magic link'} onPress={onMagicLink} icon={Mail} disabled={!email || sending} />
        </View>
      </Card>

      <PrimaryButton
        label="Continue with Google"
        onPress={() => signInWithGoogle().catch(error => Alert.alert('Google sign-in failed', error.message))}
        variant="secondary"
        icon={ShieldCheck}
      />
      <PrimaryButton
        label="Continue with Apple"
        onPress={() => signInWithApple().catch(error => Alert.alert('Apple sign-in failed', error.message))}
        variant="secondary"
        icon={Apple}
      />
      <PrimaryButton label="Back to onboarding" onPress={() => router.replace('/(intro)')} variant="ghost" />
    </Screen>
  );
}
