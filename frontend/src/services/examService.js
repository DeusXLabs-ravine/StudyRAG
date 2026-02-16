import api from './api';

export async function generateExam({ numQuestions, difficulty, documentId, timeLimitMinutes }) {
  const { data } = await api.post('/exam/generate', { numQuestions, difficulty, documentId, timeLimitMinutes });
  return data;
}

export async function submitExam(quizId, answers, questions, timeSpentSeconds) {
  const { data } = await api.post('/exam/submit', { quizId, answers, questions, timeSpentSeconds });
  return data;
}

export async function getExamHistory() {
  const { data } = await api.get('/exam/history');
  return data.history;
}
