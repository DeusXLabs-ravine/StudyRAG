import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { PhotoHeroScreen } from '@/components/ui/PhotoHeroScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { fonts } from '@/lib/theme/tokens';

const PHOTO =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80&auto=format&fit=crop';

export default function IntroIndexScreen() {
  return (
    <PhotoHeroScreen
      photo={PHOTO}
      topLeft={<LogoWordmark compact tone="dark" />}
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
            fontSize: 42,
            lineHeight: 46,
            letterSpacing: -0.5,
          }}
        >
          Study that{'\n'}finally clicks.
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontFamily: fonts.uiMedium,
            fontSize: 17,
            lineHeight: 24,
          }}
        >
          Your notes become a tutor that actually knows your syllabus.
        </Text>
      </View>

      <StepDots total={3} current={0} tone="light" />

      <PrimaryButton
        label="Get started"
        icon={ArrowRight}
        iconPosition="trailing"
        variant="onDark"
        onPress={() => router.push('/(intro)/flow')}
      />
    </PhotoHeroScreen>
  );
}
