import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { listDocuments } from '@/services/core';
import {
  deleteDeck,
  generateFlashcards,
  getStudyQueue,
  listFlashcardDecks,
  reviewFlashcard,
  type FlashcardDeck,
} from '@/services/practice';
import { colors, fonts, radius, spacing } from '@/lib/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Document = { id: string; title?: string; name?: string; status: string };
type StudyCard = { id: string; front: string; back: string };

// ---------------------------------------------------------------------------
// Empty state — no decks
// ---------------------------------------------------------------------------
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconRing}>
        <BookOpen size={36} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>No decks yet</Text>
      <Text style={styles.emptySubtitle}>
        Generate your first flashcard deck from any document in your library.
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onGenerate} activeOpacity={0.8}>
        <Plus size={18} color={colors.surface} strokeWidth={2.5} />
        <Text style={styles.emptyButtonLabel}>Generate a deck</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Deck card — grid item
// ---------------------------------------------------------------------------
function DeckCard({
  deck,
  onStudy,
  onDelete,
}: {
  deck: FlashcardDeck;
  onStudy: () => void;
  onDelete: () => void;
}) {
  const cardCount = deck.totalCards ?? deck.cards?.length ?? 0;

  function confirmDelete() {
    Alert.alert('Delete deck', `Delete "${deck.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <Card style={styles.deckCard}>
      {/* Delete button — top right */}
      <TouchableOpacity style={styles.deckDeleteBtn} onPress={confirmDelete} hitSlop={8} activeOpacity={0.7}>
        <Trash2 size={14} color={colors.textSoft} strokeWidth={2} />
      </TouchableOpacity>

      <Text style={styles.deckName} numberOfLines={2}>
        {deck.name}
      </Text>
      <Text style={styles.deckCount}>{cardCount} {cardCount === 1 ? 'card' : 'cards'}</Text>

      <TouchableOpacity style={styles.studyButton} onPress={onStudy} activeOpacity={0.8}>
        <Text style={styles.studyButtonLabel}>Study</Text>
      </TouchableOpacity>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Generate modal sheet
// ---------------------------------------------------------------------------
function GenerateModal({
  visible,
  documents,
  preselectedDocId,
  onClose,
  onGenerated,
}: {
  visible: boolean;
  documents: Document[];
  preselectedDocId?: string;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [selectedDocId, setSelectedDocId] = useState(preselectedDocId ?? '');
  const [deckName, setDeckName] = useState('');
  const [numCards, setNumCards] = useState(12);
  const [loading, setLoading] = useState(false);

  // Sync preselect when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDocId(preselectedDocId ?? '');
      setDeckName('');
      setNumCards(12);
    }
  }, [visible, preselectedDocId]);

  function adjustCards(delta: number) {
    setNumCards(prev => Math.min(50, Math.max(4, prev + delta)));
  }

  async function handleGenerate() {
    if (!selectedDocId) {
      Alert.alert('Select a document', 'Pick a document to generate cards from.');
      return;
    }
    setLoading(true);
    try {
      await generateFlashcards({
        documentId: selectedDocId,
        numCards,
        name: deckName.trim() || undefined,
      });
      onGenerated();
      onClose();
    } catch (err) {
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const readyDocs = documents.filter(d => d.status === 'ready');

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>New flashcard deck</Text>

        {/* Document picker */}
        <Text style={styles.modalSectionLabel}>Source document</Text>
        {readyDocs.length === 0 ? (
          <Text style={styles.modalEmptyDocs}>No ready documents found.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.docPickerRow}
          >
            {readyDocs.map(doc => (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.docChip,
                  selectedDocId === doc.id && styles.docChipSelected,
                ]}
                onPress={() => setSelectedDocId(doc.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.docChipLabel,
                    selectedDocId === doc.id && styles.docChipLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {doc.title ?? doc.name ?? 'Document'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Card count stepper */}
        <Text style={styles.modalSectionLabel}>Number of cards</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustCards(-2)} activeOpacity={0.7}>
            <Text style={styles.stepperBtnLabel}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{numCards}</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustCards(2)} activeOpacity={0.7}>
            <Text style={styles.stepperBtnLabel}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Deck name */}
        <Text style={styles.modalSectionLabel}>Deck name (optional)</Text>
        <TextInput
          value={deckName}
          onChangeText={setDeckName}
          placeholder="e.g. Chapter 4 — Cell Biology"
          placeholderTextColor={colors.textSoft}
          style={styles.modalInput}
          returnKeyType="done"
        />

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.generateBtnLabel}>{loading ? 'Generating…' : 'Generate deck'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Flip card — animates between front and back
// ---------------------------------------------------------------------------
function FlipCard({
  front,
  back,
  onFlip,
}: {
  front: string;
  back: string;
  onFlip: () => void;
}) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  const flippedRef = useRef(false);

  // Reset when card content changes (new card)
  useEffect(() => {
    flipAnim.setValue(0);
    setShowBack(false);
    flippedRef.current = false;
  }, [front, back]);

  function handleTap() {
    if (flippedRef.current) return; // already flipped

    flippedRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Phase 1: rotate front out (0 → 90deg)
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setShowBack(true);
      // Phase 2: rotate back in (-90 → 0deg)
      Animated.timing(flipAnim, {
        toValue: 2,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        onFlip();
      });
    });
  }

  // Front rotates 0 → 90deg during [0,1]
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
    extrapolate: 'clamp',
  });

  // Back rotates -90 → 0deg during [1,2]
  const backRotate = flipAnim.interpolate({
    inputRange: [1, 2],
    outputRange: ['-90deg', '0deg'],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleTap} style={styles.flipCardTouchable}>
      {!showBack ? (
        <Animated.View style={[styles.flipFace, styles.flipFaceFront, { transform: [{ rotateY: frontRotate }] }]}>
          <Text style={styles.flipLabel}>QUESTION</Text>
          <Text style={styles.flipText}>{front}</Text>
          <Text style={styles.flipHint}>Tap to reveal answer</Text>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.flipFace, styles.flipFaceBack, { transform: [{ rotateY: backRotate }] }]}>
          <Text style={styles.flipLabel}>ANSWER</Text>
          <Text style={styles.flipText}>{back}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Study session overlay
// ---------------------------------------------------------------------------
function StudySession({
  deckName,
  queue,
  currentIndex,
  onReview,
  onExit,
}: {
  deckName: string;
  queue: StudyCard[];
  currentIndex: number;
  onReview: (quality: number) => void;
  onExit: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const activeCard = queue[currentIndex];
  const progress = queue.length > 0 ? (currentIndex + 1) / queue.length : 0;

  // Swipe gesture (pan responder) — left = Again, right = Got it
  const panX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: (_, { dx }) => panX.setValue(dx),
      onPanResponderRelease: (_, { dx }) => {
        if (!revealed) {
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
          return;
        }
        if (dx < -80) {
          Animated.timing(panX, { toValue: -SCREEN_WIDTH, duration: 200, useNativeDriver: true }).start(() => {
            panX.setValue(0);
            onReview(2);
          });
        } else if (dx > 80) {
          Animated.timing(panX, { toValue: SCREEN_WIDTH, duration: 200, useNativeDriver: true }).start(() => {
            panX.setValue(0);
            onReview(4);
          });
        } else {
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  function handleFlip() {
    setRevealed(true);
  }

  function handleAgain() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRevealed(false);
    onReview(2);
  }

  function handleGotIt() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRevealed(false);
    onReview(4);
  }

  // Reset revealed when card changes
  useEffect(() => {
    setRevealed(false);
  }, [currentIndex]);

  if (!activeCard) return null;

  return (
    <View style={styles.sessionOverlay}>
      <SafeAreaView style={styles.sessionSafe}>
        {/* Header */}
        <View style={styles.sessionHeader}>
          <TouchableOpacity onPress={onExit} style={styles.sessionBackBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
            <Text style={styles.sessionBackLabel}>Decks</Text>
          </TouchableOpacity>
          <Text style={styles.sessionDeckName} numberOfLines={1}>{deckName}</Text>
          <Text style={styles.sessionProgress}>
            {currentIndex + 1} / {queue.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        {/* Card area with swipe */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.sessionCardWrapper, { transform: [{ translateX: panX }] }]}
        >
          <FlipCard front={activeCard.front} back={activeCard.back} onFlip={handleFlip} />
        </Animated.View>

        {/* Swipe hint or action buttons */}
        {!revealed ? (
          <View style={styles.sessionHintRow}>
            <Text style={styles.sessionHintText}>Tap the card to flip</Text>
          </View>
        ) : (
          <View style={styles.sessionActions}>
            <View style={styles.sessionSwipeHint}>
              <Text style={styles.swipeHintLeft}>← swipe left for Again</Text>
              <Text style={styles.swipeHintRight}>swipe right for Got it →</Text>
            </View>
            <View style={styles.sessionButtonRow}>
              <TouchableOpacity style={styles.againButton} onPress={handleAgain} activeOpacity={0.85}>
                <Text style={styles.againButtonLabel}>Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gotItButton} onPress={handleGotIt} activeOpacity={0.85}>
                <Text style={styles.gotItButtonLabel}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root screen
// ---------------------------------------------------------------------------
export default function FlashcardsScreen() {
  const { docId } = useLocalSearchParams<{ docId?: string }>();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Study session
  const [studyDeck, setStudyDeck] = useState<FlashcardDeck | null>(null);
  const [studyQueue, setStudyQueue] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  async function refresh() {
    const [nextDecks, nextDocs] = await Promise.all([listFlashcardDecks(), listDocuments()]);
    setDecks(nextDecks);
    setDocuments(nextDocs);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  // If docId param: auto-open generate modal if no deck for that doc yet
  useEffect(() => {
    if (docId && decks.length >= 0) {
      setShowGenerateModal(true);
    }
  }, [docId]);

  async function openStudy(deck: FlashcardDeck) {
    try {
      const queue = await getStudyQueue(deck.id);
      if (queue.length === 0) {
        Alert.alert('No cards due', 'This deck has no cards scheduled for review right now.');
        return;
      }
      setStudyDeck(deck);
      setStudyQueue(queue);
      setCurrentIndex(0);
    } catch (err) {
      Alert.alert('Could not load study queue', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  async function reviewCurrentCard(quality: number) {
    const card = studyQueue[currentIndex];
    if (!card || !studyDeck) return;

    try {
      await reviewFlashcard(card.id, quality);
      const next = currentIndex + 1;
      if (next < studyQueue.length) {
        setCurrentIndex(next);
      } else {
        // Deck complete — haptic celebration
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Deck complete!', 'You reviewed all cards. Great work!', [
          {
            text: 'Study again',
            onPress: async () => {
              const fresh = await getStudyQueue(studyDeck.id);
              setStudyQueue(fresh);
              setCurrentIndex(0);
            },
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => {
              setStudyDeck(null);
              setStudyQueue([]);
              setCurrentIndex(0);
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Review failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  function handleDelete(deck: FlashcardDeck) {
    deleteDeck(deck.id)
      .then(refresh)
      .catch(err => Alert.alert('Delete failed', err instanceof Error ? err.message : 'Could not delete deck.'));
  }

  // Study session overlay takes over the whole screen
  if (studyDeck) {
    return (
      <StudySession
        deckName={studyDeck.name}
        queue={studyQueue}
        currentIndex={currentIndex}
        onReview={reviewCurrentCard}
        onExit={() => {
          setStudyDeck(null);
          setStudyQueue([]);
          setCurrentIndex(0);
        }}
      />
    );
  }

  return (
    <>
      <Screen>
        {/* Page header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageEyebrow}>Flashcards</Text>
            <Text style={styles.pageTitle}>Your decks</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowGenerateModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={20} color={colors.surface} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Deck list or empty state */}
        {decks.length === 0 ? (
          <EmptyState onGenerate={() => setShowGenerateModal(true)} />
        ) : (
          <View style={styles.deckGrid}>
            {decks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onStudy={() => openStudy(deck)}
                onDelete={() => handleDelete(deck)}
              />
            ))}
          </View>
        )}
      </Screen>

      <GenerateModal
        visible={showGenerateModal}
        documents={documents}
        preselectedDocId={docId}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={refresh}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  pageEyebrow: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pageTitle: {
    fontFamily: fonts.uiBlack,
    fontSize: 28,
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.uiBlack,
    fontSize: 22,
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  emptyButtonLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: colors.surface,
  },

  // Deck grid
  deckGrid: {
    gap: spacing.md,
  },
  deckCard: {
    position: 'relative',
    gap: spacing.sm,
  },
  deckDeleteBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
  },
  deckName: {
    fontFamily: fonts.uiBold,
    fontSize: 17,
    color: colors.text,
    paddingRight: 28,
    lineHeight: 24,
  },
  deckCount: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  studyButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.xs,
  },
  studyButtonLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.primaryDeep,
  },

  // Generate modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fonts.uiBlack,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSectionLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  modalEmptyDocs: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.textSoft,
    paddingVertical: spacing.sm,
  },
  docPickerRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  docChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: 200,
  },
  docChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  docChipLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  docChipLabelSelected: {
    color: colors.primaryDeep,
    fontFamily: fonts.uiBold,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 22,
    color: colors.text,
    lineHeight: 26,
  },
  stepperValue: {
    fontFamily: fonts.uiBlack,
    fontSize: 28,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: colors.text,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.surface,
  },

  // Study session
  sessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  sessionSafe: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  sessionBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sessionBackLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: colors.text,
  },
  sessionDeckName: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  sessionProgress: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 14,
    color: colors.textMuted,
    minWidth: 48,
    textAlign: 'right',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sessionCardWrapper: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  flipCardTouchable: {
    flex: 1,
  },
  flipFace: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  flipFaceFront: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flipFaceBack: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  flipLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSoft,
    alignSelf: 'flex-start',
  },
  flipText: {
    fontFamily: fonts.uiBold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 32,
    flex: 1,
    textAlignVertical: 'center',
  },
  flipHint: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.textSoft,
    alignSelf: 'center',
  },
  sessionHintRow: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  sessionHintText: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.textSoft,
  },
  sessionActions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sessionSwipeHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  swipeHintLeft: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.warning,
  },
  swipeHintRight: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.success,
  },
  sessionButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  againButton: {
    flex: 1,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  againButtonLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.warning,
  },
  gotItButton: {
    flex: 1,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  gotItButtonLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.success,
  },
});
