import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BookOpen, Flame, Plus, Sparkles } from 'lucide-react-native';
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

export default function FlashcardsTabScreen() {
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
        <TopBar eyebrow="Flashcards" title="Spaced repetition" />

        <Pressable onPress={() => router.push('/flashcards')}>
          <Card
            style={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: 'rgba(249,115,22,0.22)',
                  borderWidth: 1,
                  borderColor: 'rgba(249,115,22,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Flame color="#F97316" size={22} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBlack, fontSize: 16 }}>
                  Review today&apos;s due cards
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: fonts.uiMedium, fontSize: 12, marginTop: 2 }}>
                  Keep your streak going — 5 min is enough
                </Text>
              </View>
              <Text style={{ color: '#F97316', fontFamily: fonts.uiBlack, fontSize: 18 }}>›</Text>
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
          DECKS BY DOCUMENT
        </Text>

        {documents.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
              <Sparkles color={colors.textSoft} size={28} />
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>
                No flashcard decks yet
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12, textAlign: 'center' }}>
                Add a document and decks will generate automatically.
              </Text>
            </View>
          </Card>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map(doc => (
                <Pressable key={doc.id} onPress={() => router.push({ pathname: '/flashcards', params: { docId: doc.id } })} style={{ flex: 1 }}>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: 'rgba(139,92,246,0.14)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BookOpen color="#8B5CF6" size={18} strokeWidth={2.4} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>
                          {doc.title || doc.name || 'Document'}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                          Open deck
                        </Text>
                      </View>
                      <Text style={{ color: '#8B5CF6', fontFamily: fonts.uiBold, fontSize: 16 }}>›</Text>
                    </View>
                  </Card>
                </Pressable>
              ))}
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
        tourId="tour.flashcards.v1"
        steps={[
          {
            id: 'daily',
            title: 'Daily review',
            body: 'Tap the orange card for today\u2019s spaced-repetition review. 5 minutes a day keeps retention sharp.',
          },
          {
            id: 'decks',
            title: 'Decks by document',
            body: 'Every ready document gets its own auto-generated deck. Tap one to focus on a single topic.',
          },
        ]}
      />
    </>
  );
}
