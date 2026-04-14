const express = require('express');
const router = express.Router();
const { withModelFallback, keyPool } = require('../config/gemini');
const { synthesizeMultiSpeakerSpeech } = require('../services/ttsService');
const { enforceUsageCap } = require('../middleware/tierAuth');

const MAX_CONTENT_LENGTH = 5000;

const LEVEL_GUIDES = {
  beginner:     { vocab: 'plain everyday language, no jargon, short explanations', pace: 'slow and patient — take time to define every term before moving on', depth: 'stay high-level and intuitive, avoid complex mechanics' },
  intermediate: { vocab: 'clear language with accurate terminology explained in context', pace: 'conversational and natural — neither rushed nor overly careful', depth: 'explain the why behind concepts, include some nuance' },
  advanced:     { vocab: 'precise academic or professional vocabulary', pace: 'brisk and substantive — assume solid baseline knowledge', depth: 'cover mechanisms, edge cases, and real-world complexity' },
  expert:       { vocab: 'technical and field-specific language without hedging', pace: 'direct peer-to-peer exchange — skip basics entirely', depth: 'debate interpretations, cite specifics, discuss open questions' },
};

function buildPodcastPrompt({
  moduleTitle, moduleTopic, content, userName,
  hostAName, hostAStyle, hostADomain,
  hostBName, hostBStyle, hostBDomain,
  teachingLevel = 'intermediate',
}) {
  const topic = [moduleTitle, moduleTopic].filter(Boolean).join(' — ') || 'the lesson topic';
  const truncatedContent = content?.length > MAX_CONTENT_LENGTH
    ? content.slice(0, MAX_CONTENT_LENGTH) + '...'
    : (content || '');

  const level = LEVEL_GUIDES[teachingLevel] || LEVEL_GUIDES.intermediate;

  return `You are writing a podcast transcript for "The Study Break" — a thoughtful, engaging study podcast.

HOSTS:
- ${hostAName}: ${hostAStyle}
- ${hostBName}: ${hostBStyle}

STUDENT LISTENING: ${userName || 'a student'}
EPISODE TOPIC: "${topic}"
LEARNING LEVEL: ${teachingLevel.toUpperCase()} — Use ${level.vocab}. Pace: ${level.pace}. Depth: ${level.depth}.

PODCAST STYLE — this is a real show, not a lecture read aloud:
• Hosts think out loud, finish each other's thoughts, and build ideas collaboratively
• They get curious, ask genuine follow-up questions, and sometimes disagree slightly before agreeing
• The conversation moves at a deliberate, unhurried pace — not a bullet-point list
• Analogies from ${hostADomain} (${hostAName}) or ${hostBDomain} (${hostBName}) may appear once or twice ONLY if they arise naturally — never forced, never explained in detail
• Reactions feel human: pauses, "hmm", "right — and that connects to…", brief laughter, restating something in a different way

STRICT FORMAT — no exceptions:
• Every line: "${hostAName}: text" or "${hostBName}: text" — name, colon, single space, then dialogue
• NEVER use brackets, stage directions, markdown, bullets, or headers
• 20 to 26 turns total — a full, unhurried conversation
• Each turn: 3 to 5 sentences. Hosts do NOT speak in single sentences
• Opening: ${hostAName} welcomes listeners warmly, sets the scene, sparks curiosity about the topic
• Middle: deep, back-and-forth exploration — at least one moment where a host asks "but what about…" or "I'm not sure I follow — can you say more about…"
• Closing: each host shares one genuine takeaway in their own voice, then a warm sign-off
• Mention ${userName ? '"' + userName + '"' : 'the listener'} by name exactly once, naturally mid-conversation

KEY CONTENT TO DRAW FROM:
${truncatedContent || `Discuss ${topic} from general knowledge, going deep on the most interesting aspects.`}

Write only the dialogue lines now — no preamble, no summary, no labels outside the Name: format:`;
}

/**
 * POST /api/podcast/generate
 * Generates a complete podcast episode: transcript + multi-speaker WAV audio.
 *
 * Body: {
 *   moduleTitle, moduleTopic, content, userName,
 *   hostAName, hostAVoice, hostAStyle, hostADomain,
 *   hostBName, hostBVoice, hostBStyle, hostBDomain,
 * }
 * Response: { transcript, audioBase64, hostAName, hostBName }
 */
router.post('/generate', enforceUsageCap('tts'), async (req, res) => {
  const {
    moduleTitle, moduleTopic, content, userName,
    hostAName, hostAVoice,
    hostAStyle, hostADomain,
    hostBName, hostBVoice,
    hostBStyle, hostBDomain,
    teachingLevel,
  } = req.body;

  if (!moduleTitle && !moduleTopic) {
    return res.status(400).json({ error: 'moduleTitle or moduleTopic required' });
  }
  if (!hostAName || !hostBName) {
    return res.status(400).json({ error: 'hostAName and hostBName required' });
  }

  try {
    // ── Step 1: Generate transcript ──────────────────────────────────────────
    console.log(`[Podcast] Generating: "${moduleTitle || moduleTopic}" | ${hostAName} & ${hostBName}`);

    const prompt = buildPodcastPrompt({
      moduleTitle, moduleTopic, content, userName,
      hostAName, hostAStyle: hostAStyle || 'an enthusiastic host',
      hostADomain: hostADomain || 'everyday life',
      hostBName, hostBStyle: hostBStyle || 'a thoughtful co-host',
      hostBDomain: hostBDomain || 'science and discovery',
      teachingLevel: teachingLevel || 'intermediate',
    });

    const transcript = await withModelFallback((modelName) => async () => {
      const entry = keyPool.getClient();
      const model = entry.genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text?.trim()) throw new Error('Empty transcript generated');
      return text.trim();
    }, 'fast', 0);

    console.log(`[Podcast] Transcript generated — ${transcript.length} chars`);

    // ── Step 2: Multi-speaker TTS ─────────────────────────────────────────────
    console.log(`[Podcast] Synthesizing multi-speaker audio...`);

    const wavBuffer = await synthesizeMultiSpeakerSpeech(
      transcript,
      hostAName, hostAVoice || 'Fenrir',
      hostBName, hostBVoice || 'Achird'
    );

    const audioBase64 = wavBuffer.toString('base64');
    console.log(`[Podcast] Audio ready — ${Math.round(wavBuffer.length / 1024)}KB`);

    return res.json({ transcript, audioBase64, hostAName, hostBName });

  } catch (err) {
    console.error('[Podcast] Generation error:', err.message);
    return res.status(500).json({ error: err.message || 'Podcast generation failed' });
  }
});

/**
 * GET /api/podcast/sections/:docId
 * Returns all section podcasts for a document (status + signed audio URL).
 */
router.get('/sections/:docId', async (req, res) => {
  try {
    const { getSectionPodcasts } = require('../services/sectionPodcastService');
    const podcasts = await getSectionPodcasts(req.params.docId);
    return res.json(podcasts);
  } catch (err) {
    console.error('[Podcast] getSectionPodcasts error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
