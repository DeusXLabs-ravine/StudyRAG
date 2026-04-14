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
  }
}

// ── Main connection handler ──────────────────────────────────────────────────

async function handleLiveConnection(ws, req) {
  const url = new URL(req.url, 'https://studyrag.co');
  const token = url.searchParams.get('token');

  // ── Auth ────────────────────────────────────────────────────
  if (!token) {
    ws.close(1008, 'Missing auth token');
    return;
  }

  let userId;
  try {
    const cached = authCache.get(token);
    if (cached) {
      userId = cached.id;
    } else {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) { ws.close(1008, 'Invalid token'); return; }
      userId = user.id;
      authCache.set(token, { id: user.id, email: user.email });
    }
  } catch {
    ws.close(1011, 'Auth error');
    return;
  }

  // ── Tier check ──────────────────────────────────────────────
  try {
    const authUser = authCache.get(token);
    const subscription = await getSubscriptionSnapshotForUser(userId, authUser?.email);
    const limits = subscription.limits;

    if (!subscription.featureAccess.canTeach || !subscription.featureAccess.canUseLive) {
      send(ws, { type: 'error', message: 'Teach Mode requires a Pro or Max plan. Please upgrade.' });
      ws.close(1008, 'Tier not allowed');
      return;
    }

    // Check numeric session cap (e.g. 20 for Pro, 60 for Max).
    // Admin-unlimited users bypass this cap.
    if (!subscription.isUnlimited && typeof limits.live === 'number') {
      const used = getUsageCount(userId, 'live');
      if (used >= limits.live) {
        send(ws, { type: 'error', message: `You've used ${used}/${limits.live} live teaching sessions this month. Please upgrade for more.` });
        ws.close(1008, 'Usage limit reached');
        return;
      }
      incrementUsage(userId, 'live');
    }
  } catch (err) {
    console.error('[GeminiLive] Tier check error:', err.message);
    // Allow connection on DB errors to not block paying users
  }

  const sessionStart = Date.now();
  console.log(`[GeminiLive] Session started for user ${userId.slice(0, 8)}...`);

  // ── API key ─────────────────────────────────────────────────
  // Pick a key from the END of the array so TTS (which iterates from the front)
  // is unlikely to collide with the long-lived Live WebSocket session.
  const apiKey = (geminiApiKeys?.length > 1
    ? geminiApiKeys[geminiApiKeys.length - 1]
    : geminiApiKeys?.[0]) || geminiApiKey;
  if (!apiKey) {
    send(ws, { type: 'error', message: 'Gemini API key not configured on server.' });
    ws.close(1011, 'No API key');
    return;
  }

  // Track which key is reserved so TTS can avoid it
  activeLiveKeys.add(apiKey);

  const ai = new GoogleGenAI({ apiKey });

  // ── Session state ───────────────────────────────────────────
  let geminiSession = null;
  let initialized = false;
  const audioBuffer = []; // buffer audio arriving before session is ready
  const debugState = { msgCount: 0 }; // per-session debug counters

  // ── Keepalive ping (Railway drops idle WS after 60s) ────────
  // Send a ping every 25s so Railway's proxy sees activity.
  // Browsers automatically respond with pong frames.
  const { WebSocket: WS } = require('ws');
  const pingInterval = setInterval(() => {
    if (ws.readyState === WS.OPEN) ws.ping();
  }, 25_000);

  // ── Client message handler ──────────────────────────────────
  ws.on('message', async (rawData) => {
    let msg;
    try { msg = JSON.parse(rawData.toString()); } catch { return; }

    // ── Init: first message sets up the Gemini session ─────────
    if (msg.type === 'init') {
      if (initialized) return;
      initialized = true;

      const { systemInstruction = '', toolContext = {} } = msg;

      const tag = `[GeminiLive ${userId.slice(0, 8)}]`;

      // Try each model in the cascade until one connects
      let connectedModel = null;
      for (const modelName of LIVE_MODELS) {
        try {
          console.log(`${tag} Trying model: ${modelName}`);

          // IMPORTANT: ai.live.connect() resolves AFTER onopen fires.
          // So `geminiSession` is null inside onopen — we must NOT use it there.
          // All session methods (sendClientContent, sendRealtimeInput) are called
          // AFTER this await resolves, when geminiSession is assigned.
          geminiSession = await ai.live.connect({
            model: modelName,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
              },
              systemInstruction: systemInstruction
                ? { parts: [{ text: systemInstruction }] }
                : undefined,
              tools: [{ functionDeclarations: TEACHER_TOOLS }],
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

          // ── Session is now live — geminiSession is assigned ──────
          connectedModel = modelName;
          console.log(`${tag} Connected with model: ${modelName}`);

          // Tell client we're ready
          send(ws, { type: 'ready' });

          // Flush any audio that arrived before the session was ready
          if (audioBuffer.length > 0) {
            console.log(`${tag} Flushing ${audioBuffer.length} buffered audio chunks`);
            for (const chunk of audioBuffer) {
              try { geminiSession.sendRealtimeInput({ audio: chunk }); } catch {}
            }
            audioBuffer.length = 0;
          }

          // Kickstart: send an initial user turn so Gemini starts speaking.
          // Gemini 3.1 does NOT support proactive audio — it waits for input.
          // This triggers the greeting from the system instruction.
          // IMPORTANT: defer until setupComplete so the model is actually ready.
          debugState.onSetupComplete = () => {
            try {
              // Gemini 3.1 restricts sendClientContent to initial history seeding.
              // Use sendRealtimeInput for text input so the model actually receives it.
              geminiSession.sendRealtimeInput({ text: 'Hello! Please begin the lesson.' });
              console.log(`${tag} Sent kickstart message — Sage should begin speaking`);
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
      const chunk = { data: msg.data, mimeType: msg.mimeType || 'audio/pcm;rate=16000' };
      if (!geminiSession) {
        audioBuffer.push(chunk);
      } else {
        try { geminiSession.sendRealtimeInput({ audio: chunk }); } catch {}
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
  });

  // ── Cleanup ─────────────────────────────────────────────────
  const cleanup = () => {
    clearInterval(pingInterval);
    activeLiveKeys.delete(apiKey);
    if (geminiSession) { try { geminiSession.close(); } catch {} }
  };

  ws.on('close', () => {
    const dur = ((Date.now() - sessionStart) / 1000).toFixed(1);
    console.log(`[GeminiLive] Client disconnected (user ${userId.slice(0, 8)}) after ${dur}s`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[GeminiLive] Client WS error:', err.message);
    cleanup();
  });
}

module.exports = { handleLiveConnection, activeLiveKeys };
