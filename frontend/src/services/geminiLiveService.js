/**
 * GeminiLiveService
 * Client-side WebSocket connection to our backend proxy.
 * The backend uses @google/genai SDK to talk to Gemini Live — API keys stay server-side.
 *
 * Protocol frames (JSON):
 *   → init, audio, text
 *   ← ready, audio, transcript, user_transcript, tool_call, tool_result,
 *      interrupted, turn_complete, error, ended
 */

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const CONNECT_TIMEOUT_MS = 25000;

// ── Audio helpers ─────────────────────────────────────────────────────────────

function floatTo16BitPCM(float32Array) {
  const buf = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function pcm16ToFloat32(pcm16Buffer) {
  const i16 = new Int16Array(pcm16Buffer);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x7fff;
  return f32;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return buf;
}

// ── Derive backend WS URL ─────────────────────────────────────────────────────

export function getLiveWsUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // https://backend.railway.app/api  →  wss://backend.railway.app/live
    return apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '/live');
  }
  // Dev: frontend is on :5173, backend on :5000
  return 'ws://localhost:5000/live';
}

// ── GeminiLiveSession ─────────────────────────────────────────────────────────

export class GeminiLiveSession {
  constructor({
    wsUrl,
    authToken,
    systemInstruction,
    toolContext,
    onTranscript,
    onUserTranscript,
    onStateChange,
    onError,
    onToolCall,
    onToolResult,
  }) {
    this.wsUrl = wsUrl;
    this.authToken = authToken;
    this.systemInstruction = systemInstruction;
    this.toolContext = toolContext || {};
    this.onTranscript = onTranscript || (() => {});
    this.onUserTranscript = onUserTranscript || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});
    this.onToolCall = onToolCall || (() => {});
    this.onToolResult = onToolResult || (() => {});

    this.ws = null;
    this.audioCtx = null;
    this.outputQueue = [];
    this.isPlayingAudio = false;
    this.state = 'idle';
    this._closed = false;
    this._micStream = null;
    this._micProcessor = null;
    this._micInputCtx = null;
  }

  async start() {
    this._setState('connecting');
    try {
      await this._connect();
      await this._initMic();
    } catch (err) {
      console.error('[GeminiLive] Start error:', err);
      this._setState('ended');
      this.onError(err.message || 'Failed to start session');
      this.stop();
    }
  }

  stop() {
    this._closed = true;
    this._stopMic();
    this._stopAudio();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this._setState('ended');
  }

  sendTextTurn(text) {
    if (!text?.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.onUserTranscript(text);
    this._send({ type: 'text', text });
  }

  // ── Private: connection ────────────────────────────────────────────────────

  _connect() {
    return new Promise((resolve, reject) => {
      const url = `${this.wsUrl}?token=${encodeURIComponent(this.authToken)}`;
      console.log('[GeminiLive] Connecting to backend proxy...');
      this.ws = new WebSocket(url);

      const timer = setTimeout(() => {
        if (this.state === 'connecting') {
          try { this.ws?.close(); } catch {}
          reject(new Error('Connection timed out — backend may be starting up, try again.'));
        }
      }, CONNECT_TIMEOUT_MS);

      this.ws.onopen = () => {
        // Send init immediately — backend creates the Gemini session
        this._send({
          type: 'init',
          systemInstruction: this.systemInstruction,
          toolContext: this.toolContext,
        });
      };

      this.ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === 'ready') {
          clearTimeout(timer);
          this._setState('listening');
          resolve();
        } else {
          this._handleMessage(msg);
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Could not reach backend WebSocket — check server is running.'));
      };

      this.ws.onclose = (event) => {
        clearTimeout(timer);
        if (!this._closed) {
          this._setState('ended');
          // 1001 = server going away (Railway redeploy), 1006 = network drop
          const reason =
            event.code === 1006 ? 'Connection lost — check your internet connection' :
            event.code === 1001 ? 'Server restarting — please start a new session' :
            event.reason || `Connection closed (${event.code})`;
          this.onError(reason);
          reject(new Error(reason));
        }
      };
    });
  }

  _send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  // ── Private: message routing ───────────────────────────────────────────────

  _handleMessage(msg) {
    switch (msg.type) {
      case 'audio':
        this._queueAudio(msg.data);
        this._setState('teaching');
        this._drainAudioQueue();
        break;

      case 'transcript':
        this.onTranscript(msg.text || '');
        break;

      case 'user_transcript':
        this.onUserTranscript(msg.text || '');
        break;

      case 'tool_call':
        // Optimistic: show loading state in UI immediately
        this.onToolCall({ functionCalls: msg.calls || [] });
        break;

      case 'tool_result':
        // Real result from backend hybrid executor — update UI
        this.onToolResult({ name: msg.name, result: msg.result || {} });
        break;

      case 'interrupted':
        this._stopAudio();
        this._setState('listening');
        break;

      case 'turn_complete':
        if (!this.isPlayingAudio) this._setState('listening');
        break;

      case 'error':
        this.onError(msg.message || 'Unknown error');
        this._setState('error');
        break;

      case 'ended':
        if (!this._closed) this._setState('ended');
        break;
    }
  }

  // ── Private: audio output ──────────────────────────────────────────────────

  _queueAudio(base64Data) {
    try {
      this.outputQueue.push(base64ToArrayBuffer(base64Data));
    } catch {}
  }

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
      try {
        const f32 = pcm16ToFloat32(this.outputQueue.shift());
        const buf = this.audioCtx.createBuffer(1, f32.length, OUTPUT_SAMPLE_RATE);
        buf.getChannelData(0).set(f32);
        const src = this.audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(this.audioCtx.destination);
        src.onended = playNext;
        src.start();
      } catch {
        playNext(); // skip bad chunk
      }
    };

    playNext();
  }

  _stopAudio() {
    this.isPlayingAudio = false;
    this.outputQueue = [];
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
  }

  // ── Private: microphone input ──────────────────────────────────────────────

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
      const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
      this._send({
        type: 'audio',
        data: arrayBufferToBase64(pcm),
        mimeType: 'audio/pcm;rate=16000',
      });
    };

    source.connect(this._micProcessor);
    this._micProcessor.connect(this._micInputCtx.destination);
  }

  _stopMic() {
    if (this._micProcessor) { try { this._micProcessor.disconnect(); } catch {} this._micProcessor = null; }
    if (this._micInputCtx) { try { this._micInputCtx.close(); } catch {} this._micInputCtx = null; }
    if (this._micStream) { this._micStream.getTracks().forEach(t => t.stop()); this._micStream = null; }
  }

  _setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange(state);
    }
  }
}

