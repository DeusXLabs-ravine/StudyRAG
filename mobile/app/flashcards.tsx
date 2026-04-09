import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { listDocuments } from '@/services/core';
import {
  deleteDeck,
  generateFlashcards,
  getStudyQueue,
  listFlashcardDecks,
  reviewFlashcard,
  type FlashcardDeck,
} from '@/services/practice';
import { colors, fonts, radius } from '@/lib/theme/tokens';

export default function FlashcardsScreen() {
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [deckName, setDeckName] = useState('');
  const [numCards, setNumCards] = useState('12');
  const [studyDeckId, setStudyDeckId] = useState('');
  const [studyQueue, setStudyQueue] = useState<Array<{ id: string; front: string; back: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  async function refreshDecks() {
    const [nextDecks, nextDocuments] = await Promise.all([listFlashcardDecks(), listDocuments()]);
    setDecks(nextDecks);
    setDocuments(nextDocuments);
  }

  useEffect(() => {
    refreshDecks().catch(() => undefined);
  }, []);

  async function createDeck() {
    try {
      await generateFlashcards({
        documentId: selectedDocId || undefined,
        numCards: Number(numCards) || 12,
        name: deckName || undefined,
      });
      setDeckName('');
      await refreshDecks();
    } catch (error) {
      Alert.alert('Could not generate flashcards', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function openStudy(deckId: string) {
    try {
      const queue = await getStudyQueue(deckId);
      setStudyDeckId(deckId);
      setStudyQueue(queue);
      setCurrentIndex(0);
      setShowBack(false);
    } catch (error) {
      Alert.alert('Could not load study queue', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function reviewCurrentCard(quality: number) {
    const currentCard = studyQueue[currentIndex];
    if (!currentCard) return;

    try {
      await reviewFlashcard(currentCard.id, quality);
      const nextIndex = currentIndex + 1;
      setShowBack(false);
      if (nextIndex < studyQueue.length) {
        setCurrentIndex(nextIndex);
      } else if (studyDeckId) {
        await openStudy(studyDeckId);
      }
    } catch (error) {
      Alert.alert('Review failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  const activeCard = studyQueue[currentIndex];

  return (
    <Screen>
      <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" />
      <SectionTitle eyebrow="Flashcards" title="Generate decks and review your queue." subtitle="This mobile flow keeps deck generation native and leaves spaced repetition scheduling on the backend." />

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Generate a deck</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {documents
              .filter(document => document.status === 'ready')
              .map(document => (
                <PrimaryButton
                  key={document.id}
                  label={document.title || document.name || 'Document'}
                  onPress={() => setSelectedDocId(document.id)}
                  variant={selectedDocId === document.id ? 'primary' : 'secondary'}
                />
              ))}
          </View>
          <TextInput value={deckName} onChangeText={setDeckName} placeholder="Deck name (optional)" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <TextInput value={numCards} onChangeText={setNumCards} keyboardType="number-pad" placeholder="Number of cards" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <PrimaryButton label="Generate flashcards" onPress={createDeck} disabled={!selectedDocId} />
        </View>
      </Card>

      {decks.map(deck => (
        <Card key={deck.id}>
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 18 }}>{deck.name}</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
              {deck.totalCards || deck.cards?.length || 0} cards
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PrimaryButton label="Study queue" onPress={() => openStudy(deck.id)} variant="secondary" />
              <PrimaryButton
                label="Delete"
                onPress={() =>
                  deleteDeck(deck.id)
                    .then(refreshDecks)
                    .catch(error => Alert.alert('Delete failed', error.message))
                }
                variant="ghost"
              />
            </View>
          </View>
        </Card>
      ))}

      {activeCard ? (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 12 }}>
              Card {currentIndex + 1} of {studyQueue.length}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 22 }}>
              {showBack ? activeCard.back : activeCard.front}
            </Text>
            {!showBack ? (
              <PrimaryButton label="Reveal answer" onPress={() => setShowBack(true)} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PrimaryButton label="Review again" onPress={() => reviewCurrentCard(2)} variant="secondary" />
                <PrimaryButton label="I know it" onPress={() => reviewCurrentCard(4)} />
              </View>
            )}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const fieldStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: fonts.uiMedium,
  color: colors.text,
} as const;
