import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BookOpen, GraduationCap, Home, MessageSquareText, Puzzle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, fonts } from '@/lib/theme/tokens';

type TabKey = 'learn' | 'chat' | 'index' | 'quiz' | 'flashcards';

const ICONS: Record<TabKey, LucideIcon> = {
  learn: GraduationCap,
  chat: MessageSquareText,
  index: Home,
  quiz: Puzzle,
  flashcards: BookOpen,
};

const LABELS: Record<TabKey, string> = {
  learn: 'Learn',
  chat: 'Chat',
  index: 'Home',
  quiz: 'Quiz',
  flashcards: 'Cards',
};

/**
 * Custom tab bar with 5 slots and the center (Home) rendered as a raised
 * circular button — the "fab-home" look the user asked for. The visual
 * weight pulls eyes to Home, which hosts the dashboard/streaks/analytics.
 */
export function RaisedTabBar({ state, navigation }: BottomTabBarProps) {
  const { isTablet } = useBreakpoint();
  return (
    <SafeAreaView
      edges={['bottom']}
      style={{
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 6,
          height: 74,
          // On tablets, 5 tabs spread across 1024px look lost — pin to 560 centered.
          maxWidth: isTablet ? 560 : undefined,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        {state.routes.map((route, index) => {
          const key = route.name as TabKey;
          const Icon = ICONS[key] ?? Home;
          const label = LABELS[key] ?? route.name;
          const isFocused = state.index === index;
          const isCenter = key === 'index';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (isCenter) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -22,
                    shadowColor: colors.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 8,
                    borderWidth: 4,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Icon color="#FFFFFF" size={24} strokeWidth={2.4} />
                </View>
                <Text
                  style={{
                    color: isFocused ? colors.primaryDeep : colors.textSoft,
                    fontFamily: fonts.uiBold,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 }}
            >
              <Icon
                color={isFocused ? colors.primary : colors.textSoft}
                size={22}
                strokeWidth={isFocused ? 2.6 : 2}
              />
              <Text
                style={{
                  color: isFocused ? colors.primary : colors.textSoft,
                  fontFamily: fonts.uiBold,
                  fontSize: 11,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
