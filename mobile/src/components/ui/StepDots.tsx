import { View } from 'react-native';
import { colors } from '@/lib/theme/tokens';

type Props = {
  total: number;
  current: number;
  tone?: 'primary' | 'light';
};

/** Progress indicator — active dot is wider, inactive dots are small and muted. */
export function StepDots({ total, current, tone = 'primary' }: Props) {
  const activeColor = tone === 'light' ? '#FFFFFF' : colors.primary;
  const inactiveColor = tone === 'light' ? 'rgba(255,255,255,0.4)' : '#CBD5E1';

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        return (
          <View
            key={i}
            style={{
              width: active ? 24 : 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: active ? activeColor : inactiveColor,
            }}
          />
        );
      })}
    </View>
  );
}
