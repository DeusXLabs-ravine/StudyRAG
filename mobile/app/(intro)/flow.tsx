import { router } from 'expo-router';
import { ArrowRight, FileText, GraduationCap, LineChart, MessagesSquare } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { colors, fonts } from '@/lib/theme/tokens';

type Step = { icon: LucideIcon; title: string; body: string };

const steps: Step[] = [
  { icon: FileText, title: 'Drop in your material', body: 'PDFs, slides, notes, URLs, or a topic. Your library syncs across web and mobile.' },
  { icon: GraduationCap, title: 'Learn with structure', body: 'Modules, lesson boards, and an AI tutor that teaches at your depth — no busywork.' },
  { icon: MessagesSquare, title: 'Reinforce fast', body: 'Chat, quizzes, and flashcards generated from your own sources in seconds.' },
  { icon: LineChart, title: 'Close the loop', body: 'Analytics surface weak areas, and practice exams hammer them until they stick.' },
];

export default function IntroFlowScreen() {
  return (
    <OnboardingScreen
      variant="violet"
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
          <StepDots total={5} current={1} />
          <PrimaryButton
            label="See the tools"
            icon={ArrowRight}
            iconPosition="trailing"
            onPress={() => router.push('/(intro)/tools')}
          />
        </>
      }
    >
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={{ color: colors.purple, fontFamily: fonts.uiBlack, fontSize: 11, letterSpacing: 1.5 }}>
          THE STUDY LOOP
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 32, lineHeight: 38 }}>
          One loop,{'\n'}tuned for mobile.
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 16, lineHeight: 24 }}>
          The landing-page story becomes your first-run tour — you&apos;ll know the whole product before you sign in.
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 8 }}>
        {steps.map((step, index) => (
          <View
            key={step.title}
            style={{
              flexDirection: 'row',
              gap: 14,
              alignItems: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(139,92,246,0.18)',
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
                backgroundColor: colors.purpleSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <step.icon color={colors.purple} size={20} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    color: colors.purple,
                    fontFamily: fonts.uiBlack,
                    fontSize: 11,
                    letterSpacing: 1.2,
                  }}
                >
                  {`0${index + 1}`}
                </Text>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>{step.title}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
                {step.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
