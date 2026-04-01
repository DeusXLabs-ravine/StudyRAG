import { create } from 'zustand';
import * as moduleService from '../services/moduleService';

const useModuleStore = create((set, get) => ({
  modules: [],
  currentModule: null,
  loading: false,
  error: null,
  generating: false,
  _pollTimer: null,

  fetchModules: async (documentId) => {
    set({ loading: true, error: null });
    try {
      const { modules, generating } = await moduleService.listModules(documentId);
      set({ modules: Array.isArray(modules) ? modules : [], generating, loading: false });

      // Auto-poll for new modules while background generation is running
      const prev = get()._pollTimer;
      if (prev) clearTimeout(prev);

      if (generating && documentId) {
        const timer = setTimeout(() => {
          // Silent refresh — don't show loading spinner
          get()._pollRefresh(documentId);
        }, 5000);
        set({ _pollTimer: timer });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCourseModules: async (courseId) => {
    set({ loading: true, error: null });
    try {
      const { modules, generating } = await moduleService.listCourseModules(courseId);
      set({ modules: Array.isArray(modules) ? modules : [], generating, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Silent refresh used by polling — updates modules without loading state
  _pollRefresh: async (documentId) => {
    try {
      const { modules, generating } = await moduleService.listModules(documentId);
      set({ modules: Array.isArray(modules) ? modules : [], generating });

      if (generating) {
        const timer = setTimeout(() => {
          get()._pollRefresh(documentId);
        }, 5000);
        set({ _pollTimer: timer });
      } else {
        set({ _pollTimer: null });
      }
    } catch {
      // Silently ignore poll errors
      set({ _pollTimer: null, generating: false });
    }
  },

  stopPolling: () => {
    const timer = get()._pollTimer;
    if (timer) clearTimeout(timer);
    set({ _pollTimer: null });
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

  bridgeGeneratingModuleId: null,

  submitProgress: async (moduleId, score, answers = null, durationSeconds = null) => {
    try {
      const result = await moduleService.updateProgress(moduleId, score, answers, durationSeconds);
      set(state => ({
        modules: state.modules.map(m =>
          m.id === moduleId ? { ...m, progress: result.progress } : m
        ),
        currentModule: state.currentModule?.id === moduleId
          ? { ...state.currentModule, progress: result.progress }
          : state.currentModule,
        // Set bridge generating state if backend confirms
        bridgeGeneratingModuleId: result.bridgeGenerating ? moduleId : state.bridgeGeneratingModuleId
      }));

      // If a bridge module is being generated, poll for it to appear
      if (result.bridgeGenerating) {
        const currentModule = get().currentModule || get().modules.find(m => m.id === moduleId);
        const docId = currentModule?.documentId || currentModule?.document_id;
        if (docId) {
          // Poll at intervals, clear bridgeGenerating state when bridge appears or after timeout
          const pollIntervals = [3000, 6000, 10000, 15000];
          pollIntervals.forEach((delay, idx) => {
            setTimeout(async () => {
              await get()._pollRefresh(docId);
              // If we've reached the last poll or the modules now contain the bridge, clear state
              if (idx === pollIntervals.length - 1) {
                set({ bridgeGeneratingModuleId: null });
              } else {
                const updatedModules = get().modules;
                const hasBridge = updatedModules.some(m => m.parentModuleId === moduleId && m.moduleType === 'bridge');
                if (hasBridge) set({ bridgeGeneratingModuleId: null });
              }
            }, delay);
          });
        }
      }

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
