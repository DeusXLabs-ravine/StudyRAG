import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { iconRegistry } from '@/lib/theme/iconRegistry';
import { colors, fonts } from '@/lib/theme/tokens';

type Tool = {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: 'primary' | 'purple' | 'success' | 'warning';
};

const tools: Tool[] = [
  { icon: iconRegistry.learn, title: 'Learn', body: 'Modules, lesson boards, and an AI tutor grounded in your uploaded sources.', tone: 'primary' },
  { icon: iconRegistry.podcast, title: 'Podcast', body: 'Section-level audio lectures for hands-free revision on the commute.', tone: 'purple' },
  { icon: iconRegistry.analytics, title: 'Analytics', body: 'Weak-area detection and activity trends that tell you exactly what to review.', tone: 'success' },
  { icon: iconRegistry.simulations, title: 'Simulations', body: 'Premium interactive labs for science, math, and systems-based topics.', tone: 'warning' },
];

const tonePalette = {
  primary: { bg: colors.primarySoft, fg: colors.primary, border: 'rgba(14,165,233,0.22)' },
  purple:  { bg: colors.purpleSoft, fg: colors.purple, border: 'rgba(139,92,246,0.22)' },
  success: { bg: colors.successSoft, fg: colors.success, border: 'rgba(16,185,129,0.22)' },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: 'rgba(245,158,11,0.26)' },
} as const;

export default function IntroToolsScreen() {
  return (
    <OnboardingScreen
      variant="forest"
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
          <StepDots total={5} current={2} />
          <PrimaryButton
            label="See personalization"
            icon={ArrowRight}
            iconPosition="trailing"
            onPress={() => router.push('/(intro)/accessibility')}
          />
        </>
      }
    >
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={{ color: colors.success, fontFamily: fonts.uiBlack, fontSize: 11, letterSpacing: 1.5 }}>
          YOUR TOOLKIT
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 32, lineHeight: 38 }}>
          Every study{'\n'}surface, in one app.
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 16, lineHeight: 24 }}>
          StudyRAG on mobile keeps the advanced surfaces — not just the basics.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        {tools.map(tool => {
          const p = tonePalette[tool.tone];
          return (
            <View
              key={tool.title}
              style={{
                flexBasis: '48%',
                flexGrow: 1,
                backgroundColor: 'rgba(255,255,255,0.94)',
                borderRadius: 22,
                padding: 16,
                gap: 12,
                borderWidth: 1,
                borderColor: p.border,
                shadowColor: '#0F172A',
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: p.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <tool.icon color={p.fg} size={20} strokeWidth={2.4} />
              </View>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{tool.title}</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, lineHeight: 19 }}>
                  {tool.body}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}
