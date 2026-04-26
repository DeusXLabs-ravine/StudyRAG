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
    listenOnly = false,
    mode,             // 'teacher' (default) | 'buddy'
    buddyProfileId,   // only when mode === 'buddy'
    sessionContext,   // only when mode === 'buddy' — free-form object
  }) {
    this.wsUrl = wsUrl;
    this.authToken = authToken;
    this.systemInstruction = systemInstruction;
    this.toolContext = toolContext || {};
    this.listenOnly = listenOnly;
    this.mode = mode === 'buddy' ? 'buddy' : 'teacher';
    this.buddyProfileId = buddyProfileId || null;
    this.sessionContext = sessionContext || null;
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
    this._hasReceivedAudio = false;
    this._nudgeTimer = null;
    this._micStream = null;
    this._micProcessor = null;
    this._micInputCtx = null;
  }

  async start() {
    console.log('[GeminiLive] Starting session...');
    this._setState('connecting');
    try {
      console.log('[GeminiLive] Step 1: Connecting to WebSocket...');
      await this._connect();
      console.log('[GeminiLive] Step 1: WebSocket connected and ready.');

      if (!this.listenOnly) {
        console.log('[GeminiLive] Step 2: Initializing Microphone...');
        await this._initMic();
        console.log('[GeminiLive] Step 2: Microphone initialized.');
      }

      console.log('[GeminiLive] Session active — waiting for Sage to respond...');
    } catch (err) {
      console.error('[GeminiLive] Start error:', err);
      this._setState('ended');
      this.onError(err.message || 'Failed to start session');
      this.stop();
    }
  }

  stop() {
    this._closed = true;
    clearTimeout(this._nudgeTimer);
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
      let settled = false;

      const timer = setTimeout(() => {
        if (this.state === 'connecting') {
          try { this.ws?.close(); } catch {}
          if (!settled) { settled = true; reject(new Error('Connection timed out — backend may be starting up, try again.')); }
        }
      }, CONNECT_TIMEOUT_MS);

      this.ws.onopen = () => {
        console.log(`[GeminiLive] WebSocket open, sending init (mode=${this.mode})...`);
        const initFrame = {
          type: 'init',
          mode: this.mode,
          systemInstruction: this.systemInstruction,
          toolContext: this.toolContext,
        };
        if (this.mode === 'buddy') {
          initFrame.buddyProfileId = this.buddyProfileId;
          initFrame.sessionContext = this.sessionContext || {};
        }
        this._send(initFrame);
      };

      let msgCount = 0;
      this.ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === 'ready') {
          clearTimeout(timer);
          console.log('[GeminiLive] Received ready from proxy.');
          this._setState('listening');
          if (!settled) { settled = true; resolve(); }
        } else {
          msgCount++;
          // Log first few messages for debugging
          if (msgCount <= 5 || msg.type === 'error') {
            console.log(`[GeminiLive] Message #${msgCount}: type=${msg.type}`);
          }
          this._handleMessage(msg);
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timer);
        if (!settled) { settled = true; reject(new Error('Could not reach backend WebSocket — check server is running.')); }
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
          if (!settled) { settled = true; reject(new Error(reason)); }
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
        if (msg.data) {
          if (!this._hasReceivedAudio) {
            this._hasReceivedAudio = true;
            clearTimeout(this._nudgeTimer);
            console.log('[GeminiLive] First audio chunk received — Sage is speaking!');
          }
          this._queueAudio(msg.data);
          this._setState('teaching');
          this._drainAudioQueue();
        }
        break;

      case 'transcript':
        if (msg.text) console.log('[GeminiLive] Sage:', msg.text.slice(0, 80));
        this.onTranscript(msg.text || '');
        break;

      case 'user_transcript':
        if (msg.text) console.log('[GeminiLive] You:', msg.text.slice(0, 80));
        this.onUserTranscript(msg.text || '');
        break;

      case 'tool_call':
        console.log('[GeminiLive] Tool call:', (msg.calls || []).map(c => c.name).join(', '));
        this.onToolCall({ functionCalls: msg.calls || [] });
        break;

      case 'tool_result':
        console.log('[GeminiLive] Tool result:', msg.name);
        this.onToolResult({ name: msg.name, result: msg.result || {} });
        break;

      case 'interrupted':
        this._stopAudio();
        this._setState('listening');
        break;

      case 'turn_complete':
        if (!this.isPlayingAudio) this._setState('listening');
        break;

      case 'goaway':
        // Gemini is about to disconnect — warn user
        console.warn('[GeminiLive] GoAway — session ending soon:', msg.timeLeft);
        this.onError('Session will end soon — wrapping up. You can restart after.');
        break;

      case 'error':
        console.error('[GeminiLive] Server error:', msg.message);
        this.onError(msg.message || 'Unknown error');
        this._setState('error');
        break;

      case 'ended':
        if (!this._closed) this._setState('ended');
        break;

      default:
        console.log('[GeminiLive] Unknown msg type:', msg.type);
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

    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      }
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
    } catch {
      this.isPlayingAudio = false;
      return;
    }

    const playNext = () => {
      if (this._closed || this.outputQueue.length === 0 || !this.audioCtx) {
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
    console.log('[GeminiLive] Requesting mic permissions...');
    this._micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: INPUT_SAMPLE_RATE },
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    console.log('[GeminiLive] Mic stream obtained.');
    // Expose for components that want to read mic level / toggle mute.
    try { window.__buddyMicStream = this._micStream; } catch {}

    console.log('[GeminiLive] Creating AudioContext for mic...');
    this._micInputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });

    // Chrome creates AudioContexts in 'suspended' state when not directly inside
    // a synchronous user-gesture handler. Resume explicitly so the ScriptProcessor
    // fires. This is a no-op on browsers that auto-start the context.
    if (this._micInputCtx.state === 'suspended') {
      try { await this._micInputCtx.resume(); } catch { /* proceed — some browsers allow it lazily */ }
    }
    // Re-resume if the context gets suspended later (e.g. tab backgrounded then foregrounded)
    this._micInputCtx.addEventListener('statechange', () => {
      if (this._micInputCtx?.state === 'suspended' && !this._closed) {
        this._micInputCtx.resume().catch(() => {});
      }
    });
    console.log(`[GeminiLive] Mic AudioContext state: ${this._micInputCtx.state} (sample rate: ${this._micInputCtx.sampleRate}Hz)`);

    const source = this._micInputCtx.createMediaStreamSource(this._micStream);
    this._micProcessor = this._micInputCtx.createScriptProcessor(4096, 1, 1);

    let chunksSent = 0;
    this._micProcessor.onaudioprocess = (e) => {
      if (this._closed || this.ws?.readyState !== WebSocket.OPEN) return;
      const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
      this._send({
        type: 'audio',
        data: arrayBufferToBase64(pcm),
        mimeType: `audio/pcm;rate=${this._micInputCtx.sampleRate}`,
      });
      chunksSent++;
      if (chunksSent === 1 || chunksSent === 10) {
        console.log(`[GeminiLive] Mic sending audio chunks (total=${chunksSent}, ctxState=${this._micInputCtx?.state})`);
      }
    };

    source.connect(this._micProcessor);
    this._micProcessor.connect(this._micInputCtx.destination);
    console.log('[GeminiLive] Mic pipeline connected — ScriptProcessor running.');
  }

  _stopMic() {
    // Clear handler first to prevent race between onaudioprocess and cleanup
    if (this._micProcessor) {
      this._micProcessor.onaudioprocess = null;
      try { this._micProcessor.disconnect(); } catch {}
      this._micProcessor = null;
    }
    if (this._micInputCtx) { try { this._micInputCtx.close(); } catch {} this._micInputCtx = null; }
    if (this._micStream) { this._micStream.getTracks().forEach(t => t.stop()); this._micStream = null; }
    try { if (window.__buddyMicStream) delete window.__buddyMicStream; } catch {}
  }

  /**
   * Tell the backend the user is now reading a different page of the picked
   * PDF. Backend pulls the page's text from its own DB (truth source) and
   * injects it into Buddy's next turn as a hidden stage cue — never shown to
   * the user transcript. Safe to call on every page change; backend coalesces.
   */
  sendPageUpdate(pageNumber) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!Number.isFinite(pageNumber)) return;
    this._send({ type: 'page_update', pageNumber: Math.max(1, Math.floor(pageNumber)) });
  }

  /**
   * Tell the backend where the user is in the app (route, page title, active doc).
   * Used to give Buddy "vision" of the user's current activity.
   */
  sendContextUpdate({ path, title, metadata = {} }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this._send({ type: 'context_update', path, title, metadata });
  }

  _setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange(state);

      // Safety net: if we enter "listening" and no audio arrives within 8s,
      // send a nudge to make sure Gemini starts speaking. Skip for Buddy mode
      // because ambient sessions are *supposed* to wait for the user.
      if (state === 'listening' && !this._hasReceivedAudio && this.mode !== 'buddy') {
        clearTimeout(this._nudgeTimer);
        this._nudgeTimer = setTimeout(() => {
          if (this.state === 'listening' && !this._hasReceivedAudio && !this._closed) {
            console.log('[GeminiLive] No audio after 8s — sending nudge...');
            this._send({ type: 'text', text: 'Please begin teaching now.' });
          }
        }, 8000);
      }
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

  const name = userName || 'there';

  return `You are Sage, a world-class live AI tutor conducting a real-time audio teaching session.

STUDENT: ${name} | LEVEL: ${teachingLevel} (${levelGuide[teachingLevel] || levelGuide.intermediate})
LESSON: ${moduleTitle || 'this lesson'}${moduleTopic ? ` — ${moduleTopic}` : ''}

GREETING (say this IMMEDIATELY as your very first words):
"Hey ${name}! Welcome to today's lesson."
Then share one surprising or counterintuitive fact about the topic to hook their attention, and ask if they're ready to dive in.

TEACHING RULES:
- You are speaking live — keep sentences short and natural, as a real teacher would speak
- Address the student as "${name}" — never "friend" or "student"
- Use the whiteboard constantly: call render_diagram for any process, hierarchy, or concept map
- For analogies and mental images, call generate_illustration
- For real-time facts or to verify information, call search_external_knowledge
- End each section with a check-in question before moving on
- Adapt complexity to their teaching level at all times

TOOL USAGE MANDATE (use these — don't just talk):
- render_diagram: within the first 2 minutes AND after every major concept
- generate_illustration: for abstract ideas, analogies, and mental models
- search_external_knowledge: when citing statistics, current events, or technical facts
- start_lightning_round: at the end of each major section to test retention

LESSON CONTENT:
${content ? content.substring(0, 12000) : 'Teach from general knowledge on this topic.'}

BEGIN SPEAKING NOW. Start with the greeting above, then proceed to teach.`;
}

