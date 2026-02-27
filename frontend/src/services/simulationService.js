import api from './api';

export async function generateSimulationParams(query, moduleId, documentId) {
  const { data } = await api.post('/simulations/generate-params', { query, moduleId, documentId });
  return data;
}

export async function getCatalog() {
  const { data } = await api.get('/simulations/catalog');
  return data;
}
