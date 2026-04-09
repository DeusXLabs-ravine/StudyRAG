import { PropsWithChildren } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme/tokens';

type ScreenProps = PropsWithChildren<
  ScrollViewProps & {
    padded?: boolean;
  }
>;

export function Screen({ children, padded = true, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          {
            paddingHorizontal: padded ? 20 : 0,
            paddingVertical: padded ? 20 : 0,
            gap: 18,
          },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        {...props}
      >
        <View style={{ gap: 18 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
