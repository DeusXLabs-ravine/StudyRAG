import api from './api';

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
