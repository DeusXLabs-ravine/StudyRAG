import { create } from 'zustand';
import {
  getMyBuddyProfile,
  createBuddyProfile,
  updateBuddyProfile,
  deleteBuddyProfile,
  listPresets,
  listVoices,
  getBuddyUsage,
} from '../services/buddyService';

/**
 * buddyStore
 *
 * Holds the user's single active buddy profile, catalog (presets + voices),
 * and monthly usage snapshot. The live voice session state is kept in the
 * useBuddy hook (so it resets naturally when the session ends).
 */
const useBuddyStore = create((set, get) => ({
  profile: null,
  profileLoaded: false,
  loadingProfile: false,

  presets: [],
  voices: [],
  defaultVoice: 'warm-mid',
  catalogLoaded: false,

  usage: null,
  usageLoadedAt: 0,

  sessionContext: {
    sessionGoal: 'freeform', // 'feynman' | 'cofocus' | 'ambient' | 'freeform' | 'exam_prep'
    topicTag: null,
    documentId: null,
    documentTitle: null,
    documentFileType: null, // e.g. 'pdf', 'docx', 'note' — used to decide whether to mount the PDF viewer
    documentIsPdf: false,
    pageNumber: null,
    coReading: false,
  },

  // Transient UI state for the current live session
  live: {
    status: 'idle',     // idle | connecting | listening | speaking | ended | error
    mood: 'neutral',    // neutral | warm | amused | curious | encouraging | puzzled
    lastError: null,
    transcript: [],     // [{ role: 'buddy' | 'you', text, ts }]
    tools: [],          // [{ name, state: 'pending'|'done', result, ts }]
    sageHandoff: null,  // { reason }
    startedAt: null,
    elapsedSec: 0,
  },

  // ── Catalog ─────────────────────────────────────────────────
  loadCatalog: async () => {
    if (get().catalogLoaded) return;
    try {
      const [presets, voiceData] = await Promise.all([listPresets(), listVoices()]);
      set({
        presets: presets || [],
        voices: voiceData?.voices || [],
        defaultVoice: voiceData?.default || 'warm-mid',
        catalogLoaded: true,
      });
    } catch (err) {
      console.warn('[buddyStore] catalog load failed', err);
    }
  },

  // ── Profile ─────────────────────────────────────────────────
  loadProfile: async () => {
    if (get().loadingProfile) return;
    set({ loadingProfile: true });
    try {
      const profile = await getMyBuddyProfile();
      set({ profile, profileLoaded: true, loadingProfile: false });
    } catch (err) {
      console.warn('[buddyStore] profile load failed', err);
      set({ loadingProfile: false, profileLoaded: true });
    }
  },

  createProfile: async (payload) => {
    const profile = await createBuddyProfile(payload);
    set({ profile, profileLoaded: true });
    return profile;
  },

  updateProfile: async (patch) => {
    const current = get().profile;
    if (!current) throw new Error('No active buddy profile');
    const updated = await updateBuddyProfile(current.id, patch);
    set({ profile: updated });
    return updated;
  },

  deleteProfile: async () => {
    const current = get().profile;
    if (!current) return;
    await deleteBuddyProfile(current.id);
    set({ profile: null });
  },

  // ── Usage ───────────────────────────────────────────────────
  loadUsage: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().usageLoadedAt < 30_000 && get().usage) return get().usage;
    try {
      const usage = await getBuddyUsage();
      set({ usage, usageLoadedAt: now });
      return usage;
    } catch (err) {
      console.warn('[buddyStore] usage load failed', err);
      return null;
    }
  },

  // ── Session context (persisted per-session only) ───────────
  setSessionContext: (patch) =>
    set(state => ({ sessionContext: { ...state.sessionContext, ...patch } })),

  // ── Live session state bridge (called from useBuddy hook) ──
  setLive: (patch) => set(state => ({ live: { ...state.live, ...patch } })),
  resetLive: () => set({
    live: {
      status: 'idle',
      mood: 'neutral',
      lastError: null,
      transcript: [],
      tools: [],
      sageHandoff: null,
      startedAt: null,
      elapsedSec: 0,
    },
  }),
  appendTranscript: (entry) =>
    set(state => ({
      live: {
        ...state.live,
        transcript: [...state.live.transcript, { ts: Date.now(), ...entry }].slice(-500),
      },
    })),
  appendTool: (tool) =>
    set(state => ({
      live: {
        ...state.live,
        tools: [...state.live.tools, { ts: Date.now(), ...tool }].slice(-50),
      },
    })),
  updateToolResult: (name, result) =>
    set(state => {
      const tools = [...state.live.tools];
      for (let i = tools.length - 1; i >= 0; i--) {
        if (tools[i].name === name && tools[i].state === 'pending') {
          tools[i] = { ...tools[i], state: 'done', result };
          break;
        }
      }
      return { live: { ...state.live, tools } };
    }),
}));

export default useBuddyStore;