// ── System instruction builder ────────────────────────────────────────────────

export function buildTeachingInstruction({ moduleTitle, moduleTopic, content, teachingLevel = 'intermediate', userName }) {
  const levelGuide = {
    dummy:        'everyday language, zero jargon — explain like to a curious 8-year-old',
    beginner:     'clear definitions, simple examples, define every term on first use',
    intermediate: 'standard academic language, balanced depth',
    advanced:     'technical and rigorous — edge cases, nuances, theoretical depth',
  };

  return `You are Sage, a world-class live AI tutor conducting a real-time audio teaching session.

STUDENT: ${userName || 'the student'} | LEVEL: ${teachingLevel} (${levelGuide[teachingLevel] || levelGuide.intermediate})
LESSON: ${moduleTitle || 'this lesson'}${moduleTopic ? ` — ${moduleTopic}` : ''}

TEACHING RULES:
- You are speaking live — keep sentences short and natural, as a real teacher would speak
- Use the whiteboard constantly: call render_diagram for any process, hierarchy, or concept map
- For analogies and mental images, call generate_illustration
- For real-time facts or to verify information, call search_external_knowledge
- End each section with a check-in question before moving on
- Use the student's name (${userName || 'friend'}) occasionally for personal connection
- Adapt complexity to their teaching level at all times

TOOL USAGE MANDATE (use these — don't just talk):
- render_diagram: within the first 2 minutes AND after every major concept
- generate_illustration: for abstract ideas, analogies, and mental models
- search_external_knowledge: when citing statistics, current events, or technical facts
- start_lightning_round: at the end of each major section to test retention

LESSON CONTENT:
${content ? content.substring(0, 12000) : 'Teach from general knowledge on this topic.'}

Start with a 1-2 sentence warm greeting using the student's name, then give the single most surprising or counterintuitive fact about this topic to hook their attention. Then ask if they're ready to begin.`;
}
