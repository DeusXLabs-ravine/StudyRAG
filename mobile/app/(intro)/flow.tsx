import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { colors, fonts } from '@/lib/theme/tokens';
import { Text, View } from 'react-native';

const steps = [
  'Bring in files, URLs, notes, and research topics.',
  'Study inside Learn with modules, tutor help, and board-style lesson surfaces.',
  'Use Chat, Quiz, and Flashcards to reinforce understanding fast.',
  'Track progress through analytics, practice exams, and targeted weak-area review.',
];

export default function IntroFlowScreen() {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Workflow"
        title="One study loop, tuned for mobile."
        subtitle="The landing-page story becomes your first-run product tour, so new users understand the product before they sign in."
      />

      <Card>
        <View style={{ gap: 16 }}>
          {steps.map((step, index) => (
            <View key={step} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack }}>{index + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 22 }}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <PrimaryButton label="See advanced tools" onPress={() => router.push('/(intro)/tools')} />
    </Screen>
  );
}
