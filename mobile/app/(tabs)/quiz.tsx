import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Plus, Puzzle, ScrollText, Sparkles } from 'lucide-react-native';
import { AddDocumentSheet } from '@/components/common/AddDocumentSheet';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/ui/TopBar';
import { TutorialTour } from '@/components/tutorial/TutorialTour';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { listDocuments, type StudyDocument } from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 1) return arr.map(item => [item]);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function QuizTabScreen() {
  const { isTablet, isLarge } = useBreakpoint();
  const columns = isLarge ? 3 : isTablet ? 2 : 1;
  const contentWidth = isLarge ? 1080 : isTablet ? 760 : undefined;

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  async function refresh() {
    try {
      const docs = await listDocuments();
      setDocuments(docs.filter(d => d.status === 'ready'));
    } catch {
      setDocuments([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => chunk(documents, columns), [documents, columns]);

  return (
    <>
      <Screen contentContainerStyle={{ maxWidth: contentWidth, alignSelf: 'center', width: '100%' }}>
        <TopBar eyebrow="Quiz" title="Test yourself" />

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: 'rgba(14,165,233,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Puzzle color={colors.primary} size={22} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>
                Mixed quiz from all your docs
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12, marginTop: 2 }}>
                10 adaptive questions, ~5 minutes
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/quiz')}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 12 }}>Start</Text>
            </Pressable>
          </View>
        </Card>

        <Pressable onPress={() => router.push('/exam')}>
          <Card style={{ backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(139,92,246,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ScrollText color="#6D28D9" size={20} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#4C1D95', fontFamily: fonts.uiBold, fontSize: 15 }}>Exam prep mode</Text>
                <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                  Timed, weighted questions — longer sessions
                </Text>
              </View>
              <Text style={{ color: '#4C1D95', fontFamily: fonts.uiBold, fontSize: 14 }}>›</Text>
            </View>
          </Card>
        </Pressable>

        <Text
          style={{
            color: colors.textSoft,
            fontFamily: fonts.uiBlack,
            fontSize: 10,
            letterSpacing: 1.6,
            marginTop: 4,
          }}
        >
          QUIZ A SPECIFIC DOC
        </Text>

        {documents.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
              <Sparkles color={colors.textSoft} size={28} />
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>
                Upload something to quiz
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12, textAlign: 'center' }}>
                Tap + to bring in a file, link, or note.
              </Text>
            </View>
          </Card>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map(doc => (
                <Pressable key={doc.id} onPress={() => router.push(`/learn/${doc.id}`)} style={{ flex: 1 }}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}
                      >
                        {doc.title || doc.name || 'Document'}
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: fonts.uiBold, fontSize: 12 }}>Quiz →</Text>
                    </View>
                  </Card>
                </Pressable>
              ))}
              {/* Fill trailing row so cards don't stretch when short */}
              {row.length < columns
                ? Array.from({ length: columns - row.length }).map((_, idx) => (
                    <View key={`pad-${rowIdx}-${idx}`} style={{ flex: 1 }} />
                  ))
                : null}
            </View>
          ))
        )}
      </Screen>

      <FloatingActionButton onPress={() => setAddOpen(true)} icon={Plus} />
      <AddDocumentSheet visible={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />

      <TutorialTour
        tourId="tour.quiz.v1"
        steps={[
          {
            id: 'mixed',
            title: 'Mixed quiz first',
            body: 'Tap Start for a 10-question mix across everything you have uploaded. Perfect for daily review.',
          },
          {
            id: 'exam',
            title: 'Exam prep mode',
            body: 'Need something heavier? Exam prep runs timed, weighted sessions — great before a real test.',
          },
          {
            id: 'per-doc',
            title: 'Quiz a single doc',
            body: 'Tap any document below to open its dedicated quiz. Works great to drill one topic at a time.',
          },
        ]}
      />
    </>
  );
}
