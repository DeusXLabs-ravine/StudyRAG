import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { BookOpenCheck, FileText, Link as LinkIcon, NotebookPen, Plus, Sparkles, Star } from 'lucide-react-native';
import { AddDocumentSheet } from '@/components/common/AddDocumentSheet';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/ui/TopBar';
import { TutorialTour } from '@/components/tutorial/TutorialTour';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { listDocuments, togglePrimarySource, type StudyDocument } from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'processing', label: 'Processing' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function iconForSource(type?: StudyDocument['source_type']) {
  if (type === 'url') return LinkIcon;
  if (type === 'note') return NotebookPen;
  if (type === 'topic') return Sparkles;
  return FileText;
}

export default function LearnTabScreen() {
  const { isTablet, isLandscape, isLarge } = useBreakpoint();
  const splitView = isTablet && (isLandscape || isLarge);

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      setDocuments([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const visibleDocuments = useMemo(
    () =>
      documents.filter(d => {
        if (filter === 'all') return true;
        if (filter === 'ready') return d.status === 'ready';
        return d.status !== 'ready' && d.status !== 'failed';
      }),
    [documents, filter],
  );

  // Keep selection valid as the list mutates.
  useEffect(() => {
    if (!splitView) return;
    if (selectedId && !visibleDocuments.find(d => d.id === selectedId)) {
      setSelectedId(visibleDocuments[0]?.id ?? null);
    } else if (!selectedId && visibleDocuments[0]) {
      setSelectedId(visibleDocuments[0].id);
    }
  }, [splitView, visibleDocuments, selectedId]);

  const selected = splitView ? visibleDocuments.find(d => d.id === selectedId) : null;

  const listColumn = (
    <>
      <TopBar eyebrow="Learn" title="Your library" />

      <Card style={{ backgroundColor: colors.primarySoft, borderColor: '#BAE6FD' }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: 'rgba(14,165,233,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpenCheck color={colors.primaryDeep} size={20} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 15 }}>
              {splitView ? 'Pick a doc to preview on the right' : 'Tap any ready doc to open Learn'}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 12 }}>
              Modules, tutor chat, quizzes, and flashcards live inside each document.
            </Text>
          </View>
        </View>
      </Card>

      {/* Filter pills */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map(f => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? colors.primary : '#FFFFFF',
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: isActive ? '#FFFFFF' : colors.textMuted,
                  fontFamily: fonts.uiBold,
                  fontSize: 12,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visibleDocuments.length === 0 ? (
        <Card>
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 18 }}>
            <FileText color={colors.textSoft} size={32} strokeWidth={1.8} />
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>
              No documents yet
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              Tap the + button to upload a file, scan a page, save a link, or paste your notes.
            </Text>
          </View>
        </Card>
      ) : (
        visibleDocuments.map(doc => {
          const Icon = iconForSource(doc.source_type);
          const isReady = doc.status === 'ready';
          const isActive = splitView && selectedId === doc.id;
          const handlePress = () => {
            if (doc.status === 'processing') {
              router.push({ pathname: '/processing/[id]', params: { id: doc.id } });
              return;
            }
            if (splitView) {
              if (isReady) setSelectedId(doc.id);
            } else if (isReady) {
              router.push(`/learn/${doc.id}`);
            }
          };
          return (
            <Pressable key={doc.id} onPress={handlePress}>
              <Card
                style={{
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: isReady ? 'rgba(14,165,233,0.12)' : 'rgba(148,163,184,0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon color={isReady ? colors.primary : colors.textMuted} size={20} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>
                      {doc.title || doc.name || 'Untitled'}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                      {doc.source_type || 'file'} · {doc.status}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      togglePrimarySource(doc.id, !doc.primary_source)
                        .then(refresh)
                        .catch(e => Alert.alert('Could not update source', e instanceof Error ? e.message : 'Try again'))
                    }
                  >
                    <Star
                      size={18}
                      color={doc.primary_source ? '#F59E0B' : colors.textSoft}
                      fill={doc.primary_source ? '#F59E0B' : 'transparent'}
                    />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </>
  );

  // Phone / tablet-portrait layout — single column, unchanged behaviour.
  if (!splitView) {
    return (
      <>
        <Screen>{listColumn}</Screen>
        <FloatingActionButton onPress={() => setAddOpen(true)} icon={Plus} accessibilityLabel="Add a document" />
        <AddDocumentSheet visible={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />
        <TutorialTour
          tourId="tour.learn.v1"
          steps={[
            {
              id: 'library',
              title: 'Your library',
              body: 'Every file, link, scan, and note lives here. Filter by status using the pills at the top.',
            },
            {
              id: 'open',
              title: 'Tap to open Learn',
              body: 'Ready docs open into modules, tutor chat, quizzes, and flashcards — your personal classroom.',
            },
            {
              id: 'star',
              title: 'Star your best sources',
              body: 'Tap the star to mark a doc as a trusted primary source. Tutor chat will prefer starred docs.',
            },
          ]}
        />
      </>
    );
  }

  // Tablet landscape + large — 40/60 split with preview pane.
  return (
    <>
      <Screen
        padded={false}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, gap: 0 }}
      >
        <View style={{ flex: 1, flexDirection: 'row', gap: 16, maxWidth: 1200, alignSelf: 'center', width: '100%' }}>
          <View style={{ flexBasis: '40%', flexGrow: 1, gap: 12 }}>{listColumn}</View>
          <View style={{ flexBasis: '60%', flexGrow: 1, gap: 12 }}>
            {selected ? (
              <Card style={{ padding: 22, gap: 14 }}>
                <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.4 }}>
                  PREVIEW
                </Text>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 22 }}>
                  {selected.title || selected.name || 'Untitled'}
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
                  {selected.source_type || 'file'} · {selected.status}
                  {selected.primary_source ? ' · primary source' : ''}
                </Text>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 22 }}>
                  Open this doc to launch the full Learn experience — modules, AI tutor chat, per-doc quizzes, and
                  spaced-repetition flashcards all generated from this source.
                </Text>
                <PrimaryButton
                  label="Open Learn"
                  onPress={() => router.push(`/learn/${selected.id}`)}
                  disabled={selected.status !== 'ready'}
                />
              </Card>
            ) : (
              <Card style={{ padding: 28, alignItems: 'center', gap: 12 }}>
                <BookOpenCheck color={colors.textSoft} size={36} strokeWidth={1.6} />
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>
                  Pick a document
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, textAlign: 'center' }}>
                  Select a doc from the left to preview it here. Tap Open Learn to dive in.
                </Text>
              </Card>
            )}
          </View>
        </View>
      </Screen>
      <FloatingActionButton onPress={() => setAddOpen(true)} icon={Plus} accessibilityLabel="Add a document" />
      <AddDocumentSheet visible={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />
      <TutorialTour
        tourId="tour.learn.v1"
        steps={[
          {
            id: 'library',
            title: 'Your library',
            body: 'Every file, link, scan, and note lives here. Filter by status using the pills at the top.',
          },
          {
            id: 'open',
            title: 'Tap to preview',
            body: 'On your tablet, picking a doc shows a preview on the right. Hit Open Learn to dive in.',
          },
          {
            id: 'star',
            title: 'Star your best sources',
            body: 'Tap the star to mark a doc as a trusted primary source. Tutor chat will prefer starred docs.',
          },
        ]}
      />
    </>
  );
}
