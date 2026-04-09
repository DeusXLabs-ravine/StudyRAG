import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { colors, fonts } from '@/lib/theme/tokens';
import { Text, View } from 'react-native';

const items = [
  'Teaching depth calibration from simple to advanced',
  'Accessibility options for dyslexia, ADHD, reduced motion, and visual comfort',
  'Board theme and voice preferences carried into the study experience',
];

export default function IntroAccessibilityScreen() {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Personalization"
        title="The app adapts to how you learn."
        subtitle="Onboarding captures your pace, subject area, and accessibility needs so StudyRAG can respond in a way that actually fits."
      />

      <Card style={{ backgroundColor: colors.purpleSoft }}>
        <View style={{ gap: 14 }}>
          {items.map(item => (
            <Text key={item} style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 22 }}>
              • {item}
            </Text>
          ))}
        </View>
      </Card>

      <PrimaryButton label="Continue to sign in" onPress={() => router.push('/(intro)/upgrade')} />
    </Screen>
  );
}
