import { router } from 'expo-router';
import { ArrowRight, Eye, Focus, Sliders, Volume2 } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { colors, fonts } from '@/lib/theme/tokens';

type Item = { icon: LucideIcon; title: string; body: string };

const items: Item[] = [
  { icon: Sliders, title: 'Depth calibration', body: 'Dial the tutor from kid-simple to grad-school rigor — per subject.' },
  { icon: Eye, title: 'Readable for everyone', body: 'Dyslexia-friendly type, high contrast, reduced motion — all one tap away.' },
  { icon: Focus, title: 'Focus mode / ADHD', body: "Strip the UI down to the task you're doing right now, nothing else." },
  { icon: Volume2, title: 'Voice & board themes', body: 'Your preferences carry into every study surface: chalkboard, whiteboard, notebook.' },
];

export default function IntroAccessibilityScreen() {
  return (
    <OnboardingScreen
      variant="sunrise"
      header={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiBold, fontSize: 14 }}>Back</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={12}>
            <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 14 }}>Skip</Text>
          </Pressable>
        </View>
      }
      footer={
        <>
          <StepDots total={5} current={3} />
          <PrimaryButton
            label="Continue"
            icon={ArrowRight}
            iconPosition="trailing"
            onPress={() => router.push('/(intro)/upgrade')}
          />
        </>
      }
    >
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={{ color: colors.warning, fontFamily: fonts.uiBlack, fontSize: 11, letterSpacing: 1.5 }}>
          PERSONALIZATION
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 32, lineHeight: 38 }}>
          The app adapts{'\n'}to how you learn.
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 16, lineHeight: 24 }}>
          Onboarding captures your pace, subject area, and accessibility needs so StudyRAG responds in a way that
          actually fits.
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 4 }}>
        {items.map(item => (
          <View
            key={item.title}
            style={{
              flexDirection: 'row',
              gap: 14,
              alignItems: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.94)',
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.22)',
              shadowColor: '#0F172A',
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.warningSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <item.icon color={colors.warning} size={20} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>{item.title}</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
                {item.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
