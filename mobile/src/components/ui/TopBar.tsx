import { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, fonts } from '@/lib/theme/tokens';

type Props = {
  title?: string;
  eyebrow?: string;
  /** Override the left-side action (default is a Settings gear that routes to /settings) */
  left?: ReactNode;
  right?: ReactNode;
};

export function TopBar({ title, eyebrow, left, right }: Props) {
  const { isTablet } = useBreakpoint();
  const leftNode = left ?? (
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: pressed ? '#F1F5F9' : '#F8FAFC',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Settings size={18} color={colors.textMuted} strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        // Center on wide screens so the title doesn't drift to the far edge.
        maxWidth: isTablet ? 960 : undefined,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {leftNode}
        {(title || eyebrow) ? (
          <View style={{ flex: 1 }}>
            {eyebrow ? (
              <Text
                style={{
                  color: colors.textSoft,
                  fontFamily: fonts.uiBlack,
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text
                numberOfLines={1}
                style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 18 }}
              >
                {title}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
