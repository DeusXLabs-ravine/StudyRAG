import api from './api';

export async function listModules(documentId) {
  const params = documentId ? { documentId } : {};
  const { data } = await api.get('/modules', { params });
  return data.modules;
}

export async function getModule(id) {
  const { data } = await api.get(`/modules/${id}`);
  return data;
}

export async function updateProgress(moduleId, score) {
  const { data } = await api.put(`/modules/${moduleId}/progress`, { score });
  return data;
}

export async function explainSimply(moduleId, question = '') {
  const { data } = await api.post(`/modules/${moduleId}/explain`, { question });
  return data.explanation;
}
