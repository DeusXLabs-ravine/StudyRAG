import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme/tokens';

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {eyebrow ? (
        <Text
          style={{
            color: colors.primary,
            fontFamily: fonts.uiBlack,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 28 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 22 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
