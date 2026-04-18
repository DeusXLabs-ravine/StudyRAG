import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type HeroVariant = 'ocean' | 'violet' | 'sunrise' | 'forest' | 'ink';

const palettes: Record<HeroVariant, { base: string; blobA: string; blobB: string; tint: string }> = {
  ocean:   { base: '#EAF6FF', blobA: '#0EA5E9', blobB: '#6366F1', tint: 'rgba(14,165,233,0.08)' },
  violet:  { base: '#F5F0FF', blobA: '#8B5CF6', blobB: '#EC4899', tint: 'rgba(139,92,246,0.10)' },
  sunrise: { base: '#FFF5EC', blobA: '#F97316', blobB: '#FB7185', tint: 'rgba(249,115,22,0.10)' },
  forest:  { base: '#ECFDF5', blobA: '#10B981', blobB: '#0EA5E9', tint: 'rgba(16,185,129,0.08)' },
  ink:     { base: '#0B1220', blobA: '#0EA5E9', blobB: '#8B5CF6', tint: 'rgba(15,23,42,0.55)' },
};

type Props = {
  variant?: HeroVariant;
  /**
   * Optional remote/local photo. Renders behind the gradient for extra warmth.
   * Use Image source object or URI string.
   */
  photoUrl?: string;
  photoOpacity?: number;
};

/**
 * Full-bleed decorative backdrop for onboarding / marketing screens.
 * Layers (bottom → top):
 *   1. Solid base color (so offline photos never flash white)
 *   2. Optional photo layer (remote URL allowed)
 *   3. SVG gradient + two soft blobs for depth
 *   4. Tint overlay for readability
 */
export function HeroBackdrop({ variant = 'ocean', photoUrl, photoOpacity = 0.22 }: Props) {
  const p = palettes[variant];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.base }]} pointerEvents="none">
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={[StyleSheet.absoluteFill, { opacity: photoOpacity }]}
          resizeMode="cover"
        />
      ) : null}

      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.base} stopOpacity="0.0" />
            <Stop offset="1" stopColor={p.base} stopOpacity="0.85" />
          </LinearGradient>
          <LinearGradient id="blobA" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.blobA} stopOpacity="0.55" />
            <Stop offset="1" stopColor={p.blobA} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="blobB" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.blobB} stopOpacity="0.42" />
            <Stop offset="1" stopColor={p.blobB} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Top-left soft blob */}
        <Circle cx={SCREEN_W * 0.15} cy={SCREEN_H * 0.1} r={SCREEN_W * 0.6} fill="url(#blobA)" />
        {/* Right-mid soft blob */}
        <Circle cx={SCREEN_W * 1.02} cy={SCREEN_H * 0.38} r={SCREEN_W * 0.65} fill="url(#blobB)" />
        {/* Bottom gradient to ease into white/card area */}
        <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#bgGrad)" />
      </Svg>

      {/* Soft tint to guarantee text contrast */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: p.tint }]} />
    </View>
  );
}
