import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { PhotoHeroScreen } from '@/components/ui/PhotoHeroScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { fonts } from '@/lib/theme/tokens';

const PHOTO =
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop';

export default function IntroReadyScreen() {
  return (
    <PhotoHeroScreen
      photo={PHOTO}
      topLeft={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 14 }}>Back</Text>
        </Pressable>
      }
    >
      <View style={{ gap: 10 }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: fonts.uiBlack,
            fontSize: 40,
            lineHeight: 44,
            letterSpacing: -0.4,
          }}
        >
          Ready when{'\n'}you are.
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontFamily: fonts.uiMedium,
            fontSize: 17,
            lineHeight: 24,
          }}
        >
          Sign in to pick up your library, progress, and subscription — same account as the web app.
        </Text>
      </View>

      <StepDots total={3} current={2} tone="light" />

      <PrimaryButton
        label="Sign in to continue"
        icon={ArrowRight}
        iconPosition="trailing"
        variant="onDark"
        onPress={() => router.replace('/(auth)/sign-in')}
      />
    </PhotoHeroScreen>
  );
}
