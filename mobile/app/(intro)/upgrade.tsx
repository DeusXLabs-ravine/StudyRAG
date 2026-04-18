import { router } from 'expo-router';
import { ArrowRight, Check, Crown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StepDots } from '@/components/ui/StepDots';
import { colors, fonts } from '@/lib/theme/tokens';

const unlocks = [
  'Teach mode — live voice tutor you can interrupt',
  'Premium simulations and interactive labs',
  'Expanded study capacity + priority models',
  'Section-level podcasts for every document',
];

export default function IntroUpgradeScreen() {
  return (
    <OnboardingScreen
      variant="ink"
      header={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: fonts.uiBold, fontSize: 14 }}>Back</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={12}>
            <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 14 }}>Skip</Text>
          </Pressable>
        </View>
      }
      footer={
        <>
          <StepDots total={5} current={4} tone="light" />
          <PrimaryButton
            label="Sign in to continue"
            icon={ArrowRight}
            iconPosition="trailing"
            variant="onDark"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </>
      }
    >
      <View style={{ gap: 12, marginTop: 16 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.14)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.22)',
          }}
        >
          <Crown color="#FBBF24" size={13} strokeWidth={2.6} />
          <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBlack, fontSize: 11, letterSpacing: 1.4 }}>
            UPGRADE PATH
          </Text>
        </View>

        <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBlack, fontSize: 34, lineHeight: 40 }}>
          Free to start.{'\n'}<Text style={{ color: '#7DD3FC' }}>Premium when</Text>{'\n'}<Text style={{ color: '#7DD3FC' }}>you want more.</Text>
        </Text>

        <Text style={{ color: 'rgba(255,255,255,0.82)', fontFamily: fonts.uiMedium, fontSize: 16, lineHeight: 24 }}>
          Subscriptions are handled through Apple / Google and reconciled with your account automatically — your
          entitlements stay in sync everywhere.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
          gap: 14,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 17 }}>What premium unlocks</Text>
        {unlocks.map(item => (
          <View key={item} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: 'rgba(14,165,233,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              <Check color="#7DD3FC" size={14} strokeWidth={3} />
            </View>
            <Text
              style={{
                flex: 1,
                color: 'rgba(255,255,255,0.9)',
                fontFamily: fonts.uiMedium,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
