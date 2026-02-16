import api from './api';

export async function sendQuery(query, documentId) {
  const { data } = await api.post('/chat/query', { query, documentId });
  return data;
}

export async function getChatHistory() {
  const { data } = await api.get('/chat/history');
  return data.messages;
}

export async function clearChatHistory() {
  const { data } = await api.delete('/chat/history');
  return data;
}
