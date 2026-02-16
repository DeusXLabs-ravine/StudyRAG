import api from './api';

export async function generateQuiz({ numQuestions, difficulty, documentId, adaptive }) {
  const { data } = await api.post('/quiz/generate', { numQuestions, difficulty, documentId, adaptive });
  return data;
}

export async function submitQuiz(quizId, answers, questions, timeSpentSeconds) {
  const { data } = await api.post('/quiz/submit', { quizId, answers, questions, timeSpentSeconds });
  return data;
}

export async function getQuizHistory() {
  const { data } = await api.get('/quiz/history');
  return data.history;
}
