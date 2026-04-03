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

const LIVE_MODEL = 'gemini-3.1-flash-live-preview';

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
  } = require('../config/gemini');

  const GEN_MODEL = 'gemini-3.1-flash';

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

      const contextHint = [toolContext.moduleTitle, toolContext.moduleTopic].filter(Boolean).join(' — ');
      const prompt = `Generate a Mermaid.js diagram for a live educational tutoring session.

Topic: ${args.topic || 'the current concept'}
Diagram type: ${args.diagramType || 'auto-choose: flowchart TD, graph LR, mindmap, or sequenceDiagram'}
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
      const diagramResult = await generateDiagramForTopic({
        topic: args.prompt,
        moduleId: toolContext.moduleId || null,
        documentId: toolContext.documentId || null,
        diagramType: 'image',
      });
      return {
        diagramId: diagramResult.id,
        prompt: args.prompt,
        explanation: `I've generated a visual of ${args.prompt}. Take a look at what just appeared on your screen.`,
      };
    }

    case 'search_external_knowledge': {
      const searchModel = getSearchGroundedModel('fast');
      const searchResult = await withRetryOnRateLimit(
        () => searchModel.generateContent(
          `Answer this question clearly and concisely (3–5 sentences) using accurate web sources:\n\n${args.query}\n\nBe educational and factual.`
        ),
        2, 0
      );
      const summary = searchResult.response.text();
      const chunks = searchResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter(c => c.web?.uri)
        .slice(0, 4)
        .map(c => ({ title: c.web.title || c.web.uri, url: c.web.uri }));
      return { summary, sources, sourceCount: sources.length };
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

      const contextHint = [toolContext.moduleTitle, toolContext.moduleTopic, args.topic].filter(Boolean).join(' — ');
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

function handleGeminiMessage(ws, msg, geminiSession, toolContext) {
  // ── Tool calls ────────────────────────────────────────────────
  if (msg.toolCall) {
    const calls = msg.toolCall.functionCalls;
    if (!calls?.length) return;

    // 1. Tell UI immediately (loading state)
    send(ws, { type: 'tool_call', calls });

    // 2. Ack to keep Gemini session alive during async execution
    geminiSession.sendToolResponse({
      functionResponses: calls.map(fc => ({
        id: fc.id,
        name: fc.name,
        response: { status: 'processing' },
      })),
    });

    // 3. Execute tool server-side, send real result back to both Gemini and client
    for (const fc of calls) {
      executeTool(fc.name, fc.args || {}, toolContext)
        .then(result => {
          // Tell the UI the real result (replaces loading state)
          send(ws, { type: 'tool_result', name: fc.name, result });
          // Tell Gemini so it can speak intelligently about what was produced
          geminiSession.sendToolResponse({
            functionResponses: [{ id: fc.id, name: fc.name, response: result }],
          });
        })
        .catch(err => {
          console.error(`[GeminiLive] Tool "${fc.name}" failed:`, err.message);
          send(ws, { type: 'tool_result', name: fc.name, result: { error: true } });
          geminiSession.sendToolResponse({
            functionResponses: [{ id: fc.id, name: fc.name, response: { error: err.message } }],
          });
        });
    }
    return;
  }

  // ── Server content ────────────────────────────────────────────
  const sc = msg.serverContent;
  if (!sc) return;

  if (sc.inputTranscription?.text) {
    send(ws, { type: 'user_transcript', text: sc.inputTranscription.text });
  }

  if (sc.modelTurn?.parts) {
    for (const part of sc.modelTurn.parts) {
      if (part.inlineData?.mimeType?.startsWith('audio/')) {
        send(ws, { type: 'audio', data: part.inlineData.data, mimeType: part.inlineData.mimeType });
      }
      if (part.text) {
        send(ws, { type: 'transcript', text: part.text });
      }
    }
  }

  if (sc.interrupted) {
    send(ws, { type: 'interrupted' });
  }

  if (sc.turnComplete) {
    send(ws, { type: 'turn_complete' });
  }
}

// ── Main connection handler ──────────────────────────────────────────────────

async function handleLiveConnection(ws, req) {
  const url = new URL(req.url, 'http://localhost');
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

  console.log(`[GeminiLive] Session started for user ${userId.slice(0, 8)}...`);

  // ── API key ─────────────────────────────────────────────────
  const apiKey = (geminiApiKeys && geminiApiKeys[0]) || geminiApiKey;
  if (!apiKey) {
    send(ws, { type: 'error', message: 'Gemini API key not configured on server.' });
    ws.close(1011, 'No API key');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  // ── Session state ───────────────────────────────────────────
  let geminiSession = null;
  let initialized = false;
  const audioBuffer = []; // buffer audio arriving before session is ready

  // ── Client message handler ──────────────────────────────────
  ws.on('message', async (rawData) => {
    let msg;
    try { msg = JSON.parse(rawData.toString()); } catch { return; }

    // ── Init: first message sets up the Gemini session ─────────
    if (msg.type === 'init') {
      if (initialized) return;
      initialized = true;

      const { systemInstruction = '', toolContext = {} } = msg;

      try {
        geminiSession = await ai.live.connect({
          model: LIVE_MODEL,
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
          },
          callbacks: {
            onopen: () => {
              console.log(`[GeminiLive] Gemini session open for user ${userId.slice(0, 8)}`);
              send(ws, { type: 'ready' });
              // Flush any audio that arrived before the session was ready
              for (const chunk of audioBuffer) {
                try { geminiSession.sendRealtimeInput({ audio: chunk }); } catch {}
              }
              audioBuffer.length = 0;
            },
            onmessage: (geminiMsg) => {
              handleGeminiMessage(ws, geminiMsg, geminiSession, toolContext);
            },
            onerror: (err) => {
              console.error('[GeminiLive] SDK error:', err?.message || err);
              send(ws, { type: 'error', message: err?.message || 'Gemini connection error' });
            },
            onclose: () => {
              console.log(`[GeminiLive] Gemini closed for user ${userId.slice(0, 8)}`);
              send(ws, { type: 'ended' });
            },
          },
        });
      } catch (err) {
        console.error('[GeminiLive] Session init error:', err.message);
        send(ws, { type: 'error', message: err.message || 'Failed to start AI session.' });
        ws.close(1011, 'Session init failed');
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
        geminiSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: msg.text }] }],
          turnComplete: true,
        });
      } catch {}
      return;
    }
  });

  // ── Cleanup ─────────────────────────────────────────────────
  ws.on('close', () => {
    console.log(`[GeminiLive] Client disconnected (user ${userId.slice(0, 8)})`);
    if (geminiSession) { try { geminiSession.close(); } catch {} }
  });

  ws.on('error', (err) => {
    console.error('[GeminiLive] Client WS error:', err.message);
    if (geminiSession) { try { geminiSession.close(); } catch {} }
  });
}

module.exports = { handleLiveConnection };
