import { create } from 'zustand';

const useTutorStore = create((set, get) => ({
  // Keyed by moduleId to cache per-module conversations
  conversations: {}, // { [moduleId]: { messages: [], greetingLoaded: boolean } }
  tutorInput: '',
  tutorLoading: false,

  // Get or initialize conversation for a module
  getConversation: (moduleId) => {
    return get().conversations[moduleId] || { messages: [], greetingLoaded: false };
  },

  // Set greeting for a module (only if not already loaded)
  setGreeting: (moduleId, greetingText) => {
    const conv = get().conversations[moduleId];
    if (conv?.greetingLoaded) return; // Already have greeting, skip
    set(state => ({
      conversations: {
        ...state.conversations,
        [moduleId]: {
          messages: [{ role: 'tutor', text: greetingText, timestamp: Date.now() }],
          greetingLoaded: true,
        }
      }
    }));
  },

  // Add a message to a module's conversation
  addMessage: (moduleId, message) => {
    set(state => {
      const conv = state.conversations[moduleId] || { messages: [], greetingLoaded: true };
      return {
        conversations: {
          ...state.conversations,
          [moduleId]: {
            ...conv,
            messages: [...conv.messages, message],
          }
        }
      };
    });
  },

  setTutorInput: (input) => set({ tutorInput: input }),
  setTutorLoading: (loading) => set({ tutorLoading: loading }),

  // Clear conversation for a module (e.g., when module content changes)
  clearConversation: (moduleId) => {
    set(state => {
      const { [moduleId]: _, ...rest } = state.conversations;
      return { conversations: rest };
    });
  },
}));

export default useTutorStore;
