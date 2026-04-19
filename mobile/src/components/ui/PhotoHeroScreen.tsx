import { PropsWithChildren, ReactNode } from 'react';
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = PropsWithChildren<{
  /** Full-bleed background photo (remote URI or bundled asset require) */
  photo: string;
  /** Top-left accessory (e.g. LogoWordmark tone="dark") */
  topLeft?: ReactNode;
  /** Top-right accessory (e.g. Skip link) */
  topRight?: ReactNode;
}>;

/**
 * Full-bleed photo screen for onboarding. Photo covers everything,
 * a bottom-up dark gradient guarantees the headline + CTA stay readable.
 * Content is anchored to the bottom.
 */
export function PhotoHeroScreen({ photo, topLeft, topRight, children }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      <ImageBackground
        source={{ uri: photo }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Dark scrim — bottom 70% fades to solid for text contrast */}
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0B1220" stopOpacity="0.05" />
              <Stop offset="0.35" stopColor="#0B1220" stopOpacity="0.25" />
              <Stop offset="0.7" stopColor="#0B1220" stopOpacity="0.78" />
              <Stop offset="1" stopColor="#0B1220" stopOpacity="0.95" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#scrim)" />
        </Svg>
      </ImageBackground>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {(topLeft || topRight) ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: 8,
            }}
          >
            <View>{topLeft}</View>
            <View>{topRight}</View>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
          <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 18 }}>
            {children}
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}
