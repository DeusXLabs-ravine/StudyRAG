import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme/tokens';

export function LogoWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: compact ? 38 : 56,
          height: compact ? 38 : 56,
          borderRadius: compact ? 14 : 20,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#BAE6FD',
        }}
      >
        <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: compact ? 17 : 22 }}>SR</Text>
      </View>
      <View>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: compact ? 20 : 26 }}>
          Study<Text style={{ color: colors.primary }}>RAG</Text>
        </Text>
        <Text
          style={{
            color: colors.purple,
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
