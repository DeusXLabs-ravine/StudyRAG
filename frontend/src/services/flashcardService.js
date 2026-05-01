import api from './api';

export async function generateFlashcards({ numCards, documentId, name }) {
  const { data } = await api.post('/flashcards/generate', { numCards, documentId, name });
  return data;
}

export async function generateAdaptiveFlashcards({ numCards }) {
  const { data } = await api.post('/flashcards/generate-adaptive', { numCards });
  return data;
}

export async function listFlashcards() {
  const { data } = await api.get('/flashcards');
  return data.decks;
}

export async function getFlashcardDeck(id) {
  const { data } = await api.get(`/flashcards/${id}`);
  return data;
}

export async function getStudyQueue(deckId) {
  const { data } = await api.get(`/flashcards/${deckId}/study-queue`);
  return data;
}

export async function reviewFlashcard(cardId, quality, durationSeconds) {
  const body = { quality };
  if (durationSeconds != null) body.durationSeconds = durationSeconds;
  const { data } = await api.put(`/flashcards/${cardId}/review`, body);
  return data;
}

export async function deleteDeck(deckId) {
  const { data } = await api.delete(`/flashcards/${deckId}`);
  return data;
}
