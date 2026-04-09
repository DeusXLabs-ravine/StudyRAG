import api from './api';

// ─── Existing: Document-extracted diagrams ────────────────────

export async function listDiagrams(documentId) {
  const { data } = await api.get(`/diagrams/document/${documentId}`);
  return data.diagrams;
}

export async function getDiagram(id) {
  const { data } = await api.get(`/diagrams/${id}`);
  return data;
}

export async function getDiagramImageUrl(id) {
  const { data } = await api.get(`/diagrams/${id}/image`);
  return data.url;
}

export async function regenerateDiagramLevel(id, level) {
  const { data } = await api.post(`/diagrams/${id}/regenerate`, { level });
  return data;
}

// ─── New: On-demand generated diagrams ────────────────────────

export async function generateDiagramForTopic({ topic, moduleId, documentId, diagramType, teachingLevel }) {
  const { data } = await api.post('/diagrams/generate', {
    topic,
    moduleId,
    documentId,
    diagramType: diagramType || 'auto',
    teachingLevel,
  });
  return data;
}

export async function getModuleDiagrams(moduleId) {
  const { data } = await api.get(`/diagrams/module/${moduleId}`);
  return data.diagrams;
}

// ─── Persistent cache for generated diagram image URLs ─────────────────────
const CACHE_KEY = 'study_rag_diagram_url_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function _getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Cleanup expired entries
    const now = Date.now();
    const clean = {};
    let changed = false;
    for (const [id, entry] of Object.entries(parsed)) {
      if (now - entry.ts < CACHE_TTL) {
        clean[id] = entry;
      } else {
        changed = true;
      }
    }
    if (changed) localStorage.setItem(CACHE_KEY, JSON.stringify(clean));
    return clean;
  } catch { return {}; }
}

export function clearDiagramCache() {
  localStorage.removeItem(CACHE_KEY);
}

export async function getGeneratedDiagramImageUrl(id) {
  const cache = _getCache();
  if (cache[id]) return cache[id].url;

  const { data } = await api.get(`/diagrams/generated/${id}/image`);
  
  const updated = _getCache();
  updated[id] = { url: data.url, ts: Date.now() };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (_) { /* quota */ }

  return data.url;
}
