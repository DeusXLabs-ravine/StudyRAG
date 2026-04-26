import { useRef, useState, useCallback, useEffect } from 'react';
import { GeminiLiveSession } from '../services/geminiLiveService';
import { resolveLiveWsUrl } from '../services/apiBase';
import useAuthStore from '../store/authStore';
import useBuddyStore from '../store/buddyStore';

/**
 * useBuddy
 *
 * Thin wrapper around GeminiLiveSession that:
 *   - Sends { mode: 'buddy', buddyProfileId, sessionContext } in the init frame
 *   - Mirrors live status/mood/transcript/tool calls into useBuddyStore so
 *     the BuddyOrb + BuddyTranscript can subscribe without prop-drilling
 *   - Derives a coarse "mood" from recent tool/transcript activity
 */
export default function useBuddy() {
  const sessionRef = useRef(null);
  const [connecting, setConnecting] = useState(false);

  const setLive = useBuddyStore(s => s.setLive);
  const resetLive = useBuddyStore(s => s.resetLive);
  const appendTranscript = useBuddyStore(s => s.appendTranscript);
  const appendTool = useBuddyStore(s => s.appendTool);
  const updateToolResult = useBuddyStore(s => s.updateToolResult);
  const sessionContext = useBuddyStore(s => s.sessionContext);
  const profile = useBuddyStore(s => s.profile);

  const start = useCallback(async (overrides = {}) => {
    if (sessionRef.current || connecting) return;
    if (!profile?.id) {
      setLive({ status: 'error', lastError: 'Your buddy profile is not ready yet.' });
      return;
    }
    setConnecting(true);
    resetLive();
    setLive({ status: 'connecting', startedAt: Date.now() });

    const authToken = useAuthStore.getState().getAccessToken() || '';
    const wsUrl = resolveLiveWsUrl({ envApiUrl: import.meta.env.VITE_API_URL });

    const ctx = { ...sessionContext, ...overrides };

    const session = new GeminiLiveSession({
      wsUrl,
      authToken,
      mode: 'buddy',
      buddyProfileId: profile.id,
      sessionContext: ctx,
      // The real systemInstruction is composed server-side from the stored
      // profile; we only send hints here. Backend ignores this field in buddy mode.
      systemInstruction: '',
      toolContext: {},
      onStateChange: (s) => {
        if (s === 'connecting') setLive({ status: 'connecting' });
        else if (s === 'listening') setLive({ status: 'listening', mood: 'neutral' });
        else if (s === 'teaching') setLive({ status: 'speaking', mood: 'warm' });
        else if (s === 'ended') setLive({ status: 'ended' });
        else if (s === 'error') setLive({ status: 'error' });
      },
      onTranscript: (text) => {
        if (!text) return;
        appendTranscript({ role: 'buddy', text });
      },
      onUserTranscript: (text) => {
        if (!text) return;
        appendTranscript({ role: 'you', text });
      },
      onToolCall: (payload) => {
        const calls = payload?.functionCalls || [];
        for (const call of calls) {
          appendTool({ name: call.name, state: 'pending', args: call.args || {} });
          // Mood hints from tool name
          if (call.name === 'suggest_sage_handoff') setLive({ mood: 'curious' });
          else if (call.name === 'save_note') setLive({ mood: 'encouraging' });
          else if (call.name === 'recall_memory') setLive({ mood: 'warm' });
        }
      },
      onToolResult: (payload) => {
        if (!payload?.name) return;
        updateToolResult(payload.name, payload.result || {});
        if (payload.name === 'suggest_sage_handoff') {
          setLive({ sageHandoff: { reason: payload.result?.reason || '' } });
        }
      },
      onError: (msg) => {
        setLive({ status: 'error', lastError: msg });
      },
    });

    sessionRef.current = session;
    try {
      await session.start();
    } catch {
      // error surfaced via onError
    } finally {
      setConnecting(false);
    }
  }, [profile?.id, sessionContext, connecting, resetLive, setLive, appendTranscript, appendTool, updateToolResult]);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setLive({ status: 'ended' });
  }, [setLive]);

  const sendText = useCallback((text) => {
    if (!text?.trim()) return;
    sessionRef.current?.sendTextTurn(text);
  }, []);

  const sendPageUpdate = useCallback((pageNumber) => {
    const n = Math.floor(Number(pageNumber) || 0);
    if (n < 1) return;
    sessionRef.current?.sendPageUpdate?.(n);
  }, []);

  const sendContextUpdate = useCallback((ctx) => {
    sessionRef.current?.sendContextUpdate?.(ctx);
  }, []);

  // Safety cleanup on unmount
  useEffect(() => () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
  }, []);

  // Tick elapsedSec while live
  const status = useBuddyStore(s => s.live.status);
  const startedAt = useBuddyStore(s => s.live.startedAt);
  useEffect(() => {
    if (status !== 'listening' && status !== 'speaking') return;
    const id = setInterval(() => {
      setLive({ elapsedSec: Math.floor((Date.now() - (startedAt || Date.now())) / 1000) });
    }, 1000);
    return () => clearInterval(id);
  }, [status, startedAt, setLive]);

  return { start, stop, sendText, sendPageUpdate, sendContextUpdate, connecting };
}