// ── Podcast instruction builder ───────────────────────────────────────────────

const INTEREST_PERSONAS = {
  sports:       { name: 'Alex',   voice: 'Fenrir',  style: 'a sports commentator',   analogyDomain: 'sports, games, team dynamics, and athletic training' },
  music:        { name: 'Maya',   voice: 'Aoede',   style: 'a music producer',        analogyDomain: 'music, rhythm, composition, and the recording studio' },
  gaming:       { name: 'Kai',    voice: 'Puck',    style: 'a game developer',        analogyDomain: 'video games, mechanics, quests, and level design' },
  cooking:      { name: 'Sofia',  voice: 'Sulafat', style: 'a food critic',           analogyDomain: 'cooking, flavors, recipes, and culinary technique' },
  movies:       { name: 'Jordan', voice: 'Charon',  style: 'a film director',         analogyDomain: 'cinema, storytelling, plot arcs, and character development' },
  travel:       { name: 'Nadia',  voice: 'Zephyr',  style: 'a travel journalist',     analogyDomain: 'geography, cultures, exploration, and adventure' },
  fitness:      { name: 'Marcus', voice: 'Kore',    style: 'a personal trainer',      analogyDomain: 'fitness, workouts, muscle memory, and endurance' },
  technology:   { name: 'Priya',  voice: 'Iapetus', style: 'a tech startup founder',  analogyDomain: 'startups, code, software architecture, and tech culture' },
  art:          { name: 'Lucia',  voice: 'Leda',    style: 'an artist',               analogyDomain: 'painting, design, creativity, and visual storytelling' },
  finance:      { name: 'Dean',   voice: 'Achird',  style: 'a hedge fund analyst',    analogyDomain: 'markets, investing, risk, and financial strategy' },
  medicine:     { name: 'Sam',    voice: 'Charon',  style: 'a physician',             analogyDomain: 'medicine, anatomy, diagnosis, and patient care' },
  history:      { name: 'Evie',   voice: 'Leda',    style: 'a historian',             analogyDomain: 'historical events, civilisations, and timelines' },
  default_a:    { name: 'Alex',   voice: 'Fenrir',  style: 'a curious generalist',    analogyDomain: 'everyday life, pop culture, and common experiences' },
  default_b:    { name: 'Jamie',  voice: 'Achird',  style: 'a science enthusiast',    analogyDomain: 'science, nature, the universe, and discovery' },
};

