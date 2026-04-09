import { Tabs } from 'expo-router';
import { iconRegistry } from '@/lib/theme/iconRegistry';
import { colors, fonts } from '@/lib/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const Icon =
          route.name === 'index'
            ? iconRegistry.home
            : route.name === 'library'
              ? iconRegistry.library
              : route.name === 'chat'
                ? iconRegistry.chat
                : route.name === 'practice'
                  ? iconRegistry.practice
                  : iconRegistry.profile;

        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSoft,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: colors.border,
            height: 74,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontFamily: fonts.uiBold,
            fontSize: 12,
          },
          tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
