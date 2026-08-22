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

      const prev = get()._pollTimer;
      if (prev) clearTimeout(prev);

      if (generating && documentId) {
        // First poll fires quickly so the first module batch surfaces fast.
        const timer = setTimeout(() => {
          get()._pollRefresh(documentId, 3000);
        }, 2500);
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

  // Silent refresh used by polling — updates modules without loading state.
  // Adaptive cadence: while new modules keep arriving, poll fast (~3s) so they
  // surface within seconds of being written; only back off (×1.5, cap 30s) during
  // quiet stretches where the count didn't change. Skips the request if hidden.
  _pollRefresh: async (documentId, intervalMs = 3000) => {
    // Don't poll hidden tabs — wastes requests and battery
    if (document.visibilityState === 'hidden') {
      const timer = setTimeout(() => get()._pollRefresh(documentId, intervalMs), intervalMs);
      set({ _pollTimer: timer });
      return;
    }
    try {
      const prevCount = get().modules.length;
      const { modules, generating } = await moduleService.listModules(documentId);
      const nextModules = Array.isArray(modules) ? modules : [];
      set({ modules: nextModules, generating });

      if (generating) {
        // Reset to a fast floor when new modules landed; otherwise back off (cap 30s).
        const grew = nextModules.length > prevCount;
        const nextInterval = grew ? 3000 : Math.min(intervalMs * 1.5, 30_000);
        const timer = setTimeout(() => get()._pollRefresh(documentId, nextInterval), nextInterval);
        set({ _pollTimer: timer });
      } else {
        set({ _pollTimer: null });
      }
    } catch {
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
  // Module currently being rewritten for the learner after a failed check.
  adaptiveRewritingModuleId: null,

  submitProgress: async (moduleId, score, answers = null, durationSeconds = null) => {
    try {
      const before = get().modules.find(m => m.id === moduleId);
      const beforeVersion = before?.version || 1;

      const result = await moduleService.updateProgress(moduleId, score, answers, durationSeconds);
      set(state => ({
        modules: state.modules.map(m =>
          m.id === moduleId ? { ...m, progress: result.progress } : m
        ),
        currentModule: state.currentModule?.id === moduleId
          ? { ...state.currentModule, progress: result.progress }
          : state.currentModule,
        // Set bridge generating state if backend confirms
        bridgeGeneratingModuleId: result.bridgeGenerating ? moduleId : state.bridgeGeneratingModuleId,
        adaptiveRewritingModuleId: result.adaptiveRegenerating ? moduleId : state.adaptiveRewritingModuleId,
      }));

      // If this module is being rewritten, poll until its version increments,
      // then swap the fresh content in and clear the banner.
      if (result.adaptiveRegenerating) {
        const docId = before?.documentId || before?.document_id;
        if (docId) {
          [4000, 8000, 13000, 20000, 28000].forEach((delay, idx, arr) => {
            setTimeout(async () => {
              await get()._pollRefresh(docId);
              const updated = get().modules.find(m => m.id === moduleId);
              if ((updated?.version || 1) > beforeVersion || idx === arr.length - 1) {
                set(state => (state.adaptiveRewritingModuleId === moduleId
                  ? { adaptiveRewritingModuleId: null }
                  : {}));
              }
            }, delay);
          });
        }
      }

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
