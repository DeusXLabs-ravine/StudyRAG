import { create } from 'zustand';
import * as moduleService from '../services/moduleService';

const useModuleStore = create((set) => ({
  modules: [],
  currentModule: null,
  loading: false,
  error: null,

  fetchModules: async (documentId) => {
    set({ loading: true, error: null });
    try {
      const modules = await moduleService.listModules(documentId);
      set({ modules, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchModule: async (id) => {
    set({ loading: true, error: null });
    try {
      const module = await moduleService.getModule(id);
      set({ currentModule: module, loading: false });
      return module;
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  submitProgress: async (moduleId, score) => {
    try {
      const result = await moduleService.updateProgress(moduleId, score);
      set(state => ({
        modules: state.modules.map(m =>
          m.id === moduleId ? { ...m, progress: result.progress } : m
        ),
        currentModule: state.currentModule?.id === moduleId
          ? { ...state.currentModule, progress: result.progress }
          : state.currentModule,
      }));
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  regenerateQuestions: async (moduleId) => {
    try {
      const updatedModule = await moduleService.regenerateQuestions(moduleId);
      set(state => ({
        modules: state.modules.map(m =>
          m.id === moduleId ? updatedModule : m
        ),
        currentModule: state.currentModule?.id === moduleId
          ? updatedModule
          : state.currentModule,
      }));
      return updatedModule;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  setCurrentModule: (module) => set({ currentModule: module }),

  // Force-mark a module as completed in the local store (belt-and-suspenders
  // for when submitProgress may not have fully propagated)
  markModuleCompleted: (moduleId) => set(state => ({
    modules: state.modules.map(m =>
      m.id === moduleId
        ? { ...m, progress: { ...m.progress, completed: true } }
        : m
    ),
    currentModule: state.currentModule?.id === moduleId
      ? { ...state.currentModule, progress: { ...state.currentModule.progress, completed: true } }
      : state.currentModule,
  })),
}));

export default useModuleStore;
