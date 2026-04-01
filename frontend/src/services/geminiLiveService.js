/**
 * GeminiLiveService
 * WebSocket client for the Gemini Live API (BidiGenerateContent).
 * Uses ephemeral tokens generated server-side — no API keys in the browser.
 *
 * Protocol reference:
 *   https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket
 */

const GEMINI_LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL = 'models/gemini-3.1-flash-live-preview';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const CONNECT_TIMEOUT_MS = 20000;

// ── Audio conversion helpers ──────────────────────────────────────────────────

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function pcm16ToFloat32(pcm16Buffer) {
  const int16Array = new Int16Array(pcm16Buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 0x7fff;
  }
  return float32Array;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

// ── GeminiLiveSession ─────────────────────────────────────────────────────────

export class GeminiLiveSession {
  constructor({ token, authToken, systemInstruction, toolContext, onTranscript, onUserTranscript, onStateChange, onError, onToolCall, onToolResult }) {
    this.token = token;
    this._authToken = authToken || '';  // JWT for calling /api/gemini/execute-tool
    this.toolContext = toolContext || {}; // { moduleTitle, moduleTopic, moduleId, documentId }
    this.systemInstruction = systemInstruction;
    this.onTranscript = onTranscript || (() => { });
    this.onUserTranscript = onUserTranscript || (() => { });
    this.onStateChange = onStateChange || (() => { });
    this.onError = onError || (() => { });
    this.onToolCall = onToolCall || (() => { });
    this.onToolResult = onToolResult || (() => { }); // called with real result after hybrid execution

    this.ws = null;
    this.sessionId = null;
    this.audioCtx = null;
    this.outputQueue = [];
    this.isPlayingAudio = false;
    this.state = 'idle';
    this._closed = false;
    this._setupDone = false;
    this._micStream = null;
    this._micProcessor = null;
    this._micInputCtx = null;
  }

  async start() {
    if (!this.token) {
      this.onError('No live session token — cannot connect.');
      return;
    }
    this._setState('connecting');
    console.log('[GeminiLive] Starting session...');
    try {
      await this._connect();
      await this._initMic();
      this._setState('listening');
    } catch (err) {
      console.error('[GeminiLive] Start error:', err);
      this._setState('ended');
      this.onError(err.message || 'Failed to start live session');
      this.stop();
    }
  }

  stop() {
    this._closed = true;
    this._stopMic();
    this._stopAudio();
    if (this.ws) {
      try { this.ws.close(); } catch (_) { }
      this.ws = null;
    }
    this._setState('ended');
  }

  /**
   * Send a text message as a user turn.
   * Uses clientContent so the model treats it as a proper conversational turn.
   */
  sendTextTurn(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.onUserTranscript(text);
    this._sendJSON({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    });
  }

  _connect() {
    return new Promise((resolve, reject) => {
      // Ephemeral token goes in the URL as access_token
      const url = `${GEMINI_LIVE_WS}?access_token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(url);

      const timer = setTimeout(() => {
        if (!this._setupDone) {
          if (this.ws) this.ws.close();
          reject(new Error('Connection timed out — check model availability and token.'));
        }
      }, CONNECT_TIMEOUT_MS);

      this.ws.onopen = () => {
        console.log('[GeminiLive] WS open — sending setup...');
        const setup = {
          model: MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          },
          tools: [{ functionDeclarations: TEACHER_TOOLS }],
        };
        // Only include systemInstruction in setup if NOT embedded in the token.
        // If it was passed at token-generation time it's already scoped in.
        // Sending it again here is harmless — the setup message takes precedence.
        if (this.systemInstruction) {
          setup.systemInstruction = { parts: [{ text: this.systemInstruction }] };
        }
        this._sendJSON({ setup });
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.setupComplete !== undefined) {
          this._setupDone = true;
          // Capture session ID if provided (used for debugging / resumption)
          if (msg.sessionId) this.sessionId = msg.sessionId;
          clearTimeout(timer);
          console.log('[GeminiLive] Setup complete. sessionId:', this.sessionId);
          resolve();
        } else {
          this._handleMessage(msg);
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timer);
        if (!this._closed) reject(new Error('WebSocket connection failed.'));
      };

      this.ws.onclose = (event) => {
        clearTimeout(timer);
        if (!this._closed) {
          this._setState('ended');
          const reason = event.code === 1006 ? 'Network error (abnormal closure)' : `Closed (code ${event.code})`;
          this.onError(reason);
          if (!this._setupDone) reject(new Error(reason));
        }
      };
    });
  }

  _sendJSON(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  _handleMessage(msg) {
    // ── Tool calls ──────────────────────────────────────────────
    if (msg.toolCall) {
      const calls = msg.toolCall.functionCalls;
      if (!calls?.length) return;

      console.log('[GeminiLive] Tool call:', calls[0].name, calls[0].args);

      // Step 1: send immediate ack so Sage stays live while we execute
      this._sendJSON({
        toolResponse: {
          functionResponses: calls.map(fc => ({
            name: fc.name,
            id: fc.id,
            response: { output: { status: 'processing' } },
          })),
        },
      });

      // Step 2: notify UI optimistically (shows loading state in tool panel)
      this.onToolCall(msg.toolCall);

      // Step 3: execute via the backend hybrid model, then send real result back
      this._executeToolsHybrid(calls);
    }

    // ── Server content ──────────────────────────────────────────
    const sc = msg.serverContent;
    if (!sc) return;

    if (sc.inputTranscription?.text) {
      this.onUserTranscript(sc.inputTranscription.text);
    }

    const parts = sc.modelTurn?.parts;
    if (parts?.length) {
      let hasAudio = false;
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
          hasAudio = true;
          this.outputQueue.push(base64ToArrayBuffer(part.inlineData.data));
        }
        if (part.text) {
          this.onTranscript(part.text);
        }
      }
      if (hasAudio) {
        this._setState('teaching');
        this._drainAudioQueue();
      }
    }

    if (sc.interrupted) {
      this._stopAudio();
      this._setState('listening');
    }

    if (sc.turnComplete && !this.isPlayingAudio) {
      this._setState('listening');
    }
  }

  // ── Audio output ──────────────────────────────────────────────────────────

  async _drainAudioQueue() {
    if (this.isPlayingAudio || this.outputQueue.length === 0) return;
    this.isPlayingAudio = true;

    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

    const playNext = () => {
      if (this._closed || this.outputQueue.length === 0) {
        this.isPlayingAudio = false;
        if (!this._closed) this._setState('listening');
        return;
      }
      const float32 = pcm16ToFloat32(this.outputQueue.shift());
      const buf = this.audioCtx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      buf.getChannelData(0).set(float32);
      const src = this.audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(this.audioCtx.destination);
      src.onended = playNext;
      src.start();
    };

    playNext();
  }

  _stopAudio() {
    this.isPlayingAudio = false;
    this.outputQueue = [];
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) { }
      this.audioCtx = null;
    }
  }

  // ── Microphone input ──────────────────────────────────────────────────────

  async _initMic() {
    this._micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: INPUT_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this._micInputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
    const source = this._micInputCtx.createMediaStreamSource(this._micStream);
    this._micProcessor = this._micInputCtx.createScriptProcessor(4096, 1, 1);

    this._micProcessor.onaudioprocess = (e) => {
      if (this._closed || this.ws?.readyState !== WebSocket.OPEN) return;
      const pcm16 = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
      // Correct format: realtimeInput.mediaChunks (array), not realtimeInput.audio
      this._sendJSON({
        realtimeInput: {
          mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: arrayBufferToBase64(pcm16) }],
        },
      });
    };

    source.connect(this._micProcessor);
    this._micProcessor.connect(this._micInputCtx.destination);
  }

  _stopMic() {
    if (this._micProcessor) {
      try { this._micProcessor.disconnect(); } catch (_) { }
      this._micProcessor = null;
    }
    if (this._micInputCtx) {
      try { this._micInputCtx.close(); } catch (_) { }
      this._micInputCtx = null;
    }
    if (this._micStream) {
      this._micStream.getTracks().forEach(t => t.stop());
      this._micStream = null;
    }
  }

  _setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange(state);
    }
  }

  // ── Hybrid tool execution ─────────────────────────────────────────────────
  // Calls the backend /api/gemini/execute-tool endpoint which uses a standard
  // generative model to handle everything the Live API can't:
  //   • Structured Mermaid output (schema-constrained JSON)
  //   • Real-time web search grounding
  //   • Image generation via Cloudinary pipeline
  //   • Structured quiz question sets
  //
  // After execution, the REAL result is sent back to the Live session via a
  // second toolResponse so Sage can speak intelligently about what was produced.

  async _executeToolsHybrid(calls) {
    const API_BASE = import.meta.env.VITE_API_URL || '/api';

    await Promise.all(calls.map(async (fc) => {
      let result;
      try {
        const res = await fetch(`${API_BASE}/gemini/execute-tool`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this._authToken || ''}`,
          },
          body: JSON.stringify({
            toolName: fc.name,
            args: fc.args || {},
            context: this.toolContext || {},
          }),
        });
        const data = await res.json();
        result = data.result || { status: 'done' };
        console.log(`[GeminiLive/Hybrid] ${fc.name} result:`, result);
      } catch (err) {
        console.error(`[GeminiLive/Hybrid] ${fc.name} fetch failed:`, err.message);
        result = { error: true, explanation: 'Tool execution failed, continuing session.' };
      }

      // Notify the UI with real results (replaces the loading state)
      this.onToolResult?.({ name: fc.name, id: fc.id, result });

      // Send real result back to Live session — Sage uses this to speak about it
      this._sendJSON({
        toolResponse: {
          functionResponses: [{
            name: fc.name,
            id: fc.id,
            response: { output: result },
          }],
        },
      });
    }));
  }
}

