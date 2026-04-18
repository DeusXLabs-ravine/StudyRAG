import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeroBackdrop, HeroVariant } from './HeroBackdrop';

type Props = PropsWithChildren<{
  variant?: HeroVariant;
  photoUrl?: string;
  header?: ReactNode;
  footer?: ReactNode;
}>;

/**
 * Full-bleed onboarding shell: decorative backdrop behind, header pinned top,
 * scrolling content, CTA footer pinned bottom with safe-area inset.
 */
export function OnboardingScreen({ children, variant = 'ocean', photoUrl, header, footer }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <HeroBackdrop variant={variant} photoUrl={photoUrl} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {header ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>{header}</View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 28,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? (
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 14 }}>
              {footer}
            </View>
          </SafeAreaView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
