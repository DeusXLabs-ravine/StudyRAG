import api from './api';

export async function generateAptitudeTest(subject) {
  const { data } = await api.post('/aptitude/generate', { subject });
  return data;
}

export async function submitAptitudeTest(subject, answers, questions) {
  const { data } = await api.post('/aptitude/submit', { subject, answers, questions });
  return data;
}

export async function getAptitudeHistory() {
  const { data } = await api.get('/aptitude/history');
  return data.history;
}

export async function getLatestAptitude() {
  const { data } = await api.get('/aptitude/latest');
  return data.result;
}
