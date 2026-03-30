/**
 * GeminiLiveService
 * Manages a WebSocket connection to the Gemini Live API for real-time audio teaching.
 * Uses the BidiGenerateContent endpoint for bidirectional audio streaming.
 */

const GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
const MODEL = 'models/gemini-2.0-flash-live-001';
const SAMPLE_RATE = 16000; // Input: 16kHz PCM16
const OUTPUT_SAMPLE_RATE = 24000; // Output: 24kHz PCM16

// ── Audio helpers ─────────────────────────────────────────────────────────────

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

// ── GeminiLiveSession ────────────────────────────────────────────────────────

export class GeminiLiveSession {
  constructor({ apiKey, systemInstruction, onTranscript, onUserTranscript, onStateChange, onError }) {
    this.apiKey = apiKey;
    this.systemInstruction = systemInstruction;
    this.onTranscript = onTranscript || (() => {});
    this.onUserTranscript = onUserTranscript || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});

    this.ws = null;
    this.audioCtx = null;
    this.micStream = null;
    this.micProcessor = null;
    this.outputQueue = []; // queued PCM16 ArrayBuffer chunks
    this.isPlayingAudio = false;
    this.state = 'idle'; // idle | connecting | ready | teaching | listening | thinking | ended
    this._closed = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async start() {
    this._setState('connecting');
    try {
      await this._connect();
      await this._initMic();
      this._setState('ready');
    } catch (err) {
      this._setState('ended');
      this.onError(err.message || 'Failed to start live session');
      throw err;
    }
  }

  stop() {
    this._closed = true;
    this._stopMic();
    this._stopAudio();
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this._setState('ended');
  }

  // Send a text interruption / question from the user
  sendTextTurn(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.onUserTranscript(text);
    this._sendJSON({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      }
    });
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  _connect() {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_LIVE_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Send setup message
        this._sendJSON({
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: this.systemInstruction }]
            },
          }
        });
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };

      this.ws.onerror = (err) => {
        if (!this._closed) {
          this.onError('WebSocket connection error');
          reject(new Error('WebSocket error'));
        }
      };

      this.ws.onclose = (event) => {
        if (!this._closed) {
          if (this.state !== 'ended') {
            this.onError(`Connection closed (${event.code})`);
            this._setState('ended');
          }
        }
      };

      // Wait for setup complete
      const originalOnMessage = this.ws.onmessage.bind(this);
      this.ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.setupComplete) {
          this.ws.onmessage = originalOnMessage;
          resolve();
        } else {
          originalOnMessage(event);
        }
      };
    });
  }

  _sendJSON(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  _handleMessage(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    // Server content (audio/text from Gemini)
    if (data.serverContent) {
      const { modelTurn, turnComplete, interrupted } = data.serverContent;

      if (interrupted) {
        this._stopAudio();
        this.outputQueue = [];
        this._setState('listening');
      }

      if (modelTurn?.parts) {
        let hasAudio = false;
        for (const part of modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
            hasAudio = true;
            const buffer = base64ToArrayBuffer(part.inlineData.data);
            this.outputQueue.push(buffer);
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

      if (turnComplete) {
        // After Gemini finishes speaking, go back to listening
        if (!this.isPlayingAudio) {
          this._setState('listening');
        }
      }
    }

    // Tool calls (not used here, but handle gracefully)
    if (data.toolCallCancellation) {
      // no-op
    }
  }

  // ── Audio Output ──────────────────────────────────────────────────────────

  async _drainAudioQueue() {
    if (this.isPlayingAudio || this.outputQueue.length === 0) return;
    this.isPlayingAudio = true;

    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const playNext = () => {
      if (this._closed || this.outputQueue.length === 0) {
        this.isPlayingAudio = false;
        if (!this._closed) this._setState('listening');
        return;
      }

      const pcm16Buffer = this.outputQueue.shift();
      const float32 = pcm16ToFloat32(pcm16Buffer);
      const audioBuffer = this.audioCtx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);
      source.onended = playNext;
      source.start();
    };

    playNext();
  }

  _stopAudio() {
    this.isPlayingAudio = false;
    this.outputQueue = [];
    // We can't easily stop the currently playing buffer, but clearing queue stops future ones
  }

  // ── Microphone ────────────────────────────────────────────────────────────

  async _initMic() {
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const source = inputCtx.createMediaStreamSource(this.micStream);
    this.micProcessor = inputCtx.createScriptProcessor(4096, 1, 1);

    this.micProcessor.onaudioprocess = (e) => {
      if (this._closed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(float32);
      const base64 = arrayBufferToBase64(pcm16);
      this._sendJSON({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: base64,
          }]
        }
      });
    };

    source.connect(this.micProcessor);
    this.micProcessor.connect(inputCtx.destination);
    this._micInputCtx = inputCtx;
  }

  _stopMic() {
    if (this.micProcessor) {
      try { this.micProcessor.disconnect(); } catch (_) {}
      this.micProcessor = null;
    }
    if (this._micInputCtx) {
      try { this._micInputCtx.close(); } catch (_) {}
      this._micInputCtx = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
  }

  // ── State ─────────────────────────────────────────────────────────────────

  _setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange(state);
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Build a rich system instruction for the teaching session.
 */
export function buildTeachingInstruction({ moduleTitle, moduleTopic, content, teachingLevel = 'intermediate', userName }) {
  const levelMap = {
    dummy: 'everyday language, zero jargon, lots of simple analogies',
    beginner: 'simple language, define all technical terms, plenty of clear examples',
    intermediate: 'standard academic language with clear explanations',
    advanced: 'technical, detailed language, discussing nuances and advanced concepts',
  };
  const style = levelMap[teachingLevel] || levelMap.intermediate;

  return `You are Sage, the personalized AI tutor from StudyRAG. You are conducting a one-on-one live audio teaching session.

## Your Mission
Teach the student about: **${moduleTitle || 'this topic'}**${moduleTopic ? ` (${moduleTopic})` : ''}.

## Sage's Personality
- You are warm, encouraging, patient, and enthusiastic about the subject.
- Use the student's name (${userName || 'the student'}) naturally to keep it personal.
- Use ${style}.
- Speak naturally and conversationally — you are speaking aloud, not reading a textbook.

## Teaching Strategy
- **Grounding:** Always ground your teaching in the provided lesson content below. Do not invent facts.
- **Socratic Method:** After explaining a concept, ask a brief follow-up question to check understanding.
- **Pacing:** Keep each explanation segment under 45 seconds before pausing or asking a question.
- **Interruption Handling:** If the student speaks while you are talking, STOP immediately and address their concern.
- **Simplicity:** If the student seems confused, use simpler language and real-world analogies.

## Content to Teach
${content ? content.substring(0, 10000) : 'The full document content provided in the context.'}

## Session Flow
1. Start by warmly greeting the student and briefly outlining what you'll cover.
2. Work through the content systematically, section by section.
3. Check for understanding frequently with questions like "Does that make sense?" or "How does that relate to what we just discussed?"
4. Be supportive — if a concept is hard, acknowledge it: "This part is tricky, but we'll get through it together!"`;
}
