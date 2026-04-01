import api from './api';

export async function solveProblem(problem, subject = null, documentId = null, useWebSearch = false, durationSeconds = null) {
  const { data } = await api.post('/solver/solve', { 
    problem, 
    subject, 
    documentId, 
    useWebSearch, 
    durationSeconds 
  });
  return data;
}

export async function solveFollowUp(sessionId, question) {
  const { data } = await api.post('/solver/follow-up', { sessionId, question });
  return data;
}

export async function getSolverHistory(limit = 20) {
  const { data } = await api.get('/solver/history', { params: { limit } });
  return data.sessions;
}
