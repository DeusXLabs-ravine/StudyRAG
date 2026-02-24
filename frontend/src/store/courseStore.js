import { create } from 'zustand';
import * as courseService from '../services/courseService';

const useCourseStore = create((set, get) => ({
  courses: [],
  currentCourse: null,
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true, error: null });
    try {
      const courses = await courseService.listCourses();
      set({ courses: Array.isArray(courses) ? courses : [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCourse: async (id) => {
    try {
      const course = await courseService.getCourse(id);
      set(state => ({
        currentCourse: course,
        courses: state.courses.map(c => c.id === id ? course : c),
      }));
      return course;
    } catch (error) {
      set({ error: error.message });
    }
  },

  createCourse: async (title, description, documentIds = []) => {
    set({ error: null });
    try {
      const course = await courseService.createCourse(title, description, documentIds);
      set(state => ({
        courses: [course, ...state.courses],
      }));
      return course;
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      set({ error: msg });
      throw error;
    }
  },

  addDocumentToCourse: async (courseId, documentId, role) => {
    try {
      const updated = await courseService.addDocumentToCourse(courseId, documentId, role);
      set(state => ({
        currentCourse: state.currentCourse?.id === courseId ? updated : state.currentCourse,
        courses: state.courses.map(c => c.id === courseId ? updated : c),
      }));
      return updated;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  generateCourseModules: async (courseId) => {
    try {
      await courseService.generateCourseModules(courseId);
      // Update course status locally
      set(state => ({
        courses: state.courses.map(c =>
          c.id === courseId ? { ...c, status: 'processing' } : c
        ),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteCourse: async (id) => {
    try {
      await courseService.deleteCourse(id);
      set(state => ({
        courses: state.courses.filter(c => c.id !== id),
        currentCourse: state.currentCourse?.id === id ? null : state.currentCourse,
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  setCurrentCourse: (course) => set({ currentCourse: course }),
}));

export default useCourseStore;
