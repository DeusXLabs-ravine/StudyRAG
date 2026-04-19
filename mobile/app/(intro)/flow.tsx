import { router } from 'expo-router';
import { ArrowRight, Brain, FileText, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { PhotoHeroScreen } from '@/components/ui/PhotoHeroScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { fonts } from '@/lib/theme/tokens';

const PHOTO =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&q=80&auto=format&fit=crop';

const bullets: { icon: LucideIcon; text: string }[] = [
  { icon: FileText, text: 'Drop in notes, PDFs, or topics' },
  { icon: Brain, text: 'Chat with an AI tutor that cites them' },
  { icon: Zap, text: 'Auto-generate quizzes and flashcards' },
];

export default function IntroFeaturesScreen() {
  return (
    <PhotoHeroScreen
      photo={PHOTO}
      topLeft={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 14 }}>Back</Text>
        </Pressable>
      }
      topRight={
        <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={12}>
          <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 14 }}>Skip</Text>
        </Pressable>
      }
    >
      <View style={{ gap: 10 }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: fonts.uiBlack,
            fontSize: 36,
            lineHeight: 40,
            letterSpacing: -0.3,
          }}
        >
          Everything{'\n'}you need.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {bullets.map(b => (
          <View
            key={b.text}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: 'rgba(14,165,233,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <b.icon color="#7DD3FC" size={18} strokeWidth={2.4} />
            </View>
            <Text
              style={{
                flex: 1,
                color: '#FFFFFF',
                fontFamily: fonts.uiBold,
                fontSize: 15,
              }}
            >
              {b.text}
            </Text>
          </View>
        ))}
      </View>

      <StepDots total={3} current={1} tone="light" />

      <PrimaryButton
        label="Continue"
        icon={ArrowRight}
        iconPosition="trailing"
        variant="onDark"
        onPress={() => router.push('/(intro)/upgrade')}
      />
    </PhotoHeroScreen>
  );
}
