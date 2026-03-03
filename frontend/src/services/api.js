import axios from 'axios';
import useAuthStore from '../store/authStore';

// In production, use the api subdomain. In dev, proxy through Vite.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth header interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Translate technical error messages into user-friendly ones.
 * The backend error handler does this too, but this catches network-level
 * errors (timeouts, CORS, connection refused) that never reach the backend.
 */
function friendlyError(raw) {
  if (!raw) return 'Something went wrong. Please try again.';
  const msg = raw.toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnaborted'))
    return 'This is taking longer than expected. Please try again.';
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('err_connection'))
    return "We're having trouble connecting. Please check your connection and try again.";
  if (msg.includes('429') || msg.includes('rate') || msg.includes('too many'))
    return "We're experiencing high demand right now. Please try again in a minute.";
  return raw; // Already friendly (came from backend error handler)
}

api.interceptors.response.use(
  response => response,
  error => {
    const raw = error.response?.data?.error?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(friendlyError(raw)));
  }
);

export default api;
