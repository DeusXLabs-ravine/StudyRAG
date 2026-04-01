const express = require('express');
const router = express.Router();
const { geminiApiKey, geminiApiKeys } = require('../config/env');
const {
  getSearchGroundedModel,
  withRetryOnRateLimit,
  keyPool,
} = require('../config/gemini');

// ─── Constants ────────────────────────────────────────────────────────────────

// Confirmed model string from https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview
const LIVE_MODEL = 'gemini-3.1-flash-live-preview';
const EPHEMERAL_TOKEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/${LIVE_MODEL}:generateEphemeralToken`;

// Standard model used for hybrid tool execution (structured output, search, images)
const GEN_MODEL = 'gemini-3.1-flash';

// ─── Ephemeral Token ──────────────────────────────────────────────────────────

/**
 * POST /api/gemini/live-token
 * Generates a 30-minute ephemeral token for the Gemini Live WebSocket.
 * Keeps real API keys off the browser — the client uses the token as ?access_token=<value>
 */
router.post('/live-token', async (req, res) => {
  const key = (geminiApiKeys && geminiApiKeys[0]) || geminiApiKey;
  if (!key) {
    return res.status(500).json({ error: { message: 'Gemini API key not configured on server.' } });
  }

  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const body = {
    model: `models/${LIVE_MODEL}`,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
      },
    },
    expireTime,
  };

  let response;
  try {
    response = await fetch(EPHEMERAL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error('[GeminiLive] Network error reaching token endpoint:', networkErr.message);
    return res.status(502).json({ error: { message: 'Could not reach Gemini API.' } });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    console.error('[GeminiLive] Non-JSON token response (HTTP', response.status, '):', text.slice(0, 500));
    return res.status(response.status || 502).json({
      error: { message: `Gemini token API returned HTTP ${response.status} — likely invalid model or key.` },
    });
  }

  let data;
  try { data = await response.json(); } catch { data = {}; }

  if (!response.ok) {
    console.error('[GeminiLive] Token generation failed:', JSON.stringify(data));
    return res.status(response.status).json({
      error: { message: data?.error?.message || `Token generation failed (HTTP ${response.status})` },
    });
  }

  if (!data.value) {
    console.error('[GeminiLive] Token response missing .value:', JSON.stringify(data));
    return res.status(502).json({ error: { message: 'Token response malformed — missing value field.' } });
  }

  console.log('[GeminiLive] Ephemeral token issued, expires:', data.expireTime || expireTime);
  res.json({ token: data.value, expireTime: data.expireTime || expireTime, model: LIVE_MODEL });
});

// ─── Hybrid Tool Executor ─────────────────────────────────────────────────────

/**
 * POST /api/gemini/execute-tool
 *
 * The hybrid bridge: when the Live API fires a tool call, the frontend sends it here.
 * A standard generative model executes it properly and returns real results.
 *
 * WHY HYBRID:
 *   Live API blind spots:        Standard model covers:
 *   ─ No structured JSON output  → Schema-constrained generation for diagrams & quizzes
 *   ─ No Google Search grounding → getSearchGroundedModel for real-time web facts
 *   ─ No image generation        → generateDiagramForTopic (Cloudinary pipeline)
 *   ─ No URL context             → Standard model with urlContext tool
 *
 * The real result is sent back to the Live session as the actual toolResponse
 * so Sage can speak intelligently about it (not just "processing...").
 *
 * Body: { toolName: string, args: object, context: { moduleTitle?, moduleTopic?, moduleId?, documentId? } }
 * Returns: { toolName, result: object }
 */
router.post('/execute-tool', async (req, res) => {
  const { toolName, args = {}, context = {} } = req.body;

  if (!toolName) {
    return res.status(400).json({ error: { message: 'toolName is required.' } });
  }

  console.log(`[GeminiLive/HybridTool] Executing: ${toolName}`, args);

  try {
    switch (toolName) {

      // ── render_diagram ──────────────────────────────────────────────────────
      // Live API describes WHAT to visualize in natural language.
      // Standard model with schema output generates VALID, pedagogically-structured Mermaid code.
      case 'render_diagram': {
        const { SchemaType } = require('@google/generative-ai');
        if (!keyPool) throw new Error('Gemini key pool not ready');
        const { genAI } = keyPool.getClient();
        const model = genAI.getGenerativeModel({
          model: GEN_MODEL,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                mermaidCode: {
                  type: SchemaType.STRING,
                  description: 'Valid Mermaid.js diagram code — no backtick fences',
                },
                title: { type: SchemaType.STRING },
                explanation: {
                  type: SchemaType.STRING,
                  description: '1-2 spoken sentences Sage can say while pointing to the diagram',
                },
              },
              required: ['mermaidCode', 'title', 'explanation'],
            },
          },
        });

        const contextHint = [context.moduleTitle, context.moduleTopic].filter(Boolean).join(' — ');
        const prompt = `Generate a Mermaid.js diagram for a live educational tutoring session.

