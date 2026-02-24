import api from './api';

export async function generateGame(moduleId, gameType, difficulty) {
  const { data } = await api.post('/games/generate', { moduleId, gameType, difficulty });
  return data;
}

export async function submitGameResult({ gameType, score, correct, total, combo, timeMs }) {
  const { data } = await api.post('/games/submit', { gameType, score, correct, total, combo, timeMs });
  return data;
}

export async function getGameStats() {
  const { data } = await api.get('/games/stats');
  return data;
}

export async function getAchievements() {
  const { data } = await api.get('/games/achievements');
  return data;
}
