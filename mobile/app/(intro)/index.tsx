import { router } from 'expo-router';
import { ArrowRight, BookOpen, Brain, Sparkles } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { colors, fonts } from '@/lib/theme/tokens';

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&q=80&auto=format&fit=crop';

export default function IntroIndexScreen() {
  return (
    <OnboardingScreen
      variant="ocean"
      photoUrl={HERO_PHOTO}
      header={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <LogoWordmark compact />
          <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={12}>
            <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 14 }}>Skip</Text>
          </Pressable>
        </View>
      }
      footer={
        <>
          <StepDots total={5} current={0} />
          <PrimaryButton
            label="Get started"
            icon={ArrowRight}
            iconPosition="trailing"
            onPress={() => router.push('/(intro)/flow')}
          />
        </>
      }
    >
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
          AI STUDY COMPANION
        </Text>
      </View>

      <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 40, lineHeight: 46, marginTop: 4 }}>
        Study that{'\n'}finally{' '}
        <Text style={{ color: colors.primary }}>makes sense.</Text>
      </Text>

      <Text
        style={{
          color: colors.textMuted,
          fontFamily: fonts.uiMedium,
          fontSize: 17,
          lineHeight: 26,
        }}
      >
        Turn your notes, PDFs, and lectures into a personal tutor that cites what you uploaded — so every answer
        is grounded, never hallucinated.
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {[
          { icon: BookOpen, label: 'Your sources', sub: 'Notes + PDFs' },
          { icon: Brain, label: 'AI tutor', sub: 'Quiz + flashcards' },
          { icon: Sparkles, label: 'Premium', sub: 'Audio + labs' },
        ].map(item => (
          <View
            key={item.label}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 20,
              padding: 14,
              gap: 10,
              borderWidth: 1,
              borderColor: 'rgba(14,165,233,0.18)',
              shadowColor: '#0F172A',
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <item.icon color={colors.primary} size={18} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 13 }}>{item.label}</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 11 }}>{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
