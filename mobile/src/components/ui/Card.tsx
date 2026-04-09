import { PropsWithChildren } from 'react';
import { View, type ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme/tokens';

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
          shadowColor: '#0F172A',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
