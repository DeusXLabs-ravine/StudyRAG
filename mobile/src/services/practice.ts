import { api } from '@/lib/api/client';

export type QuizQuestion = {
  question: string;
  options: string[];
  answer?: string;
  explanation?: string;
};

export type QuizPayload = {
  quizId?: string;
  id?: string;
  title?: string;
  questions: QuizQuestion[];
  timeLimitSeconds?: number;
  isExam?: boolean;
};

export type QuizResult = {
  score: number;
  total: number;
  percentage?: number;
  feedback?: string;
  weakTopics?: string[];
};

export type FlashcardDeck = {
  id: string;
  name: string;
  cards?: Array<{ id: string; front: string; back: string }>;
  totalCards?: number;
};

export async function generateQuiz(payload: {
  documentId?: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  adaptive?: boolean;
}) {
  const { data } = await api.post<QuizPayload>('/quiz/generate', payload);
  return data;
}

export async function submitQuiz(
  quizId: string | undefined,
  answers: string[],
  questions: QuizQuestion[],
  timeSpentSeconds?: number,
) {
  const { data } = await api.post<QuizResult>('/quiz/submit', { quizId, answers, questions, timeSpentSeconds });
  return data;
}

export async function getQuizHistory() {
  const { data } = await api.get<{ history: QuizResult[] }>('/quiz/history');
  return data.history || [];
}

export async function generateFlashcards(payload: { documentId?: string; numCards: number; name?: string }) {
  const { data } = await api.post<FlashcardDeck>('/flashcards/generate', payload);
  return data;
}

export async function listFlashcardDecks() {
  const { data } = await api.get<{ decks: FlashcardDeck[] }>('/flashcards');
  return data.decks || [];
}

export async function getStudyQueue(deckId: string) {
  const { data } = await api.get<{ cards: Array<{ id: string; front: string; back: string }> }>(
    `/flashcards/${deckId}/study-queue`,
  );
  return data.cards || [];
}

export async function reviewFlashcard(cardId: string, quality: number) {
  const { data } = await api.put(`/flashcards/${cardId}/review`, { quality });
  return data;
}

export async function deleteDeck(deckId: string) {
  await api.delete(`/flashcards/${deckId}`);
}

export async function generateExam(payload: {
  documentId?: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitMinutes: number;
}) {
  const { data } = await api.post<QuizPayload>('/exam/generate', payload);
  return data;
}

export async function submitExam(
  quizId: string | undefined,
  answers: string[],
  questions: QuizQuestion[],
  timeSpentSeconds?: number,
) {
  const { data } = await api.post<QuizResult>('/exam/submit', { quizId, answers, questions, timeSpentSeconds });
  return data;
}

export async function getExamHistory() {
  const { data } = await api.get<{ history: QuizResult[] }>('/exam/history');
  return data.history || [];
}

export async function createPrepSession(payload: {
  documentIds: string[];
  name: string;
  config?: Record<string, unknown>;
}) {
  const { data } = await api.post('/exam/prep', payload);
  return data;
}

export async function listPrepSessions() {
  const { data } = await api.get<{ sessions: Array<{ id: string; name: string; status?: string }> }>('/exam/prep');
  return data.sessions || [];
}

export async function getSimulationCatalog() {
  const { data } = await api.get<{ simulations: Array<{ id: string; title: string; description: string }> }>(
    '/simulations/catalog',
  );
  return data.simulations || [];
}

export async function generateSimulationParams(query: string, moduleId?: string, documentId?: string) {
  const { data } = await api.post('/simulations/generate-params', { query, moduleId, documentId });
  return data;
}
