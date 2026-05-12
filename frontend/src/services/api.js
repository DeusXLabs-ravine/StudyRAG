import axios from 'axios';
import useAuthStore from '../store/authStore';
import { resolveApiBaseUrl } from './apiBase';

export const API_BASE = resolveApiBaseUrl({
  envApiUrl: import.meta.env.VITE_API_URL,
});

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request deduplication ────────────────────────────────────
// When multiple components mount simultaneously and fire the same GET request
// (e.g. two components both calling /api/modules?documentId=X), only one real
// network request is made. All callers receive the same resolved promise.
const _inFlight = new Map();

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function friendlyError(raw) {
  if (!raw) return 'Something went wrong. Please try again.';
  const msg = raw.toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnaborted'))
    return 'This is taking longer than expected. Please try again.';
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('err_connection'))
    return "We're having trouble connecting. Please check your connection and try again.";
  if (msg.includes('429') || msg.includes('rate') || msg.includes('too many'))
    return "We're experiencing high demand right now. Please try again in a minute.";
  return raw;
}

api.interceptors.response.use(
  response => response,
  error => {
    const raw = error.response?.data?.error?.message || error.message || 'An error occurred';
    const enriched = new Error(friendlyError(raw));
    enriched.response = error.response;
    return Promise.reject(enriched);
  },
);

// Wrap axios request methods to register in-flight promises for GET calls
const _originalGet = api.get.bind(api);
api.get = (url, config = {}) => {
  const params = config.params || {};
  const baseURL = api.defaults.baseURL || '';
  const key = `${baseURL}${url}?${new URLSearchParams(params).toString()}`;

  if (!_inFlight.has(key)) {
    const promise = _originalGet(url, config);
    _inFlight.set(key, promise);
    promise.finally(() => _inFlight.delete(key));
    return promise;
  }
  return _inFlight.get(key);
};

export default api;