Topic: ${args.topic || args.code || 'the current concept being taught'}
Preferred diagram type: ${args.diagramType || 'auto-choose best: flowchart TD, graph LR, or sequenceDiagram'}
Educational context: ${contextHint || 'general study session'}

Rules:
- Output raw Mermaid syntax ONLY — no triple-backtick fences, no markdown wrapper
- Max 12 nodes for visual clarity
- Use short, clear node labels (phrases not sentences)
- 'explanation' should be natural spoken language Sage can read aloud (1-2 sentences)
- Make it pedagogically useful — show relationships, flows, or hierarchies that aid understanding`;

        const result = await withRetryOnRateLimit(() => model.generateContent(prompt), 3, 0);
        const parsed = JSON.parse(result.response.text());

        return res.json({
          toolName,
          result: {
            mermaidCode: parsed.mermaidCode,
            title: parsed.title,
            explanation: parsed.explanation,
          },
        });
      }

      // ── generate_illustration ───────────────────────────────────────────────
      // Live API provides a descriptive prompt; backend generates the actual image
      // via the existing diagram/image generation pipeline (Cloudinary + Gemini image model).
      case 'generate_illustration': {
        const { generateDiagramForTopic } = require('../services/diagramGenerationService');
        const prompt = args.prompt || args.description || 'educational concept visualization';

        const diagramResult = await generateDiagramForTopic({
          topic: prompt,
          moduleId: context.moduleId || null,
          documentId: context.documentId || null,
          diagramType: 'image',
        });

        return res.json({
          toolName,
          result: {
            diagramId: diagramResult.id,
            prompt,
            status: 'generated',
            explanation: `I've created a visual of ${prompt}. Take a look at what just appeared.`,
          },
        });
      }

      // ── search_external_knowledge ───────────────────────────────────────────
      // Live API has no real-time web access or URL context.
      // Standard model with Google Search grounding retrieves current, cited information.
      case 'search_external_knowledge': {
        const query = args.query || '';
        if (!query) {
          return res.json({ toolName, result: { summary: 'No query provided.', sources: [] } });
        }

        const searchModel = getSearchGroundedModel('fast');
        const searchResult = await withRetryOnRateLimit(
          () => searchModel.generateContent(
            `Answer this question clearly and concisely (3–5 sentences) using accurate web sources:\n\n${query}\n\nBe educational and factual. If the answer depends on context (country, year, etc.), note that.`
          ),
          2,
          0
        );

        const summary = searchResult.response.text();
        const groundingChunks =
          searchResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
          .filter(c => c.web?.uri)
          .slice(0, 4)
          .map(c => ({ title: c.web.title || c.web.uri, url: c.web.uri }));

        return res.json({
          toolName,
          result: { summary, sources, sourceCount: sources.length },
        });
      }

      // ── start_lightning_round ───────────────────────────────────────────────
      // Live API cannot produce structured JSON output — it only outputs audio.
      // Standard model with schema constraints generates a valid question set
      // that the frontend can render as an interactive quiz UI.
      case 'start_lightning_round': {
        const { SchemaType } = require('@google/generative-ai');
        if (!keyPool) throw new Error('Gemini key pool not ready');
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
                      difficulty: {
                        type: SchemaType.STRING,
                        enum: ['easy', 'medium', 'hard'],
                      },
                    },
                    required: ['question', 'answer', 'difficulty'],
                  },
                },
              },
              required: ['topic', 'questions'],
            },
          },
        });

        const contextHint = [context.moduleTitle, context.moduleTopic, args.topic]
          .filter(Boolean).join(' — ');
        const prompt = `Generate 5 lightning-round quiz questions for a live tutoring session.

Topic: ${contextHint || 'the current lesson topic'}

Rules:
- Each question must be answerable in 1–4 words or a short phrase
- Distribution: 2 easy, 2 medium, 1 hard
- Questions must be directly tied to the topic
- Hints should guide without revealing the answer
- Answers must be unambiguous and factually correct`;

        const result = await withRetryOnRateLimit(() => model.generateContent(prompt), 3, 0);
        const parsed = JSON.parse(result.response.text());

        return res.json({
          toolName,
          result: {
            topic: parsed.topic,
            questions: parsed.questions,
            questionCount: parsed.questions.length,
          },
        });
      }

      default:
        return res.status(400).json({ error: { message: `Unknown tool: "${toolName}"` } });
    }
  } catch (err) {
    console.error(`[GeminiLive/HybridTool] "${toolName}" failed:`, err.message);
    // Return graceful failure — Live session continues even if a tool errors
    return res.status(500).json({
      error: { message: err.message || `Tool "${toolName}" execution failed.` },
      toolName,
      result: { error: true, explanation: 'The tool hit a snag — let\'s keep going.' },
    });
  }
});

module.exports = router;
