/**
 * Gemini Live API WebSocket Proxy
 *
 * Architecture:
 *   Browser ←──── WS (our protocol) ────→ This proxy ←──── @google/genai SDK ────→ Gemini Live
 *
 * Why proxy instead of direct browser → Gemini WS:
 *   • API keys never leave the server
 *   • Tool execution runs server-side (search grounding, image gen, structured output)
 *   • Auth/rate limiting enforced centrally
 *   • Railway WebSocket to our own server is reliable; direct WSS to Google had issues
 *
 * Protocol (JSON frames):
 *   Client → Server:
 *     { type:'init', systemInstruction, toolContext }   ← first message
 *     { type:'audio', data:<base64>, mimeType }
 *     { type:'text', text }
 *
 *   Server → Client:
 *     { type:'ready' }
 *     { type:'audio', data:<base64>, mimeType }
 *     { type:'transcript', text }          ← Sage text output
 *     { type:'user_transcript', text }     ← user voice transcription
 *     { type:'tool_call', calls }          ← optimistic UI update
 *     { type:'tool_result', name, result } ← real result for UI
 *     { type:'interrupted' }
 *     { type:'turn_complete' }
 *     { type:'error', message }
 *     { type:'ended' }
 */

'use strict';

const { GoogleGenAI } = require('@google/genai');
const { geminiApiKey, geminiApiKeys } = require('../config/env');
const { authCache } = require('../config/cache');
const supabase = require('../config/database');
const {
  buildFunctionResponse,
  extractServerContentEvents,
} = require('./geminiLiveProxyUtils');
const { getSubscriptionSnapshotForUser } = require('../services/subscriptionService');
const { getUsageCount, incrementUsage } = require('../middleware/tierAuth');

// Buddy mode integrations (lazy-required inside handlers to avoid circular boot)
const buddyPersona = require('./buddyPersonaService');
const buddyMemory  = require('./buddyMemoryService');
const vectorStore  = require('./vectorStore');

// Model cascade: try each in order until one connects successfully.
// 3.1 has better multi-part responses; 2.5-native-audio has proactive audio & async tools.
const LIVE_MODELS = [
  'gemini-3.1-flash-live-preview',
  'gemini-2.5-flash-native-audio-preview-12-2025',
];

// Keys currently in use by active Live sessions — exported so TTS can avoid them
const activeLiveKeys = new Set();

// ── Teacher tool declarations ────────────────────────────────────────────────

const TEACHER_TOOLS = [
  {
    name: 'render_diagram',
    description: 'Visualize a concept as a Mermaid.js diagram. Use this constantly — whenever explaining any process, hierarchy, cycle, or relationship. A real teacher uses the whiteboard.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'What to visualize — describe the concept or relationship.' },
        diagramType: { type: 'string', description: 'Preferred type: flowchart, graph, sequence, mindmap, timeline. Leave blank to auto-choose.' },
        title: { type: 'string', description: 'Short title for the diagram.' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'generate_illustration',
    description: 'Generate an AI illustration to visualize an abstract concept, analogy, or mental model.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed description of the educational illustration to generate.' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'search_external_knowledge',
    description: 'Search the web and research papers for real-time facts, statistics, current events, or to verify information.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'start_lightning_round',
    description: 'Generate a fast-paced quiz to test the student\'s understanding at the end of a section.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to quiz on.' },
      },
    },
  },
];

// ── Utilities ────────────────────────────────────────────────────────────────

