import api from './api';

export async function listCourses() {
  const { data } = await api.get('/courses');
  return data.courses;
}

export async function getCourse(id) {
  const { data } = await api.get(`/courses/${id}`);
  return data;
}

export async function createCourse(title, description, documentIds = []) {
  const { data } = await api.post('/courses', { title, description, documentIds });
  return data;
}

export async function addDocumentToCourse(courseId, documentId, role = 'source') {
  const { data } = await api.post(`/courses/${courseId}/documents`, { documentId, role });
  return data;
}

export async function removeDocumentFromCourse(courseId, documentId) {
  const { data } = await api.delete(`/courses/${courseId}/documents/${documentId}`);
  return data;
}

export async function generateCourseModules(courseId) {
  const { data } = await api.post(`/courses/${courseId}/generate`);
  return data;
}

export async function deleteCourse(id) {
  const { data } = await api.delete(`/courses/${id}`);
  return data;
}
