import api from './api';

// ─── Existing Exam Endpoints ───────────────────────────────

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

// ─── Exam Prep Endpoints ───────────────────────────────────

export async function createPrepSession({ documentIds, name, config }) {
  const { data } = await api.post('/exam/prep', { documentIds, name, config });
  return data;
}

export async function listPrepSessions() {
  const { data } = await api.get('/exam/prep');
  return data.sessions;
}

export async function getPrepSession(sessionId) {
  const { data } = await api.get(`/exam/prep/${sessionId}`);
  return data;
}

export async function deletePrepSession(sessionId) {
  const { data } = await api.delete(`/exam/prep/${sessionId}`);
  return data;
}

export async function addPrepMaterialFile(sessionId, file, materialType, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('materialType', materialType);
  const { data } = await api.post(`/exam/prep/${sessionId}/materials`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded * 100) / e.total)) : undefined,
  });
  return data;
}

export async function addPrepMaterialText(sessionId, materialType, text, originalName) {
  const { data } = await api.post(`/exam/prep/${sessionId}/materials`, {
    materialType,
    text,
    originalName,
  });
  return data;
}

export async function startPrepGeneration(sessionId) {
  const { data } = await api.post(`/exam/prep/${sessionId}/generate`);
  return data;
}

export async function generatePracticeExam(sessionId, { numQuestions, difficulty, timeLimitMinutes }) {
  const { data } = await api.post(`/exam/prep/${sessionId}/practice-exam`, {
    numQuestions,
    difficulty,
    timeLimitMinutes,
  });
  return data;
}
