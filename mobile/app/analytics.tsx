import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getActivity, getOverview, getTopics, getWeakAreas } from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';

export default function AnalyticsScreen() {
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [topics, setTopics] = useState<Array<{ topic: string; score: number }>>([]);
  const [weakAreas, setWeakAreas] = useState<Array<{ topic: string; score: number }>>([]);
  const [activity, setActivity] = useState<Array<{ date: string; minutes: number }>>([]);

  useEffect(() => {
    getOverview().then(data => setOverview(data as Record<string, number>)).catch(() => setOverview({}));
    getTopics().then(setTopics).catch(() => setTopics([]));
    getWeakAreas().then(setWeakAreas).catch(() => setWeakAreas([]));
    getActivity().then(setActivity).catch(() => setActivity([]));
  }, []);

  return (
    <Screen>
      <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" />
      <SectionTitle
        eyebrow="Analytics"
        title="See where your study momentum is building."
        subtitle="This mobile dashboard mirrors the backend analytics surface with high-signal summaries instead of trying to recreate the whole desktop chart layer."
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { label: 'Average Score', value: overview.averageScore || 0 },
          { label: 'Quiz Count', value: overview.quizzesTaken || 0 },
          { label: 'Streak', value: overview.streakDays || 0 },
        ].map(item => (
          <Card key={item.label} style={{ flex: 1 }}>
            <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 28 }}>{item.value}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 17 }}>Weak areas</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {weakAreas.length ? (
            weakAreas.map(item => (
              <Text key={item.topic} style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>
                • {item.topic}: {Math.round(item.score * 100)}%
              </Text>
            ))
          ) : (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>
              No weak-area data yet. Finish quizzes and flashcards to populate this view.
            </Text>
          )}
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 17 }}>Strongest topics</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {topics.slice(0, 5).map(item => (
            <Text key={item.topic} style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>
              • {item.topic}: {Math.round(item.score * 100)}%
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 17 }}>Recent activity</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {activity.slice(-7).map(item => (
            <Text key={item.date} style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>
              • {item.date}: {item.minutes} minute(s)
            </Text>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
