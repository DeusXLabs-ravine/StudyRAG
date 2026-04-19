import { Tabs } from 'expo-router';
import { RaisedTabBar } from '@/components/navigation/RaisedTabBar';

/**
 * Tab order (left → center → right): Learn · Chat · Home · Quiz · Flashcards
 * Home is the center tab and renders as a raised primary-colored button
 * (the "fab-home" look) via RaisedTabBar.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <RaisedTabBar {...props} />}
    >
      <Tabs.Screen name="learn" options={{ title: 'Learn' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="quiz" options={{ title: 'Quiz' }} />
      <Tabs.Screen name="flashcards" options={{ title: 'Cards' }} />
    </Tabs>
  );
}
