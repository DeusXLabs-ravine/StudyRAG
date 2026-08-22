const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const r2 = require('../config/r2');
const { withModelFallback, keyPool } = require('../config/gemini');
const { synthesizeMultiSpeakerSpeech } = require('./ttsService');
const MIN_SECTION_CHARS = 800; // skip sections with too little content

const LEVEL_GUIDES = {
  beginner:     { vocab: 'plain everyday language, no jargon, short explanations', pace: 'slow and patient — take time to define every term before moving on', depth: 'stay high-level and intuitive, avoid complex mechanics' },
  intermediate: { vocab: 'clear language with accurate terminology explained in context', pace: 'conversational and natural — neither rushed nor overly careful', depth: 'explain the why behind concepts, include some nuance' },
  advanced:     { vocab: 'precise academic or professional vocabulary', pace: 'brisk and substantive — assume solid baseline knowledge', depth: 'cover mechanisms, edge cases, and real-world complexity' },
  expert:       { vocab: 'technical and field-specific language without hedging', pace: 'direct peer-to-peer exchange — skip basics entirely', depth: 'debate interpretations, cite specifics, discuss open questions' },
};

function buildSectionPodcastPrompt({ sectionHeading, sectionText, userName, hostAName, hostAStyle, hostADomain, hostBName, hostBStyle, hostBDomain, teachingLevel = 'intermediate' }) {
  const topic = sectionHeading || 'this section';
  const truncated = sectionText.length > 5000 ? sectionText.slice(0, 5000) + '...' : sectionText;
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
${truncated}

Write only the dialogue lines now — no preamble, no summary, no labels outside the Name: format:`;
}

/**
 * Extract top-level sections from the page index tree.
 * Returns [{ heading, text, pageNumbers }].
 * Falls back to splitting full text into ~3 chunks if tree has no sections.
 */
function extractSectionsFromTree(tree, pages) {
  const sections = [];

  if (tree && tree.children && tree.children.length > 1) {
    for (const child of tree.children) {
      const childPages = pages.filter(p =>
        p.pageNumber >= (child.startPage || 1) &&
        p.pageNumber <= (child.endPage || Infinity)
      );
      const text = childPages.map(p => p.text).join('\n\n').trim();
      if (text.length >= MIN_SECTION_CHARS) {
        sections.push({
          heading: child.heading || child.label || `Section ${sections.length + 1}`,
          text,
          charCount: text.length,
        });
      }
    }
  }

  // Fallback: no meaningful tree structure — split pages into ~3 equal groups
  if (sections.length === 0 && pages.length > 0) {
    const groupSize = Math.ceil(pages.length / 3);
    for (let i = 0; i < pages.length; i += groupSize) {
      const group = pages.slice(i, i + groupSize);
      const text = group.map(p => p.text).join('\n\n').trim();
      if (text.length >= MIN_SECTION_CHARS) {
        sections.push({
          heading: `Part ${sections.length + 1}`,
          text,
          charCount: text.length,
        });
      }
    }
  }

  return sections;
}

/**
 * Generate and persist section podcasts for a document.
 * Called from the processing pipeline after buildPageIndex completes.
 *
 * @param {string} docId
 * @param {object} tree  - page index tree from buildPageIndex
 * @param {Array}  pages - pages array from buildPageIndex
 * @param {string} [userId]
 * @param {string} [teachingLevel]
 */
async function generateSectionPodcasts(docId, tree, pages, userId = null, teachingLevel = 'intermediate') {
  const prefix = `[SectionPodcast ${docId.slice(0, 8)}]`;
  const sections = extractSectionsFromTree(tree, pages);

  if (sections.length === 0) {
    console.log(`${prefix} No sections with sufficient content — skipping`);
    return;
  }

  console.log(`${prefix} Generating ${sections.length} section podcast(s)`);

  // Default hosts (could be personalised from user profile in future)
  const hostA = { name: 'Alex', voice: 'Fenrir', style: 'an enthusiastic host who loves finding unexpected connections', domain: 'everyday analogies' };
  const hostB = { name: 'Jordan', voice: 'Achird', style: 'a thoughtful co-host who asks the questions listeners are thinking', domain: 'science and discovery' };

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionId = uuidv4();

    try {
      // Insert a 'generating' row first so the frontend can show a loading state
      await supabase.from('section_podcasts').upsert({
        id: sectionId,
        document_id: docId,
        section_index: i,
        section_heading: section.heading,
        status: 'generating',
        char_count: section.charCount,
      }, { onConflict: 'document_id,section_index', ignoreDuplicates: false });

      // Generate transcript
      const prompt = buildSectionPodcastPrompt({
        sectionHeading: section.heading,
        sectionText: section.text,
        userName: null, // no user name at pipeline time
        hostAName: hostA.name, hostAStyle: hostA.style, hostADomain: hostA.domain,
        hostBName: hostB.name, hostBStyle: hostB.style, hostBDomain: hostB.domain,
        teachingLevel,
      });

      const transcript = await withModelFallback((modelName) => async () => {
        const entry = keyPool.getClient();
        const model = entry.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (!text?.trim()) throw new Error('Empty transcript');
        return text.trim();
      }, 'fast', 0);

      console.log(`${prefix} Section ${i} transcript: ${transcript.length} chars`);

      // Generate audio
      const wavBuffer = await synthesizeMultiSpeakerSpeech(
        transcript,
        hostA.name, hostA.voice,
        hostB.name, hostB.voice,
      );

      // Upload audio to R2
      const audioPath = `podcasts/${docId}/${i}.wav`;
      await r2.uploadBuffer(audioPath, wavBuffer, 'audio/wav');

      // Mark ready
      await supabase.from('section_podcasts')
        .update({
          status: 'ready',
          transcript,
          audio_path: audioPath,
          duration_secs: Math.round(wavBuffer.length / (24000 * 2)), // rough WAV estimate
          updated_at: new Date().toISOString(),
        })
        .eq('document_id', docId)
        .eq('section_index', i);

      console.log(`${prefix} Section ${i} done — ${Math.round(wavBuffer.length / 1024)}KB`);

    } catch (err) {
      console.error(`${prefix} Section ${i} failed: ${err.message}`);
      await supabase.from('section_podcasts')
        .update({ status: 'failed', error: err.message, updated_at: new Date().toISOString() })
        .eq('document_id', docId)
        .eq('section_index', i)
        .then(() => {});
    }
  }

  console.log(`${prefix} All section podcasts complete`);
}

/**
 * Fetch all ready section podcasts for a document, with fresh signed audio URLs.
 */
async function getSectionPodcasts(docId) {
  const { data, error } = await supabase
    .from('section_podcasts')
    .select('id, section_index, section_heading, status, transcript, audio_path, duration_secs, char_count, error')
    .eq('document_id', docId)
    .order('section_index');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Generate signed URLs for ready items
  return Promise.all(data.map(async (row) => {
    let audioUrl = null;
    if (row.status === 'ready' && row.audio_path) {
      audioUrl = await r2.getSignedDownloadUrl(row.audio_path, 3600).catch(() => null); // 1 hour
    }
    return { ...row, audioUrl };
  }));
}

module.exports = { generateSectionPodcasts, getSectionPodcasts, extractSectionsFromTree };