function send(ws, obj) {
  const { WebSocket } = require('ws');
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

/**
 * Race a promise against a hard timeout. Use for any await in the init path
 * so a stalled supabase/embedding call cannot hang the WS handshake.
 * Returns the resolved value, or throws `Error(label + ' timed out after Xms')`.
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label || 'operation'} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

// ── Tool Execution ───────────────────────────────────────────────────────────

async function executeTool(name, args, toolContext) {
  const {
    getSearchGroundedModel,
    withRetryOnRateLimit,
    keyPool,
    resolveModel,
  } = require('../config/gemini');

  const GEN_MODEL = resolveModel('fast');

  switch (name) {

    case 'render_diagram': {
      const { SchemaType } = require('@google/generative-ai');
      const { genAI } = keyPool.getClient();
      const model = genAI.getGenerativeModel({
        model: GEN_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              mermaidCode: { type: SchemaType.STRING },
              title: { type: SchemaType.STRING },
              explanation: { type: SchemaType.STRING },
            },
            required: ['mermaidCode', 'title', 'explanation'],
          },
        },
      });

      const contextHint = [toolContext?.moduleTitle, toolContext?.moduleTopic].filter(Boolean).join(' — ');
      const prompt = `Generate a Mermaid.js diagram for a live educational tutoring session.

Topic: ${args?.topic || 'the current concept'}
Diagram type: ${args?.diagramType || 'auto-choose: flowchart TD, graph LR, mindmap, or sequenceDiagram'}
Educational context: ${contextHint || 'general lesson'}

Rules:
- Output raw Mermaid syntax ONLY — no triple-backtick fences
- Max 12 nodes for visual clarity
- Short, clear node labels
- explanation: 1-2 natural spoken sentences Sage can read aloud while pointing to the diagram`;

      const result = await withRetryOnRateLimit(() => model.generateContent(prompt), 3, 0);
      return JSON.parse(result.response.text());
    }

    case 'generate_illustration': {
      const { generateDiagramForTopic } = require('./diagramGenerationService');
      const illustrationPrompt = args?.prompt || args?.description || 'educational concept';
      const diagramResult = await generateDiagramForTopic({
        topic: illustrationPrompt,
        moduleId: toolContext?.moduleId || null,
        documentId: toolContext?.documentId || null,
        diagramType: 'image',
      });
      return {
        diagramId: diagramResult.id,
        prompt: illustrationPrompt,
        explanation: `I've generated a visual of ${illustrationPrompt}. Take a look at what just appeared on your screen.`,
      };
    }

    case 'search_external_knowledge': {
      const searchQuery = args?.query || 'educational topic';
      const searchModel = getSearchGroundedModel('fast');
      const searchResult = await withRetryOnRateLimit(
        () => searchModel.generateContent(
          `Answer this question clearly and concisely (3–5 sentences) using accurate web sources:\n\n${searchQuery}\n\nBe educational and factual.`
        ),
        2, 0
      );
      const summary = searchResult.response.text();
      const chunks = searchResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter(c => c.web?.uri)
        .slice(0, 4)
        .map(c => ({ title: c.web.title || c.web.uri, url: c.web.uri }));
      return { query: searchQuery, summary, sources, sourceCount: sources.length };
    }

    case 'start_lightning_round': {
      const { SchemaType } = require('@google/generative-ai');
      const { genAI } = keyPool.getClient();
      const model = genAI.getGenerativeModel({
        model: GEN_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              topic: { type: SchemaType.STRING },
              questions: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    question: { type: SchemaType.STRING },
                    answer: { type: SchemaType.STRING },
                    hint: { type: SchemaType.STRING },
                    difficulty: { type: SchemaType.STRING, enum: ['easy', 'medium', 'hard'] },
                  },
                  required: ['question', 'answer', 'difficulty'],
                },
              },
            },
            required: ['topic', 'questions'],
          },
        },
      });

      const contextHint = [toolContext?.moduleTitle, toolContext?.moduleTopic, args?.topic].filter(Boolean).join(' — ');
      const prompt = `Generate 5 lightning-round quiz questions for a live tutoring session.
Topic: ${contextHint || 'the current lesson'}
Rules: answerable in 1-4 words, 2 easy / 2 medium / 1 hard, factually correct, unambiguous answers.`;

      const result = await withRetryOnRateLimit(() => model.generateContent(prompt), 3, 0);
      return JSON.parse(result.response.text());
    }

    // ── Buddy-specific tools ─────────────────────────────────────
    case 'recall_memory': {
      const userId = toolContext?.userId;
      const profileId = toolContext?.buddyProfileId;
      if (!userId || !profileId) return { found: false, items: [] };
      const items = await buddyMemory.recall({
        userId,
        profileId,
        query: args?.query || '',
        limit: 6,
        threshold: 0.5,
      });
      return {
        found: items.length > 0,
        items: items.map(m => ({ kind: m.kind, content: m.content })),
      };
    }

    case 'glance_document': {
      const documentId = toolContext?.documentId;
      if (!documentId) {
        return { found: false, reason: 'no_document_open' };
      }
      try {
        const { searchDocumentChunks } = require('./ragService');
        if (typeof searchDocumentChunks !== 'function') {
          return { found: false, reason: 'rag_unavailable' };
        }
        const results = await searchDocumentChunks({
          documentId,
          query: args?.query || '',
          topK: 3,
        });
        return {
          found: (results?.length || 0) > 0,
          snippets: (results || []).slice(0, 3).map(r => ({
            text: (r.chunk_text || r.content || '').slice(0, 400),
            page: r.page_number ?? r.page ?? null,
          })),
        };
      } catch (err) {
        console.warn('[GeminiLive.glance_document] failed:', err.message);
        return { found: false, reason: 'error' };
      }
    }

    case 'save_note': {
      const sessionId = toolContext?.buddySessionId;
      const userId = toolContext?.userId;
      if (!sessionId || !userId) return { saved: false };
      const startedAt = toolContext?.buddySessionStart || Date.now();
      const offsetSec = Math.floor((Date.now() - startedAt) / 1000);
      const { error } = await supabase.from('buddy_notes').insert({
        session_id: sessionId,
        user_id: userId,
        content: String(args?.content || '').slice(0, 1000),
        tag: args?.tag ? String(args.tag).slice(0, 32) : null,
        at_offset_seconds: offsetSec,
      });
      if (error) {
        console.warn('[GeminiLive.save_note] insert error:', error.message);
        return { saved: false };
      }
      return { saved: true, offsetSec };
    }

    case 'suggest_sage_handoff': {
      // Pure client-side affordance — UI surfaces a "switch to Sage" chip.
      return { suggested: true, reason: String(args?.reason || '').slice(0, 200) };
    }

    default:
      return { status: 'unknown_tool' };
  }
}

// ── Message handler ──────────────────────────────────────────────────────────

function handleGeminiMessage(ws, msg, geminiSession, toolContext, userId, debugState) {
  const tag = `[GeminiLive ${(userId || '').slice(0, 8)}]`;

  // ── Tool calls ────────────────────────────────────────────────
  if (msg.toolCall) {
    const calls = msg.toolCall.functionCalls;
    if (!Array.isArray(calls) || !calls.length) return;

    // Normalise each call to guarantee name + args
    const safeCalls = calls.map(fc => ({
      id: fc.id,
      name: fc.name || 'unknown',
      args: fc.args || {},
    }));

    console.log(`${tag} Tool calls: ${safeCalls.map(c => c.name).join(', ')}`);

    // 1. Tell UI immediately (loading state)
    send(ws, { type: 'tool_call', calls: safeCalls });

    // 2. Execute tool server-side, send real result back to both Gemini and client
    for (const fc of safeCalls) {
      executeTool(fc.name, fc.args, toolContext)
        .then(result => {
          // Tell the UI the real result (replaces loading state)
          send(ws, { type: 'tool_result', name: fc.name, result });
          // Tell Gemini so it can speak intelligently about what was produced
          try {
            geminiSession.sendToolResponse({
              functionResponses: [buildFunctionResponse(fc, result)],
            });
          } catch (e) {
            console.error(`${tag} Failed to send tool response to Gemini:`, e.message);
          }
        })
        .catch(err => {
          console.error(`${tag} Tool "${fc.name}" failed:`, err.message);
          send(ws, { type: 'tool_result', name: fc.name, result: { error: true } });
          try {
            geminiSession.sendToolResponse({
              functionResponses: [buildFunctionResponse(fc, { error: err.message })],
            });
          } catch (e) {
            console.error(`${tag} Failed to send error response to Gemini:`, e.message);
          }
        });
    }
    return;
  }

  // ── GoAway (advance disconnection warning from Gemini) ────────
  if (msg.goAway) {
    const timeLeft = msg.goAway.timeLeft || 'unknown';
    console.log(`${tag} GoAway received — time left: ${timeLeft}`);
    send(ws, { type: 'goaway', timeLeft });
    return;
  }

  // ── Session resumption updates ────────────────────────────────
  if (msg.sessionResumptionUpdate) {
    // Store handle for potential reconnection (future enhancement)
    return;
  }

  // ── Setup complete (SDK handshake acknowledgement) ────────────
  if (msg.setupComplete) {
    console.log(`${tag} Setup complete — session ready for input`);
    if (typeof debugState.onSetupComplete === 'function') {
      debugState.onSetupComplete();
      debugState.onSetupComplete = null;
    }
    return;
  }

  // ── Server content ────────────────────────────────────────────
  const sc = msg.serverContent;
  if (!sc) {
    // Log unknown message shapes for debugging (first 10 per session)
    debugState.msgCount = (debugState.msgCount || 0) + 1;
    if (debugState.msgCount <= 10) {
      const keys = Object.keys(msg).filter(k => k !== 'serverContent' && k !== 'toolCall');
      if (keys.length) console.log(`${tag} Unhandled msg keys: ${keys.join(', ')}`);
    }
    return;
  }

  for (const event of extractServerContentEvents(sc)) {
    send(ws, event);
    // First-of-kind logs so we can tell at a glance if voice-in and voice-out
    // paths are each live for the session. Especially useful when audio input
    // seems to "listen" but Gemini never hears speech.
    if (event.type === 'user_transcript' && !debugState.sawUserTranscript) {
      debugState.sawUserTranscript = true;
      console.log(`${tag} ✓ First user_transcript from Gemini: "${(event.text || '').slice(0, 60)}"`);
    }
    if (event.type === 'audio' && !debugState.sawModelAudio) {
      debugState.sawModelAudio = true;
      console.log(`${tag} ✓ First model audio chunk from Gemini`);
    }
    // Capture transcript for later distillation (Buddy mode only)
    if (debugState.buddyState?.active) {
      if (event.type === 'transcript' && event.text) {
        debugState.buddyState.transcriptBuf.push(`Buddy: ${event.text}`);
      } else if (event.type === 'user_transcript' && event.text) {
        debugState.buddyState.transcriptBuf.push(`${debugState.buddyState.userName || 'User'}: ${event.text}`);
      }
    }
  }
}

// ── Main connection handler ──────────────────────────────────────────────────

async function handleLiveConnection(ws, req) {
  const url = new URL(req.url, 'https://studyrag.co');
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'Missing auth token');
    return;
  }

  // ── Setup gate ──────────────────────────────────────────────
  // WHY: ws library drops events with no listener. If we register `on('message')`
  // AFTER awaiting auth + tier check, any init frame the client sent immediately
  // on `ws.open` is silently dropped, and the client waits 25s for a `ready`
  // frame that never comes. We register the handler BEFORE any await and park
  // incoming frames on `setupDone` until session state is wired up.
  let setupDoneResolve;
  const setupDone = new Promise(r => { setupDoneResolve = r; });
  let setupFailed = false;

  // Forward-declared state used by the message handler below. Assigned during
  // the async setup block that follows. Declared here so the handler closure
  // captures the `let` slots and sees their final values after setup.
  let userId = null;
  let subscriptionSnapshot = null;
  let ai = null;
  let apiKey = null;
  let geminiSession = null;
  let initialized = false;
  let setupReady = false; // becomes true when Gemini emits setupComplete
  const audioBuffer = []; // buffer audio arriving before Gemini session is ready
  let audioSentCount = 0; // diagnostic: how many chunks forwarded to Gemini this session
  let audioDroppedCount = 0; // diagnostic: how many chunks dropped (buffer overflow etc)
  const AUDIO_BUFFER_MAX = 200; // ~50s @ 4096/16kHz; bound memory if Gemini never acks
  const buddyState = {
    active: false,
    profileId: null,
    profile: null,
    sessionRowId: null,
    startedAt: null,
    transcriptBuf: [],
    sessionMode: 'freeform',
    userName: 'friend',
    documentId: null,
    // PDF co-read state — pages are lazy-loaded on first page_update
    documentTitle: null,
    pagesCache: null,        // null = not loaded, [] = loaded but empty, or array of pages
    currentPage: null,       // last page we've told the model about
  };
  const debugState = { msgCount: 0, buddyState };
  let sessionStart = Date.now();

  // ── Client message handler (registered BEFORE async setup) ──
  ws.on('message', async (rawData) => {
    let msg;
    try { msg = JSON.parse(rawData.toString()); } catch { return; }

    // Park until setup is done. Any init/audio frames that arrived during
    // auth + tier-check wait here and then drain in arrival order.
    await setupDone;
    if (setupFailed) return;

    // Every inbound message — light log so we can tell if init frames are
    // even making it here. (Audio frames are chatty; skip them.)
    if (msg.type !== 'audio') {
      console.log(`[GeminiLive ${(userId || '').slice(0, 8)}] ← ${msg.type}${msg.mode ? ` (mode=${msg.mode})` : ''}`);
    }

    // ── Init: first message sets up the Gemini session ─────────
    if (msg.type === 'init') {
      if (initialized) return;
      initialized = true;

      const mode = msg.mode === 'buddy' ? 'buddy' : 'teacher';
      let systemInstruction = msg.systemInstruction || '';
      let toolContext = msg.toolContext || {};
      let toolList = TEACHER_TOOLS;
      let voiceName = 'Puck';

      const tag = `[GeminiLive ${userId.slice(0, 8)}]`;

      // ── Mode-specific setup ───────────────────────────────────
      if (mode === 'buddy') {
        // Gate: Max tier only
        if (!subscriptionSnapshot?.featureAccess?.canUseBuddy) {
          send(ws, { type: 'error', message: 'Study Buddy requires a Max plan. Please upgrade.' });
          ws.close(1008, 'Buddy requires Max');
          return;
        }

        // Optional hard-cap on minutes
        const limits = subscriptionSnapshot?.limits || {};
        const hardCap = Number(limits.buddyMinutesHard || 0);
        if (!subscriptionSnapshot?.isUnlimited && hardCap > 0) {
          const used = getUsageCount(userId, 'buddy_minutes');
          if (used >= hardCap) {
            send(ws, { type: 'error', message: `You've used ${used}/${hardCap} buddy minutes this month. Catch up next cycle.` });
            ws.close(1008, 'Buddy minutes exhausted');
            return;
          }
        }

        // Wrap all buddy-specific setup in a try so failures surface as a
        // proper error frame instead of silently hanging the WS until the
        // client times out.
        // ── Critical path (mirrors Teach Mode) ─────────────────
        // Same pattern as teacher mode: do the minimum needed to call
        // ai.live.connect(), then ship. Anything that isn't strictly required
        // to START the session (display name, memory recall, session-row
        // insert) is deferred and fired-and-forgotten after `ready` goes out.
        //
        // Why: supabase calls or embedding RPCs that stall would otherwise
        // hold the WS handshake for ~25s before the client gives up. Teach
        // Mode never had this problem because it makes zero DB calls in the
        // init path.
        try {
          const PROFILE_TIMEOUT_MS = 2_500;  // very tight — we'd rather use preset than wait

          const sessionContext = msg.sessionContext || {};
          // Normalize the session mode: frontend sends `sessionGoal`, backend
          // prompt composer reads `.mode`.
          if (sessionContext.sessionGoal && !sessionContext.mode) {
            sessionContext.mode = sessionContext.sessionGoal;
          }

          // 1. Load profile (tight timeout, preset fallback on any trouble)
          const profileId = msg.buddyProfileId || null;
          let profile = null;
          try {
            console.log(`${tag} [init] Resolving buddy profile${profileId ? ` id=${profileId.slice(0, 8)}` : ' (no id)'}…`);
            const query = profileId
              ? supabase.from('buddy_profiles').select('*').eq('id', profileId).eq('user_id', userId).is('deleted_at', null).maybeSingle()
              : supabase.from('buddy_profiles').select('*').eq('user_id', userId).is('deleted_at', null).limit(1).maybeSingle();
            const { data } = await withTimeout(query, PROFILE_TIMEOUT_MS, 'buddy_profiles lookup');
            profile = data || null;
          } catch (err) {
            console.warn(`${tag} profile lookup skipped (${err.message}) — using preset`);
          }
          if (!profile) {
            const preset = buddyPersona.resolvePreset('smart_friend');
            profile = {
              id: null,
              name: preset.name,
              pronouns: preset.pronouns,
              voice_id: preset.voice_id,
              personality: preset.personality,
              interests: [],
              field_affinities: [],
              relationship_mode: preset.relationship_mode,
              session_count: 0,
              preset_key: 'smart_friend',
            };
          }

          // 2. Use the email prefix as the opening userName. If we have a
          //    display_name in the auth cache, use that. We'll upgrade it
          //    later in the background — but for the FIRST greeting, this
          //    is what the model sees.
          const cachedAuth = authCache.get(token);
          const userName = (cachedAuth?.email ? cachedAuth.email.split('@')[0] : 'friend');

          // 3. Compose system instruction with EMPTY memories. The buddy has
          //    a `recall_memory` tool that can pull memory mid-session when
          //    the model actually needs it — no reason to block connect on it.
          systemInstruction = buddyPersona.composeSystemInstruction({
            profile,
            userName,
            memories: [],
            sessionContext,
          });
          toolList = buddyPersona.BUDDY_TOOLS;
          voiceName = buddyPersona.resolveVoiceName(profile.voice_id);

          // 4. Wire buddy session state BEFORE connect so tool handlers work
          //    immediately. sessionRowId gets filled in by the background job.
          buddyState.active = true;
          buddyState.profileId = profile.id;
          buddyState.profile = profile;
          buddyState.sessionRowId = null;
          buddyState.startedAt = Date.now();
          buddyState.sessionMode = sessionContext.sessionGoal || sessionContext.mode || 'freeform';
          buddyState.userName = userName;
          buddyState.documentId = sessionContext.documentId || null;
          buddyState.documentTitle = sessionContext.documentTitle || null;

          toolContext = {
            ...toolContext,
            userId,
            buddyProfileId: profile.id,
            buddySessionId: null, // upgraded when background insert completes
            buddySessionStart: buddyState.startedAt,
            documentId: sessionContext.documentId || null,
          };

          console.log(`${tag} Buddy ready to connect — profile=${profile.id || 'preset'} voice=${voiceName} user=${userName}`);

          // 5. Background: insert buddy_sessions row + try to upgrade userName
          //    from the profiles table. These WON'T block the WS handshake.
          //    If they fail we just log it — session still works.
          if (profile.id) {
            (async () => {
              try {
                const { data: sessionRow } = await supabase
                  .from('buddy_sessions')
                  .insert({
                    user_id: userId,
                    buddy_profile_id: profile.id,
                    mode: buddyState.sessionMode,
                    document_id: buddyState.documentId,
                  })
                  .select('id')
                  .single();
                if (sessionRow?.id) {
                  buddyState.sessionRowId = sessionRow.id;
                  toolContext.buddySessionId = sessionRow.id;
                  console.log(`${tag} [bg] buddy_sessions row=${sessionRow.id.slice(0, 8)}`);
                }
              } catch (err) {
                console.warn(`${tag} [bg] buddy_sessions insert failed:`, err.message);
              }
            })();
            (async () => {
              try {
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('display_name, full_name')
                  .eq('id', userId)
                  .maybeSingle();
                const upgraded = userProfile?.display_name
                  || userProfile?.full_name?.split(' ')?.[0];
                if (upgraded) {
                  buddyState.userName = upgraded;
                  console.log(`${tag} [bg] userName upgraded → ${upgraded}`);
                }
              } catch (err) {
                console.warn(`${tag} [bg] display_name lookup failed:`, err.message);
              }
            })();
          }
        } catch (err) {
          console.error(`${tag} Buddy init failed:`, err?.stack || err?.message || err);
          send(ws, {
            type: 'error',
            message: `Could not start Study Buddy: ${err?.message || 'unknown error'}`,
          });
          ws.close(1011, 'Buddy init error');
          return;
        }
      } else {
        // Teacher mode (original behavior — gate on canTeach + canUseLive)
        if (!subscriptionSnapshot?.featureAccess?.canTeach || !subscriptionSnapshot?.featureAccess?.canUseLive) {
          send(ws, { type: 'error', message: 'Teach Mode requires a Pro or Max plan. Please upgrade.' });
          ws.close(1008, 'Tier not allowed');
          return;
        }
        const limits = subscriptionSnapshot?.limits || {};
        if (!subscriptionSnapshot?.isUnlimited && typeof limits.live === 'number') {
          const used = getUsageCount(userId, 'live');
          if (used >= limits.live) {
            send(ws, { type: 'error', message: `You've used ${used}/${limits.live} live teaching sessions this month. Please upgrade for more.` });
            ws.close(1008, 'Usage limit reached');
            return;
          }
          incrementUsage(userId, 'live');
        }
      }

      // Try each model in the cascade until one connects
      let connectedModel = null;
      const PER_MODEL_TIMEOUT_MS = 10_000; // fail fast, leaves room to try next model
      for (const modelName of LIVE_MODELS) {
        try {
          console.log(`${tag} Trying model: ${modelName} (mode: ${mode})`);

          // IMPORTANT: ai.live.connect() resolves AFTER onopen fires.
          // So `geminiSession` is null inside onopen — we must NOT use it there.
          // All session methods (sendClientContent, sendRealtimeInput) are called
          // AFTER this await resolves, when geminiSession is assigned.
          const connectPromise = ai.live.connect({
            model: modelName,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
              systemInstruction: systemInstruction
                ? { parts: [{ text: systemInstruction }] }
                : undefined,
              tools: [{ functionDeclarations: toolList }],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              // Extend session beyond default 15 min with context compression
              contextWindowCompression: { slidingWindow: {} },
            },
            callbacks: {
              onopen: () => {
                console.log(`${tag} Gemini WS open for model: ${modelName}`);
                // NOTE: geminiSession is NOT yet assigned here.
                // Do NOT call geminiSession.send* in this callback.
              },
              onmessage: (geminiMsg) => {
                // By the time messages arrive, geminiSession IS assigned.
                try {
                  handleGeminiMessage(ws, geminiMsg, geminiSession, toolContext, userId, debugState);
                } catch (err) {
                  console.error(`${tag} Message handler error:`, err.message);
                }
              },
              onerror: (err) => {
                console.error(`${tag} SDK error:`, err?.message || err);
                send(ws, { type: 'error', message: err?.message || 'Gemini connection error' });
              },
              onclose: () => {
                const dur = ((Date.now() - sessionStart) / 1000).toFixed(1);
                console.log(`${tag} Gemini session closed after ${dur}s (model: ${connectedModel})`);
                send(ws, { type: 'ended' });
              },
            },
          });

          // Race the SDK connect against a per-model timeout so a hung upstream
          // can't hold the client-side connect timer hostage.
          geminiSession = await Promise.race([
            connectPromise,
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`${modelName} connect timed out after ${PER_MODEL_TIMEOUT_MS}ms`)),
                PER_MODEL_TIMEOUT_MS,
              ),
            ),
          ]);

          // ── Session is now live — geminiSession is assigned ──────
          connectedModel = modelName;
          console.log(`${tag} Connected with model: ${modelName}`);

          // Tell client we're ready — client starts mic AFTER this. We still
          // buffer audio until Gemini emits setupComplete because the Live API
          // silently drops realtime input sent before setup finishes.
          send(ws, { type: 'ready' });

          // Kickstart + audio flush: BOTH defer until setupComplete.
          debugState.onSetupComplete = () => {
            setupReady = true;

            // 1) Flush any audio that arrived between `ready` and `setupComplete`.
            if (audioBuffer.length > 0) {
              console.log(`${tag} setupComplete — flushing ${audioBuffer.length} buffered audio chunks`);
              for (const chunk of audioBuffer) {
                try {
                  geminiSession.sendRealtimeInput({ audio: chunk });
                  audioSentCount++;
                } catch (e) {
                  console.warn(`${tag} flush sendRealtimeInput failed:`, e.message);
                }
              }
              audioBuffer.length = 0;
            } else {
              console.log(`${tag} setupComplete — no buffered audio, ready for mic`);
            }

            // 2) Kickstart: Gemini 3.1 does NOT support proactive audio — it
            //    waits for input. This triggers the greeting.
            try {
              const kickstart = mode === 'buddy'
                ? buddyPersona.composeKickstart({
                    profile: buddyState.profile,
                    userName: buddyState.userName,
                    sessionContext: msg.sessionContext || {},
                  })
                : 'Hello! Please begin the lesson.';
              geminiSession.sendRealtimeInput({ text: kickstart });
              console.log(`${tag} Sent ${mode} kickstart`);
            } catch (e) {
              console.warn(`${tag} Kickstart sendRealtimeInput failed:`, e.message);
            }
          };

          break; // success — stop trying
        } catch (err) {
          console.warn(`${tag} Model ${modelName} failed: ${err.message}`);
          // If this is the last model, send error
          if (modelName === LIVE_MODELS[LIVE_MODELS.length - 1]) {
            console.error(`${tag} All models exhausted`);
            send(ws, { type: 'error', message: 'All AI models unavailable. Please try again shortly.' });
            ws.close(1011, 'All models failed');
            return;
          }
          // Otherwise try next model
        }
      }
      return;
    }

    // ── Audio ────────────────────────────────────────────────
    if (msg.type === 'audio') {
      if (!msg.data) return;
      const chunk = { data: msg.data, mimeType: msg.mimeType || 'audio/pcm;rate=16000' };

      // Gate: Gemini Live silently drops realtime input sent before
      // setupComplete. Buffer everything that arrives before then.
      if (!geminiSession || !setupReady) {
        if (audioBuffer.length >= AUDIO_BUFFER_MAX) {
          audioBuffer.shift();
          audioDroppedCount++;
        }
        audioBuffer.push(chunk);
        return;
      }

      try {
        geminiSession.sendRealtimeInput({ audio: chunk });
        audioSentCount++;
        // Heartbeat log every 40 chunks (~10s of audio at 256ms/chunk).
        // Confirms the pipeline is live without spamming.
        if (audioSentCount === 1 || audioSentCount % 40 === 0) {
          console.log(`[GeminiLive ${(userId || '').slice(0,8)}] audio forwarded → Gemini (total=${audioSentCount}${audioDroppedCount ? `, dropped=${audioDroppedCount}` : ''})`);
        }
      } catch (e) {
        console.warn('[GeminiLive] sendRealtimeInput audio failed:', e.message);
      }
      return;
    }

    // ── Text ─────────────────────────────────────────────────
    if (msg.type === 'text') {
      if (!geminiSession || !msg.text?.trim()) return;
      try {
        // Gemini 3.1 restricts sendClientContent to initial history seeding.
        // sendRealtimeInput accepts text for mid-session input on all models.
        geminiSession.sendRealtimeInput({ text: msg.text });
      } catch (e) {
        console.warn(`[GeminiLive] sendRealtimeInput text failed:`, e.message);
      }
      return;
    }

    // ── Context update (Situational awareness) ────────────────
    // Frontend tells us the user's current location, active document, 
    // or UI state. Buddy gets a silent nudge so they stay in sync.
    if (msg.type === 'context_update') {
      if (!geminiSession || !buddyState.active) return;
      const { path, title, metadata } = msg;
      
      // Update local state if a document is identified
      if (metadata?.documentId) {
        buddyState.documentId = metadata.documentId;
        buddyState.documentTitle = title || metadata.documentTitle || buddyState.documentTitle;
      }

      try {
        const cue = `(system note: the user is now on the "${title || path}" page${metadata?.documentTitle ? ` looking at "${metadata.documentTitle}"` : ''}. Current path: ${path}. Stay aware of this context if they ask "what's this?" or "where am I?". Don't announce it unless relevant.)`;
        geminiSession.sendRealtimeInput({ text: cue });
      } catch (e) {
        console.warn(`[GeminiLive] context_update failed:`, e.message);
      }
      return;
    }

    // ── Page update (Buddy co-read) ──────────────────────────
    // Frontend tells us the user just flipped to page N of the picked PDF.
    // We fetch that page's extracted text (lazy, once per session) and feed
    // it to Buddy as a silent stage cue so they can reference what the user
    // is looking at. Never echoed to the user transcript.
    if (msg.type === 'page_update') {
      if (!geminiSession || !buddyState.active || !buddyState.documentId) return;
      const pageNumber = Math.max(1, Math.floor(Number(msg.pageNumber) || 0));
      if (!pageNumber || pageNumber === buddyState.currentPage) return;
      try {
        if (!buddyState.pagesCache) {
          buddyState.pagesCache = await vectorStore.getDocumentPages(buddyState.documentId)
            .catch(() => []);
        }
        const page = (buddyState.pagesCache || []).find(p => p.pageNumber === pageNumber);
        buddyState.currentPage = pageNumber;
        const snippet = (page?.text || '').replace(/\s+/g, ' ').trim().slice(0, 900);
        const heading = page?.heading ? ` — "${page.heading}"` : '';
        const cue = snippet
          ? `(system note: the user just turned to page ${pageNumber}${heading}. What they're reading right now says: "${snippet}${snippet.length >= 900 ? '…' : ''}". Don't read it back to them — just hold it in mind in case they ask about it. Keep doing what you were doing.)`
          : `(system note: the user just turned to page ${pageNumber} of "${buddyState.documentTitle || 'the document'}". I couldn't pull the text for this page, so you don't have the contents — just acknowledge the page number if they bring it up.)`;
        geminiSession.sendRealtimeInput({ text: cue });
      } catch (e) {
        console.warn(`[GeminiLive] page_update failed:`, e.message);
      }
      return;
    }
  });

  // ── Async setup (runs AFTER message handler is registered) ──
  // Everything below this point could theoretically race with an incoming init
  // frame; the setup gate above ensures the handler parks until we're done.
  try {
    const cached = authCache.get(token);
    if (cached) {
      userId = cached.id;
    } else {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        setupFailed = true;
        setupDoneResolve();
        ws.close(1008, 'Invalid token');
        return;
      }
      userId = user.id;
      authCache.set(token, { id: user.id, email: user.email });
    }
  } catch {
    setupFailed = true;
    setupDoneResolve();
    ws.close(1011, 'Auth error');
    return;
  }

  // ── Tier check (deferred until we see the init frame so we know the mode) ──
  try {
    const authUser = authCache.get(token);
    subscriptionSnapshot = await getSubscriptionSnapshotForUser(userId, authUser?.email);
  } catch (err) {
    console.error('[GeminiLive] Tier check error:', err.message);
    // Allow connection on DB errors so paying users aren't blocked
  }

  sessionStart = Date.now();
  console.log(`[GeminiLive] Session started for user ${userId.slice(0, 8)}...`);

  // ── API key ─────────────────────────────────────────────────
  // Pick from the END of the array so TTS (which iterates from the front) is
  // unlikely to collide with the long-lived Live WebSocket session.
  apiKey = (geminiApiKeys?.length > 1
    ? geminiApiKeys[geminiApiKeys.length - 1]
    : geminiApiKeys?.[0]) || geminiApiKey;
  if (!apiKey) {
    setupFailed = true;
    setupDoneResolve();
    send(ws, { type: 'error', message: 'Gemini API key not configured on server.' });
    ws.close(1011, 'No API key');
    return;
  }

  activeLiveKeys.add(apiKey);
  ai = new GoogleGenAI({ apiKey });

  // ── Keepalive ping (Railway drops idle WS after 60s) ────────
  const { WebSocket: WS } = require('ws');
  const pingInterval = setInterval(() => {
    if (ws.readyState === WS.OPEN) ws.ping();
  }, 25_000);

  // ── Open the gate ───────────────────────────────────────────
  // Any init/audio frames that arrived during auth + tier-check now drain
  // through the message handler in arrival order.
  setupDoneResolve();

  // ── Cleanup ─────────────────────────────────────────────────
  // `cleanup` runs on close/error. For Buddy sessions it also finalizes the
  // session: distill transcript → save memories, update session row, bump
  // profile stats, and increment the monthly minute counter.
  let cleanupRan = false;
  const cleanup = async () => {
    if (cleanupRan) return;
    cleanupRan = true;
    clearInterval(pingInterval);
    activeLiveKeys.delete(apiKey);
    if (geminiSession) { try { geminiSession.close(); } catch {} }

    if (!buddyState.active) return;

    const durationSec = Math.max(0, Math.floor((Date.now() - (buddyState.startedAt || Date.now())) / 1000));
    const durationMin = durationSec > 0 ? Math.max(1, Math.ceil(durationSec / 60)) : 0;
    const transcript = buddyState.transcriptBuf.join('\n');
    const tag = `[GeminiLive ${(userId || '').slice(0, 8)} buddy-finalize]`;

    // 1. Distill (only if we actually have enough transcript to be worth it)
    let distilled = { items: [], summary: null };
    if (transcript.trim().length > 200) {
      try {
        distilled = await buddyMemory.distill({
          transcript,
          userName: buddyState.userName,
        });
      } catch (err) {
        console.warn(`${tag} distill failed:`, err.message);
      }
    }

    // 2. Update session row (ended_at, duration, summary)
    if (buddyState.sessionRowId) {
      try {
        await supabase
          .from('buddy_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: durationSec,
            summary: distilled.summary || null,
          })
          .eq('id', buddyState.sessionRowId);
      } catch (err) {
        console.warn(`${tag} session update failed:`, err.message);
      }
    }

    // 3. Persist distilled memories
    if (distilled.items?.length && buddyState.profileId) {
      try {
        const saved = await buddyMemory.save({
          userId,
          profileId: buddyState.profileId,
          items: distilled.items,
          sessionId: buddyState.sessionRowId,
        });
        console.log(`${tag} memory saved — inserted=${saved.inserted} bumped=${saved.bumped}`);
      } catch (err) {
        console.warn(`${tag} memory save failed:`, err.message);
      }
    }

    // 4. Bump profile lifetime stats (last_session_at, session_count, minutes)
    if (buddyState.profileId) {
      try {
        await supabase.rpc('bump_buddy_profile_stats', {
          p_profile_id: buddyState.profileId,
          p_duration_seconds: durationSec,
        });
      } catch (err) {
        console.warn(`${tag} stats bump failed:`, err.message);
      }
    }

    // 5. Tick the monthly minute counter (one tick per minute used)
    for (let i = 0; i < durationMin; i++) {
      try { incrementUsage(userId, 'buddy_minutes'); } catch {}
    }

    console.log(`${tag} finalized — ${durationSec}s, ${distilled.items?.length || 0} memories`);
  };

  ws.on('close', () => {
    const dur = ((Date.now() - sessionStart) / 1000).toFixed(1);
    console.log(`[GeminiLive] Client disconnected (user ${userId.slice(0, 8)}) after ${dur}s`);
    cleanup().catch(err => console.error('[GeminiLive] cleanup error:', err.message));
  });

  ws.on('error', (err) => {
    console.error('[GeminiLive] Client WS error:', err.message);
    cleanup().catch(e => console.error('[GeminiLive] cleanup error:', e.message));
  });
}

module.exports = { handleLiveConnection, activeLiveKeys };
