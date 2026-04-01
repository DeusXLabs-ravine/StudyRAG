/**
 * GeminiLiveService
 * Manages a WebSocket connection to the Gemini Live API for real-time audio teaching.
 * Sage acts as a real-life teacher with multimodal capabilities.
 */

const GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL = 'models/gemini-3.1-flash-live-preview';
const SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

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
  constructor({ apiKey, systemInstruction, onTranscript, onUserTranscript, onStateChange, onError, onToolCall }) {
    this.apiKey = apiKey;
    this.systemInstruction = systemInstruction;
    this.onTranscript = onTranscript || (() => {});
    this.onUserTranscript = onUserTranscript || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});
    this.onToolCall = onToolCall || (() => {});

    this.ws = null;
    this.audioCtx = null;
    this.micStream = null;
    this.micProcessor = null;
    this.outputQueue = [];
    this.isPlayingAudio = false;
    this.state = 'idle';
    this._closed = false;
    this._setupCompleteReceived = false;
  }

  async start() {
    if (!this.apiKey) {
      this.onError('Gemini API key is missing.');
      return;
    }

    this._setState('connecting');
    console.log('[GeminiLive] Starting session...');
    
    try {
      await this._connect();
      await this._initMic();
      this._setState('ready');
    } catch (err) {
      console.error('[GeminiLive] Start error:', err);
      this._setState('ended');
      this.onError(err.message || 'Failed to start live session');
      this.stop();
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

  sendTextTurn(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.onUserTranscript(text);
    this._sendJSON({
      realtimeInput: { text }
    });
  }

  _connect() {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_LIVE_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        if (!this._setupCompleteReceived) {
          if (this.ws) this.ws.close();
          reject(new Error('Connection timed out.'));
        }
      }, 15000);

      this.ws.onopen = () => {
        console.log('[GeminiLive] Sending setup config with Teacher Tools...');
        this._sendJSON({
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' }
                }
              }
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: 'render_diagram',
                    description: 'Visualize a concept using a Mermaid.js diagram. Use this whenever explaining cycles, hierarchies, or processes.',
                    parameters: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', description: 'The Mermaid.js code.' },
                        title: { type: 'string', description: 'Title of the diagram.' }
                      },
                      required: ['code']
                    }
                  },
                  {
                    name: 'generate_illustration',
                    description: 'Generate an educational AI illustration or image to help visualize a complex topic.',
                    parameters: {
                      type: 'object',
                      properties: {
                        prompt: { type: 'string', description: 'Descriptive prompt for the image generation.' }
                      },
                      required: ['prompt']
                    }
                  },
                  {
                    name: 'search_external_knowledge',
                    description: 'Search external textbooks, web resources, and papers to verify facts or find more details.',
                    parameters: {
                      type: 'object',
                      properties: {
                        query: { type: 'string', description: 'The search query.' }
                      },
                      required: ['query']
                    }
                  },
                  {
                    name: 'start_lightning_round',
                    description: 'Start a fast-paced interactive quiz session to test understanding.',
                    parameters: {
                      type: 'object',
                      properties: {
                        topic: { type: 'string' }
                      }
                    }
                  }
                ]
              }
            ],
            systemInstruction: {
              parts: [{ text: this.systemInstruction }]
            }
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          if (typeof event.data !== 'string') {
            // Binary data received, ignore or handle as audio if needed
            // The API usually sends audio as base64 in a JSON message, 
            // but sometimes raw binary might come through if configured.
            return;
          }
          const response = JSON.parse(event.data);
          if (response.setupComplete) {
            this._setupCompleteReceived = true;
            clearTimeout(timeout);
            resolve();
          } else {
            this._handleMessage(response);
          }
        } catch (e) {
          console.error('[GeminiLive] Message parse error:', e);
        }
      };

      this.ws.onerror = () => {
        if (!this._closed) reject(new Error('WebSocket connection failed.'));
      };

      this.ws.onclose = (event) => {
        if (!this._closed) {
          this._setState('ended');
          const msg = event.code === 1006 ? 'Network error' : `Closed (${event.code})`;
          this.onError(msg);
          reject(new Error(msg));
        }
      };
    });
  }

  _sendJSON(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  _handleMessage(response) {
    // Handle Tool Calls
    if (response.toolCall) {
      console.log('[GeminiLive] Sage requested tool:', response.toolCall);
      this.onToolCall(response.toolCall);
      
      // Auto-respond so Sage keeps the turn active
      const responses = response.toolCall.functionCalls.map(fc => ({
        name: fc.name,
        id: fc.id,
        response: { output: { status: "processing" } }
      }));
      this._sendJSON({ toolResponse: { functionResponses: responses } });
    }

    const serverContent = response.serverContent;
    if (!serverContent) return;

    if (serverContent.inputTranscription?.text) {
      this.onUserTranscript(serverContent.inputTranscription.text);
    }
    
    const modelTurn = serverContent.modelTurn;
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

    if (serverContent.interrupted) {
      this._stopAudio();
      this._setState('listening');
    }

    if (serverContent.turnComplete && !this.isPlayingAudio) {
      this._setState('listening');
    }
  }

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
  }

  async _initMic() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
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
            audio: {
              data: base64,
              mimeType: 'audio/pcm;rate=16000'
            }
          }
        });
      };

      source.connect(this.micProcessor);
      this.micProcessor.connect(inputCtx.destination);
      this._micInputCtx = inputCtx;
    } catch (err) {
      console.error('[GeminiLive] Mic error:', err);
      throw new Error('Microphone access denied.');
    }
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

  _setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange(state);
    }
  }
}

export function buildTeachingInstruction({ moduleTitle, moduleTopic, content, teachingLevel = 'intermediate', userName }) {
  const levelMap = {
    dummy: 'simple analogies, everyday language',
    beginner: 'clear definitions, basic terms',
    intermediate: 'academic but conversational style',
    advanced: 'technical, rigorous discussion',
  };
  const style = levelMap[teachingLevel] || levelMap.intermediate;

  return `You are Sage, a master "Real Life Teacher". You are conducting a LIVE AUDIO study session.

## YOUR TEACHING PHILOSOPHY
- You are not a robot; you are a mentor. Use the student's name (${userName || 'friend'}) and be highly encouraging.
- **NEVER just talk.** A real teacher uses the whiteboard. Use the **render_diagram** tool constantly to visualize what you are saying.
- If a concept is abstract, use the **generate_illustration** tool to show a mental image.
- If you aren't 100% sure about a fact or want to bring in outside perspectives, use **search_external_knowledge**.
- You must ground every lesson in the **Uploaded Document Content** provided below.

## TOOL USAGE RULES
1. **render_diagram**: Trigger this when explaining any process, hierarchy, or relationship.
2. **generate_illustration**: Trigger this for analogies or complex visualizations.
3. **search_external_knowledge**: Use this to reference real-world textbooks or latest research.
4. **start_lightning_round**: Use this at the end of a section to test the student.

## CONTENT BASE
${content ? content.substring(0, 15000) : 'Uploaded study material.'}

Start by greeting ${userName || 'the student'} warmly and asking if they're ready to dive into ${moduleTitle || 'this topic'}.`;
}
