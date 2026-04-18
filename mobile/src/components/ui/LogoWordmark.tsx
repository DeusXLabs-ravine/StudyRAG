import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme/tokens';

type Props = {
  compact?: boolean;
  tone?: 'light' | 'dark';
};

export function LogoWordmark({ compact = false, tone = 'light' }: Props) {
  const isDark = tone === 'dark';
  const wordmark = isDark ? '#FFFFFF' : colors.text;
  const accent = isDark ? '#7DD3FC' : colors.primary;
  const eyebrow = isDark ? 'rgba(255,255,255,0.75)' : colors.purple;
  const badgeBg = isDark ? 'rgba(255,255,255,0.14)' : colors.primarySoft;
  const badgeBorder = isDark ? 'rgba(255,255,255,0.22)' : '#BAE6FD';
  const badgeText = isDark ? '#FFFFFF' : colors.primaryDeep;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: compact ? 38 : 52,
          height: compact ? 38 : 52,
          borderRadius: compact ? 14 : 18,
          backgroundColor: badgeBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: badgeBorder,
        }}
      >
        <Text style={{ color: badgeText, fontFamily: fonts.uiBlack, fontSize: compact ? 17 : 21 }}>SR</Text>
      </View>
      <View>
        <Text style={{ color: wordmark, fontFamily: fonts.uiBlack, fontSize: compact ? 20 : 24 }}>
          Study<Text style={{ color: accent }}>RAG</Text>
        </Text>
        <Text
          style={{
            color: eyebrow,
            fontFamily: fonts.uiBlack,
            fontSize: compact ? 9 : 10,
            textTransform: 'uppercase',
            letterSpacing: 2.2,
          }}
        >
          Quantum Logic
        </Text>
      </View>
    </View>
  );
}