// ── Teacher tool declarations ────────────────────────────────────────────────

const TEACHER_TOOLS = [
  {
    name: 'render_diagram',
    description: 'Visualize a concept using a Mermaid.js diagram. Use this whenever explaining cycles, hierarchies, processes, or relationships between concepts.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Valid Mermaid.js diagram code.' },
        title: { type: 'string', description: 'Short title for the diagram.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'generate_illustration',
    description: 'Generate an AI illustration to help visualize a complex or abstract topic.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed descriptive prompt for the illustration.' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'search_external_knowledge',
    description: 'Search textbooks, research papers, and web resources to verify facts or bring in external perspectives.',
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
    description: 'Start a fast-paced interactive quiz to test the student\'s understanding of a topic.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic to quiz on.' },
      },
    },
  },
];

// ── System instruction builder ───────────────────────────────────────────────

export function buildTeachingInstruction({ moduleTitle, moduleTopic, content, teachingLevel = 'intermediate', userName }) {
  const levelGuide = {
    dummy: 'everyday language, zero jargon, pure analogies — explain as if to a curious 8-year-old',
    beginner: 'clear definitions, simple examples, define every term on first use',
    intermediate: 'standard academic language, balanced depth',
    advanced: 'technical and rigorous — explore nuances, edge cases, and deeper implications',
  };

  return `You are Sage, a world-class live AI tutor conducting a real-time audio teaching session.

STUDENT: ${userName || 'the student'} | LEVEL: ${teachingLevel} (${levelGuide[teachingLevel] || levelGuide.intermediate})
LESSON: ${moduleTitle || 'this lesson'}${moduleTopic ? ` — ${moduleTopic}` : ''}

TEACHING RULES:
- You are speaking live — keep sentences short and natural, as a real teacher would
- Never just lecture. Use the whiteboard: call render_diagram constantly for any process, hierarchy, or concept map
- For analogies and mental images, call generate_illustration
- If unsure about a fact or want external depth, call search_external_knowledge
- End each section with a check-in question before moving on
- If the student seems confused, slow down — use a simpler analogy before re-explaining
- Use the student's name (${userName || 'friend'}) occasionally for personal connection
- Adapt complexity to their teaching level at all times

TOOL USAGE MANDATE:
- render_diagram: Use within the FIRST 2 minutes and after every major concept
- generate_illustration: Use for abstract ideas, analogies, and mental models
- search_external_knowledge: Use when citing statistics, current events, or technical facts
- start_lightning_round: Use at end of each major section to test retention

LESSON CONTENT (ground all teaching in this):
${content ? content.substring(0, 12000) : 'No content loaded — teach from general knowledge on the topic.'}

Start by greeting ${userName || 'the student'} warmly (1-2 sentences), then open with the most interesting or surprising fact about ${moduleTitle || 'this topic'} to hook their attention. Then ask if they are ready to begin.`;
}
