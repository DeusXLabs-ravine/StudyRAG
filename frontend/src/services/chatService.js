import api from './api';
import useAuthStore from '../store/authStore';

export async function sendQuery(query, documentId, durationSeconds = null) {
  const { data } = await api.post('/chat/query', { query, documentId, durationSeconds });
  return data;
}

/**
 * Streaming chat — yields SSE events as they arrive.
 * Each yielded object is one of:
 *   { type: 'text', text: string }                            — incremental token
 *   { type: 'done', id, timestamp, sources, webSources, suggestSolver }  — end of stream
 *   { type: 'error', message: string }                        — error
 */
export async function* streamQuery(query, documentId, durationSeconds = null) {
  const token = useAuthStore.getState().getAccessToken();
  const baseUrl = import.meta.env.VITE_API_URL || '/api';

  const response = await fetch(`${baseUrl}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, documentId, durationSeconds }),
  });

  if (!response.ok) {
    throw new Error(`Chat stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop(); // Keep incomplete trailing fragment

    for (const part of parts) {
      const line = part.trim();
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  }
}

export async function getChatHistory() {
  const { data } = await api.get('/chat/history');
  return data.messages;
}

export async function clearChatHistory() {
  const { data } = await api.delete('/chat/history');
  return data;
}
