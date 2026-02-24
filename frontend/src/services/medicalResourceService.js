import api from './api';

export async function getModuleMedicalResources(moduleId) {
  const { data } = await api.get(`/medical/module/${moduleId}`);
  return data.resources;
}

export async function getDocumentMedicalResources(documentId) {
  const { data } = await api.get(`/medical/document/${documentId}`);
  return data.resources;
}

export async function enrichModuleWithMedical({ moduleId, documentId, topic, content }) {
  const { data } = await api.post('/medical/enrich', { moduleId, documentId, topic, content });
  return data;
}

export async function searchPubMed(query, maxResults = 5) {
  const { data } = await api.get('/medical/pubmed', { params: { query, maxResults } });
  return data.articles;
}

export async function lookupICD10(term, maxResults = 5) {
  const { data } = await api.get('/medical/icd10', { params: { term, maxResults } });
  return data.codes;
}
