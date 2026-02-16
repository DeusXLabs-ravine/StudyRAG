import { create } from 'zustand';
import * as documentService from '../services/documentService';

const useDocumentStore = create((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  uploads: {},

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const documents = await documentService.listDocuments();
      set({ documents, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  uploadDocument: async (file) => {
    const fileName = file.name;

    set(state => ({
      error: null,
      uploads: {
        ...state.uploads,
        [fileName]: { progress: 0, status: 'uploading' },
      },
    }));

    try {
      const result = await documentService.uploadDocument(file, (progress) => {
        set(state => ({
          uploads: {
            ...state.uploads,
            [fileName]: { progress, status: progress >= 100 ? 'registering' : 'uploading' },
          },
        }));
      });

      set(state => ({
        documents: [...state.documents, { ...result, status: 'processing' }],
        uploads: {
          ...state.uploads,
          [fileName]: { progress: 100, status: 'done' },
        },
      }));

      setTimeout(() => {
        set(state => {
          const { [fileName]: _, ...rest } = state.uploads;
          return { uploads: rest };
        });
      }, 2000);

      return result;
    } catch (error) {
      set(state => ({
        error: error.message,
        uploads: {
          ...state.uploads,
          [fileName]: { progress: 0, status: 'error', error: error.message },
        },
      }));
      throw error;
    }
  },

  clearUploadError: (fileName) => {
    set(state => {
      const { [fileName]: _, ...rest } = state.uploads;
      return { uploads: rest };
    });
  },

  deleteDocument: async (id) => {
    try {
      await documentService.deleteDocument(id);
      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  refreshDocument: async (id) => {
    try {
      const doc = await documentService.getDocument(id);
      set(state => ({
        documents: state.documents.map(d => d.id === id ? doc : d),
      }));
      return doc;
    } catch (error) {
      // ignore
    }
  },
}));

export default useDocumentStore;
