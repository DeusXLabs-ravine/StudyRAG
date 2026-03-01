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
      set({ documents: Array.isArray(documents) ? documents : [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  uploadDocument: async (file) => {
    const fileName = file.name;
    const tempId = `temp_${fileName}_${Date.now()}`;

    // Optimistic placeholder — appears in the document list immediately
    set(state => ({
      error: null,
      documents: [
        {
          id: tempId,
          originalName: fileName,
          status: 'uploading',
          sourceType: 'file',
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          _isOptimistic: true,
          _uploadProgress: 0,
        },
        ...state.documents,
      ],
      uploads: {
        ...state.uploads,
        [fileName]: { progress: 0, status: 'uploading' },
      },
    }));

    try {
      const result = await documentService.uploadDocument(file, (progress) => {
        set(state => ({
          documents: state.documents.map(d =>
            d.id === tempId
              ? { ...d, status: progress >= 100 ? 'registering' : 'uploading', _uploadProgress: progress }
              : d
          ),
          uploads: {
            ...state.uploads,
            [fileName]: { progress, status: progress >= 100 ? 'registering' : 'uploading' },
          },
        }));
      });

      // Replace optimistic placeholder with real document
      set(state => ({
        documents: state.documents.map(d =>
          d.id === tempId ? { ...result, status: 'processing' } : d
        ),
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
      // Remove optimistic placeholder on failure
      set(state => ({
        error: error.message,
        documents: state.documents.filter(d => d.id !== tempId),
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

  addUrl: async (url) => {
    set({ error: null });
    try {
      const result = await documentService.registerUrl(url);
      set(state => ({
        documents: [...state.documents, { ...result, status: 'processing' }],
      }));
      return result;
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      set({ error: msg });
      throw error;
    }
  },

  addNote: async (title, content) => {
    set({ error: null });
    try {
      const result = await documentService.registerNote(title, content);
      set(state => ({
        documents: [...state.documents, { ...result, status: 'processing' }],
      }));
      return result;
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      set({ error: msg });
      throw error;
    }
  },

  togglePrimary: async (id, isPrimary) => {
    try {
      await documentService.togglePrimarySource(id, isPrimary);
      set(state => ({
        documents: state.documents.map(d =>
          d.id === id ? { ...d, isPrimarySource: isPrimary } : d
        ),
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  addTopic: async (topic, description) => {
    set({ error: null });
    try {
      const result = await documentService.registerTopic(topic, description);
      set(state => ({
        documents: [...state.documents, { ...result, status: 'processing' }],
      }));

      // Poll document status until it's ready or failed (background generation)
      get()._pollDocumentStatus(result.id);

      return result;
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      set({ error: msg });
      throw error;
    }
  },

  /**
   * Poll a document's status after background processing (topic research, URL import, etc.)
   * Updates the document in the store when status changes from 'processing'.
   */
  _pollDocumentStatus: (docId, intervalMs = 5000, maxAttempts = 120) => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const doc = await documentService.getDocument(docId);
        const status = doc?.status;

        // Update the document in the store
        set(state => ({
          documents: state.documents.map(d =>
            d.id === docId ? { ...d, ...doc } : d
          ),
        }));

        if (status === 'ready' || status === 'failed') {
          return; // Stop polling
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, intervalMs);
        }
      } catch {
        // Network error — retry silently
        if (attempts < maxAttempts) {
          setTimeout(poll, intervalMs * 2);
        }
      }
    };
    setTimeout(poll, intervalMs);
  },
}));

export default useDocumentStore;
