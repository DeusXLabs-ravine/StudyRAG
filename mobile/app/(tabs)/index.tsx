import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AudioLines, Brain, LibraryBig, Sparkles } from 'lucide-react-native';
import { FeatureCard } from '@/components/cards/FeatureCard';
import { Card } from '@/components/ui/Card';
import { LogoWordmark } from '@/components/ui/LogoWordmark';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getOverview, listDocuments } from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeTabScreen() {
  const profile = useAuthStore(state => state.profile);
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);

  useEffect(() => {
    getOverview().then(data => setOverview(data as Record<string, number>)).catch(() => setOverview({}));
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  return (
    <Screen>
      <LogoWordmark compact />
      <SectionTitle
        eyebrow="Dashboard"
        title={`Welcome back${profile?.displayName ? `, ${profile.displayName}` : ''}.`}
        subtitle="Your mobile workspace keeps the StudyRAG flow intact: library, tutoring, practice, analytics, and premium tools in one touch-first shell."
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { label: 'Docs', value: documents.length || 0 },
          { label: 'XP', value: overview.xp || 0 },
          { label: 'Streak', value: overview.streakDays || 0 },
        ].map(item => (
          <Card key={item.label} style={{ flex: 1, paddingVertical: 20 }}>
            <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 28 }}>{item.value}</Text>
          </Card>
        ))}
      </View>

      <FeatureCard
        icon={LibraryBig}
        title="Continue from your library"
        subtitle="Manage files, URLs, notes, and topic research from one mobile-native document hub."
        onPress={() => router.push('/(tabs)/library')}
      />
      <FeatureCard
        icon={Brain}
        title="Jump into practice"
        subtitle="Quiz, flashcards, exams, analytics, and simulations are grouped into one practice surface."
        onPress={() => router.push('/(tabs)/practice')}
        tone="purple"
      />
      <FeatureCard
        icon={AudioLines}
        title="Audio and teach mode"
        subtitle="Premium study experiences live behind synced entitlements and RevenueCat-managed billing."
        onPress={() => router.push('/upgrade')}
        tone="ink"
      />

      <Card style={{ backgroundColor: colors.primarySoft }}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color={colors.primaryDeep} />
            <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: 16 }}>Quick actions</Text>
          </View>
          <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
            Open Learn from any ready document, keep tutoring scoped to what you uploaded, and use the same account state as the web app without a separate mobile backend.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
