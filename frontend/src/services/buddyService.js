import api from './api';

// ── Catalog ────────────────────────────────────────────────────────────────
export async function listPresets() {
  const { data } = await api.get('/buddy/presets');
  return data.presets;
}

export async function listVoices() {
  const { data } = await api.get('/buddy/voices');
  return data;
}

// ── Profile ────────────────────────────────────────────────────────────────
export async function getMyBuddyProfile() {
  const { data } = await api.get('/buddy/profile');
  return data.profile;
}

export async function createBuddyProfile(payload) {
  const { data } = await api.post('/buddy/profile', payload);
  return data.profile;
}

export async function updateBuddyProfile(id, patch) {
  const { data } = await api.patch(`/buddy/profile/${id}`, patch);
  return data.profile;
}

export async function deleteBuddyProfile(id) {
  const { data } = await api.delete(`/buddy/profile/${id}`);
  return data;
}

// ── Sessions ───────────────────────────────────────────────────────────────
export async function listBuddySessions(limit = 20) {
  const { data } = await api.get('/buddy/sessions', { params: { limit } });
  return data.sessions;
}

export async function getBuddySession(id) {
  const { data } = await api.get(`/buddy/sessions/${id}`);
  return data;
}

// ── Memory ─────────────────────────────────────────────────────────────────
export async function listBuddyMemory(limit = 100) {
  const { data } = await api.get('/buddy/memory', { params: { limit } });
  return data.memory;
}

export async function deleteBuddyMemory(id) {
  const { data } = await api.delete(`/buddy/memory/${id}`);
  return data;
}

export async function wipeBuddyMemory() {
  const { data } = await api.post('/buddy/memory/wipe');
  return data;
}

// ── Usage ──────────────────────────────────────────────────────────────────
export async function getBuddyUsage() {
  const { data } = await api.get('/buddy/usage');
  return data;
}
