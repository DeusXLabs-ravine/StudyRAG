import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BookOpen, ChartColumnBig, Flame, Plus, Puzzle, Sparkles, Trophy } from 'lucide-react-native';
import { AddDocumentSheet } from '@/components/common/AddDocumentSheet';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/ui/TopBar';
import { TutorialTour } from '@/components/tutorial/TutorialTour';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { getOverview, listDocuments } from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeTabScreen() {
  const profile = useAuthStore(s => s.profile);
  const { isTablet, isLarge } = useBreakpoint();
  const [overview, setOverview] = useState<{ streakDays?: number; xp?: number; quizzesTaken?: number; averageScore?: number }>({});
  const [docsCount, setDocsCount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  async function refresh() {
    try {
      const [ov, docs] = await Promise.all([getOverview().catch(() => ({})), listDocuments().catch(() => [])]);
      setOverview(ov || {});
      setDocsCount((docs || []).length);
    } catch {
      // noop
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const firstName = profile?.displayName?.split(' ')[0];

  // On tablets we span content to a comfortable max-width so cards don't
  // stretch across the whole iPad.
  const contentWidth = isLarge ? 960 : isTablet ? 720 : undefined;

  return (
    <>
      <Screen contentContainerStyle={{ maxWidth: contentWidth, alignSelf: 'center', width: '100%' }}>
        <TopBar
          eyebrow="Home"
          title={firstName ? `Hi, ${firstName}` : 'Welcome back'}
        />

        {/* Streak hero */}
        <Card
          style={{
            backgroundColor: '#0F172A',
            borderColor: '#1E293B',
            padding: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Flame color="#F97316" size={18} />
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.4 }}>
                  CURRENT STREAK
                </Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBlack, fontSize: 38, lineHeight: 42 }}>
                {overview.streakDays || 0} <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>days</Text>
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: fonts.uiMedium, fontSize: 13 }}>
                Keep it warm — a 5-min review counts.
              </Text>
            </View>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: 'rgba(249,115,22,0.18)',
                borderWidth: 1,
                borderColor: 'rgba(249,115,22,0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame color="#F97316" size={32} strokeWidth={2.2} />
            </View>
          </View>
        </Card>

        {/* Stat triple */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile label="XP" value={overview.xp ?? 0} tint={colors.primary} />
          <StatTile label="Docs" value={docsCount} tint="#8B5CF6" />
          <StatTile label="Avg" value={`${overview.averageScore ?? 0}%`} tint="#10B981" />
        </View>

        {/* Analytics entry */}
        <Pressable onPress={() => router.push('/analytics')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <IconBadge color="#8B5CF6" Icon={ChartColumnBig} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>Open analytics</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                  Weak areas, activity, and progress
                </Text>
              </View>
              <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 12 }}>›</Text>
            </View>
          </Card>
        </Pressable>

        {/* Quick practice — adaptive grid: 2 across on phone, 3 across on large tablets */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <QuickTile
            label="Quick quiz"
            hint="5 questions"
            Icon={Puzzle}
            tint={colors.primary}
            onPress={() => router.push('/(tabs)/quiz')}
            wide={isLarge}
          />
          <QuickTile
            label="Review cards"
            hint="Spaced repetition"
            Icon={BookOpen}
            tint="#8B5CF6"
            onPress={() => router.push('/(tabs)/flashcards')}
            wide={isLarge}
          />
          {isLarge ? (
            <QuickTile
              label="Analytics"
              hint="Your progress"
              Icon={ChartColumnBig}
              tint="#10B981"
              onPress={() => router.push('/analytics')}
              wide
            />
          ) : null}
        </View>

        {/* Premium teaser */}
        <Pressable onPress={() => router.push('/upgrade')}>
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: '#BAE6FD' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBadge color={colors.primaryDeep} Icon={Sparkles} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 15 }}>
                  {profile?.subscription_tier && profile.subscription_tier !== 'free' ? 'Manage your plan' : 'Unlock Pro'}
                </Text>
                <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                  Teach mode, podcasts, simulations
                </Text>
              </View>
              <Trophy color={colors.primaryDeep} size={18} />
            </View>
          </Card>
        </Pressable>
      </Screen>

      <FloatingActionButton onPress={() => setAddOpen(true)} icon={Plus} accessibilityLabel="Add a document" />

      <AddDocumentSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
      />

      <TutorialTour
        tourId="tour.home.v1"
        steps={[
          {
            id: 'welcome',
            title: 'Welcome to StudyRAG',
            body: 'This is your home — streak, stats, and quick practice all live here. Swipe around to explore.',
          },
          {
            id: 'streak',
            title: 'Keep your streak warm',
            body: 'Five minutes a day keeps the streak alive. Tap Review cards or Quick quiz to log today.',
          },
          {
            id: 'practice',
            title: 'Practice anything',
            body: 'Quiz tab mixes questions from every doc. Flashcards tab runs spaced-repetition reviews.',
          },
          {
            id: 'add',
            title: 'Add your first material',
            body: 'Tap the + button any time to upload a file, scan a page with your camera, paste a link, or write a note.',
          },
        ]}
      />
    </>
  );
}

function StatTile({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.2 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: tint, fontFamily: fonts.uiBlack, fontSize: 24 }}>{value}</Text>
    </View>
  );
}

function QuickTile({
  label,
  hint,
  Icon,
  tint,
  onPress,
  wide,
}: {
  label: string;
  hint: string;
  Icon: typeof Puzzle;
  tint: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      // On large tablets we render 3 tiles — compute a flex-basis so they
      // share a row cleanly without squeezing below a comfortable min-width.
      style={{ flexGrow: 1, flexBasis: wide ? '31%' : '48%', minWidth: 150 }}
    >
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 14,
          gap: 10,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: `${tint}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon color={tint} size={18} strokeWidth={2.4} />
        </View>
        <View>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>{label}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 11 }}>{hint}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function IconBadge({ color, Icon }: { color: string; Icon: typeof Puzzle }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: `${color}18`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon color={color} size={20} strokeWidth={2.4} />
    </View>
  );
}