function interestToPersona(interest) {
  if (!interest) return null;
  const key = interest.toLowerCase().trim();
  return INTEREST_PERSONAS[key] || null;
}

export function resolvePodcastHosts(interests = []) {
  const personas = interests
    .map(i => interestToPersona(i))
    .filter(Boolean);

  const hostA = personas[0] || INTEREST_PERSONAS.default_a;
  const hostB = personas[1] || INTEREST_PERSONAS.default_b;
  return { hostA, hostB };
}

export function buildPodcastInstruction({ moduleTitle, moduleTopic, content, userName, hostA, hostB }) {
  return `You are producing a lively, insightful podcast episode about a study topic. You will play BOTH podcast hosts alternately in the same conversation.

HOSTS:
- [${hostA.name.toUpperCase()}]: ${hostA.style}. Uses analogies from ${hostA.analogyDomain}.
- [${hostB.name.toUpperCase()}]: ${hostB.style}. Uses analogies from ${hostB.analogyDomain}.

LISTENER: ${userName || 'a student'} is tuning in.

EPISODE TOPIC: "${moduleTitle || moduleTopic || 'this lesson'}"${moduleTopic ? ` — specifically ${moduleTopic}` : ''}

FORMAT RULES — CRITICAL, follow exactly:
1. Every single spoken line MUST start with [${hostA.name.toUpperCase()}]: or [${hostB.name.toUpperCase()}]:
2. Alternate between hosts every 2-4 sentences — do not let one host monologue for more than 5 sentences
3. Make it feel like a REAL podcast: use "you know what?", "hold on—", "wait actually—", "exactly!", "I never thought about it that way", interruptions, laughter cues like "(laughs)", reactions
4. Each host MUST use at least 3 analogies from their domain throughout the episode
5. Cover the topic from multiple angles: definitions → surprising facts → real-world implications → debate a nuance → takeaway
6. Occasionally reference ${userName ? userName + ' who is listening' : 'the listener'} — "If you're tuning in and wondering about X..."
7. Total episode: aim for a rich, 6-8 minute conversation
8. End with both hosts giving their single best takeaway, then a sign-off

CONTENT TO COVER:
${content ? content.substring(0, 14000) : `Discuss ${moduleTitle || moduleTopic} from general knowledge.`}

Begin with ${hostA.name} doing a short podcast intro (the show name is "The Study Break") and teasing what today's episode covers, then ${hostB.name} jumps in with the most wild or surprising fact about this topic to hook the listener.`;
}

