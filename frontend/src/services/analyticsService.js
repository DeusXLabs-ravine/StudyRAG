import api from './api';

export async function getOverview() {
  const { data } = await api.get('/analytics/overview');
  return data;
}

export async function getTopics() {
  const { data } = await api.get('/analytics/topics');
  return data.topics;
}

export async function getQuizTrend(limit = 20) {
  const { data } = await api.get('/analytics/quiz-trend', { params: { limit } });
  return data.trend;
}

export async function getActivity(days = 30) {
  const { data } = await api.get('/analytics/activity', { params: { days } });
  return data.timeline;
}

export async function getWeakAreas(threshold = 0.6) {
  const { data } = await api.get('/analytics/weak-areas', { params: { threshold } });
  return data.weakAreas;
}

export async function getSettings() {
  const { data } = await api.get('/analytics/settings');
  return data.settings;
}

export async function updateSetting(key, value) {
  const { data } = await api.put('/analytics/settings', { key, value });
  return data;
}

// ─── Learning Style & Pace ────────────────────────────────

export async function recordLearningInteraction(contentType, engagement = 'view') {
  const { data } = await api.post('/analytics/learning-interaction', { contentType, engagement });
  return data;
}

export async function getLearningProfile() {
  const { data } = await api.get('/analytics/learning-profile');
  return data;
}
