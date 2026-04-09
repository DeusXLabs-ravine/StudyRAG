import { router } from 'expo-router';
import { BookOpen, Brain, Sparkles } from 'lucide-react-native';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Card } from '@/components/ui/Card';
import { colors, fonts } from '@/lib/theme/tokens';
import { Text, View } from 'react-native';

export default function IntroIndexScreen() {
  return (
    <Screen>
      <LogoWordmark />
      <SectionTitle
        eyebrow="Welcome"
        title="Grounded study, now built for your phone."
        subtitle="StudyRAG turns your notes, files, and sources into a mobile-native learning workspace that stays clear, structured, and source-aware."
      />

      <Card style={{ backgroundColor: colors.inkBoard, borderColor: '#4A3423' }}>
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#FFFFFF', fontFamily: fonts.handwrittenBold, fontSize: 26 }}>
            Learn without the mess.
          </Text>
          <Text style={{ color: '#E2E8F0', fontFamily: fonts.handwritten, fontSize: 17, lineHeight: 24 }}>
            Upload your materials, ask questions, build quizzes, generate flashcards, and keep your study sessions grounded in what you actually uploaded.
          </Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { icon: BookOpen, label: 'Library-first study' },
          { icon: Brain, label: 'Tutor, quiz, flashcards' },
          { icon: Sparkles, label: 'Premium audio + simulations' },
        ].map(item => (
          <View
            key={item.label}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              gap: 12,
            }}
          >
            <item.icon color={colors.primary} size={20} />
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton label="See the workflow" onPress={() => router.push('/(intro)/flow')} />
    </Screen>
  );
}
