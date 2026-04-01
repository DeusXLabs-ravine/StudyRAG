import api from './api';

export async function listModules(documentId) {
  const params = documentId ? { documentId } : {};
  const { data } = await api.get('/modules', { params });
  return { modules: data.modules, generating: data.generating || false };
}

export async function listCourseModules(courseId) {
  const { data } = await api.get('/modules', { params: { courseId } });
  return { modules: data.modules, generating: data.generating || false };
}

export async function getModule(id) {
  const { data } = await api.get(`/modules/${id}`);
  return data;
}

export async function updateProgress(moduleId, score, answers = null, durationSeconds = null) {
  const body = { score };
  if (answers) body.answers = answers;
  if (durationSeconds) body.durationSeconds = durationSeconds;
  const { data } = await api.put(`/modules/${moduleId}/progress`, body);
  return data;
}

export async function regenerateQuestions(moduleId) {
  const { data } = await api.post(`/modules/${moduleId}/regenerate-questions`);
  return data;
}

export async function explainSimply(moduleId, question = '') {
  const { data } = await api.post(`/modules/${moduleId}/explain`, { question });
  return data.explanation;
}

export async function getTutorGreeting(moduleId) {
  const { data } = await api.post(`/modules/${moduleId}/tutor/greeting`);
  return data.greeting;
}

export async function sendTutorMessage(moduleId, message, conversationHistory) {
  const { data } = await api.post(`/modules/${moduleId}/tutor/chat`, { message, conversationHistory });
  return { reply: data.reply, webSources: data.webSources || [] };
}
