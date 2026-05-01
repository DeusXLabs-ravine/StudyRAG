import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, Inbox, Mail } from 'lucide-react-native';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { mobileSupabaseConfigured } from '@/lib/auth/supabase';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

type Step = 'email' | 'sent';

export default function SignInScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauth, setOauth] = useState<'google' | 'apple' | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const sendMagicLink = useAuthStore(s => s.sendMagicLink);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const signInWithApple = useAuthStore(s => s.signInWithApple);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSendLink() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      setStep('sent');
      setCooldown(60);
    } catch (e) {
      Alert.alert('Dispatch failed', e instanceof Error ? e.message : 'Failed to send sign-in link');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      setCooldown(60);
    } catch (e) {
      Alert.alert('Resend failed', e instanceof Error ? e.message : 'Failed to resend link');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauth(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : `Failed to sign in with ${provider}`);
    } finally {
      setOauth(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              alignSelf: 'center',
              backgroundColor: colors.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 28,
              shadowColor: colors.text,
              shadowOpacity: 0.08,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 4,
            }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <LogoWordmark />
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.uiBlack,
                  fontSize: 22,
                  marginTop: 20,
                  textAlign: 'center',
                }}
              >
                {step === 'email' ? 'Welcome to StudyRAG' : 'Check your email'}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontFamily: fonts.uiMedium,
                  fontSize: 13,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                {step === 'email'
                  ? 'Sign in or create an account to get started'
                  : `We sent a sign-in link to ${email}`}
              </Text>
            </View>

            {!mobileSupabaseConfigured ? (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.danger, fontFamily: fonts.uiBold, fontSize: 12, lineHeight: 18 }}>
                  Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
                </Text>
              </View>
            ) : null}

            {step === 'email' ? (
              <>
                {/* OAuth */}
                <View style={{ gap: 10, marginBottom: 20 }}>
                  <OAuthButton
                    provider="google"
                    loading={oauth === 'google'}
                    disabled={oauth !== null}
                    onPress={() => handleOAuth('google')}
                  />
                  <OAuthButton
                    provider="apple"
                    loading={oauth === 'apple'}
                    disabled={oauth !== null}
                    onPress={() => handleOAuth('apple')}
                  />
                </View>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Text
                    style={{
                      color: colors.textSoft,
                      fontFamily: fonts.uiBlack,
                      fontSize: 10,
                      letterSpacing: 2,
                    }}
                  >
                    OR
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>

                {/* Email form */}
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.uiBold,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Email address
                </Text>
                <View style={{ position: 'relative', marginBottom: 18 }}>
                  <View style={{ position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }}>
                    <Mail size={18} color={colors.textSoft} />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSoft}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      paddingLeft: 44,
                      paddingRight: 14,
                      paddingVertical: 14,
                      fontFamily: fonts.uiMedium,
                      fontSize: 15,
                      color: colors.text,
                    }}
                  />
                </View>

                <Pressable
                  onPress={handleSendLink}
                  disabled={loading || !email.trim()}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 10,
                    opacity: loading || !email.trim() ? 0.5 : pressed ? 0.9 : 1,
                  })}
                >
                  {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                  <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 15 }}>
                    {loading ? 'Sending...' : 'Continue with Email'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  <Inbox size={28} color={colors.primaryDeep} />
                </View>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontFamily: fonts.uiMedium,
                    fontSize: 14,
                    textAlign: 'center',
                    lineHeight: 21,
                    marginBottom: 20,
                  }}
                >
                  Tap the link in your email to sign in. If you don&apos;t see it, check your spam folder.
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <Pressable
                    onPress={() => setStep('email')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    hitSlop={8}
                  >
                    <ArrowLeft size={14} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontFamily: fonts.uiBold, fontSize: 13 }}>Change email</Text>
                  </Pressable>
                  <Pressable onPress={handleResend} disabled={cooldown > 0 || loading} hitSlop={8}>
                    <Text
                      style={{
                        color: cooldown > 0 ? colors.textSoft : colors.primary,
                        fontFamily: fonts.uiBold,
                        fontSize: 13,
                      }}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <Text
            style={{
              color: '#9CA3AF',
              fontFamily: fonts.uiMedium,
              fontSize: 11,
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

          <Pressable
            onPress={() => router.replace('/(intro)')}
            style={{ alignSelf: 'center', marginTop: 12, padding: 8 }}
            hitSlop={8}
          >
            <Text style={{ color: '#9CA3AF', fontFamily: fonts.uiBold, fontSize: 12 }}>Back to intro</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OAuthButton({
  provider,
  loading,
  disabled,
  onPress,
}: {
  provider: 'google' | 'apple';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const isApple = provider === 'apple';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: isApple ? '#000000' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isApple ? '#000000' : '#E5E7EB',
        borderRadius: radius.md,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 12,
        opacity: disabled ? (loading ? 1 : 0.5) : pressed ? 0.9 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isApple ? '#FFFFFF' : '#6B7280'} />
      ) : isApple ? (
        <AppleIcon />
      ) : (
        <GoogleIcon />
      )}
      <Text
        style={{
          color: isApple ? '#FFFFFF' : '#374151',
          fontFamily: fonts.uiBold,
          fontSize: 14,
        }}
      >
        Continue with {isApple ? 'Apple' : 'Google'}
      </Text>
    </Pressable>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702z" />
    </Svg>
  );
}
