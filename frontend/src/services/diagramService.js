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

export async function getGeneratedDiagramImageUrl(id) {
  const { data } = await api.get(`/diagrams/generated/${id}/image`);
  return data.url;
}
