/**
 * Progressive course generation.
 *
 * Replaces "generate everything, then reveal" with "reveal the map immediately,
 * fill on demand". A measured run of the old pipeline took 247s before a student
 * saw anything at all, on a dense 63-page STEM document.
 *
 * Order of events:
 *   t~2s   orientation module (Module 0) — something real to read
 *   t~15s  outline persisted as skeleton rows — the full course map
 *   t~15s+ content fills batch by batch, prioritised by what the student opens
 *   later  Module 0 regenerates, now grounded in the finished course
 *
 * Grounding is unaffected: every real module is still written from the full
 * document segment. Latency lives on the output side, grounding on the input
 * side, so shrinking output costs no fidelity. The single exception is Module 0,
 * which is written from title and headings only and is therefore forbidden by
 * its prompt from asserting any subject fact.
 */
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
const { moduleCache } = require('../config/cache');
const { extractJSON } = require('../utils/jsonHelper');
const { INTRO_MODULE_PROMPT, buildMissionSection } = require('../utils/prompts');
const {
  insertSkeletonModules,
  fillSkeletonBatch,
  generateOutlineForSegment,
  splitIntoSegments,
  runWithConcurrency,
  SEGMENT_SIZE,
  BATCH_SIZE,
  BATCH_CONCURRENCY,
} = require('./moduleGenerator');
const {
  getUserTeachingLevel,
  getUserInterests,
  getEffectiveLearningStyle,
  getEffectiveLearningPace,
} = require('./userProfileService');

// A skeleton whose fill started longer ago than this is presumed orphaned by a
// dead batch, and is flipped to 'failed' so it can be retried rather than
// sitting 'pending' forever.
const FILL_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Module 0: orientation ────────────────────────────────────

/**
 * Derive cheap section headings from page text, with no LLM call.
 *
 * Native PDF ingest stores `heading: null` for every page, so the document's
 * real structure is unavailable. Taking the first short, title-like line of each
 * page recovers enough of it to orient a student — and, unlike the model's
 * parametric guess, it is genuinely derived from their document.
 */
function deriveHeadings(pages, limit = 40) {
  const headings = [];
  for (const p of pages) {
    // A trailing full stop marks prose; question marks do not — plenty of real
    // headings are questions ("1.1 What Is a Feature?").
    const line = String(p.text || '')
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length >= 3 && l.length <= 80 && !/\.$/.test(l));
    if (line && !headings.includes(line)) headings.push(line);
    if (headings.length >= limit) break;
  }
  return headings;
}

/**
 * Generate and persist the orientation module at order_index 0.
 * Fast by construction: tiny input (title + headings), small bounded output.
 */
async function generateIntroModule(docId, { title, headings, userId, mission }) {
  const teachingLevel = await getUserTeachingLevel(userId).catch(() => 'intermediate');

  const prompt = INTRO_MODULE_PROMPT
    .replace('{document_title}', title || 'Untitled document')
    .replace('{document_headings}', headings.length ? headings.map(h => `- ${h}`).join('\n') : '(none available)')
    .replace('{teaching_level_line}', `The student's level is: ${teachingLevel}. Match your language to it.`)
    .replace('{mission_section}', buildMissionSection(mission));

  const result = await withRetryOnRateLimit(async () => {
    // Orientation is short and structural — the lite tier is plenty.
    const model = getGenerativeModel('fast_lite');
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
    });
  }, 2, 1);

  const parsed = extractJSON(result.response.text());
  if (!parsed || !parsed.content) throw new Error('Intro module produced no content');

  const row = {
    id: uuidv4(),
    document_id: docId,
    order_index: 0,
    title: parsed.title || 'Start here',
    topic: parsed.topic || 'Overview',
    objectives: [],
    content: parsed.content,
    takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
    outcome: parsed.outcome || null,
    bloom_level: 'understand',
    content_status: 'ready',
    is_intro: true,
  };

  const { error } = await supabase.from('modules').insert(row);
  if (error) throw error;

  moduleCache.del(`byDoc:${docId}`);
  moduleCache.del('allModules');
  console.log(`[progressive] Intro module ready for ${docId.slice(0, 8)}`);
  return row;
}

/**
 * Rewrite Module 0 once the real course exists, so the permanent version is
 * grounded in the actual finished modules rather than in a guess made from the
 * title. Best-effort: a failure leaves the fast version in place.
 */
async function upgradeIntroModule(docId, userId) {
  try {
    const { data: intro } = await supabase
      .from('modules').select('id').eq('document_id', docId).eq('is_intro', true).maybeSingle();
    if (!intro) return;

    const { data: mods } = await supabase
      .from('modules').select('title, topic, outcome')
      .eq('document_id', docId).eq('is_intro', false)
      .eq('content_status', 'ready').order('order_index');
    if (!mods || !mods.length) return;

    const headings = mods.map(m => `${m.title}${m.outcome ? ` — ${m.outcome}` : ''}`);
    const { data: doc } = await supabase
      .from('documents').select('original_name').eq('id', docId).single();

    const prompt = INTRO_MODULE_PROMPT
      .replace('{document_title}', doc?.original_name || 'Untitled document')
      .replace('{document_headings}', headings.map(h => `- ${h}`).join('\n'))
      .replace('{teaching_level_line}', 'These are the actual lessons in the finished course.')
      .replace('{mission_section}', '');

    const result = await withRetryOnRateLimit(async () => {
      const model = getGenerativeModel('fast_lite');
      return model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      });
    }, 2, 1);

    const parsed = extractJSON(result.response.text());
    if (!parsed?.content) return;

    await supabase.from('modules').update({
      title: parsed.title || 'Start here',
      content: parsed.content,
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      outcome: parsed.outcome || null,
    }).eq('id', intro.id);

    moduleCache.del(`mod:${intro.id}`);
    moduleCache.del(`byDoc:${docId}`);
    console.log(`[progressive] Intro module upgraded for ${docId.slice(0, 8)}`);
  } catch (err) {
    console.warn(`[progressive] Intro upgrade failed (fast version kept): ${err.message}`);
  }
}

// ─── Fill queue ───────────────────────────────────────────────

/** Move a module to the front of the fill queue because the student opened it. */
async function prioritizeModule(moduleId) {
  const { error } = await supabase
    .from('modules')
    .update({ prioritized_at: new Date().toISOString() })
    .eq('id', moduleId)
    .eq('content_status', 'pending');
  if (error) throw error;
  return { prioritized: true };
}

/** Flip long-orphaned pending rows to 'failed' so they surface as retryable. */
async function reapStalledSkeletons(docId) {
  const cutoff = new Date(Date.now() - FILL_TIMEOUT_MS).toISOString();
  await supabase.from('modules')
    .update({ content_status: 'failed' })
    .eq('document_id', docId)
    .eq('content_status', 'pending')
    .lt('generation_started_at', cutoff);
}

// ─── Orchestrator ─────────────────────────────────────────────

/**
 * Full progressive generation for a document.
 *
 * Resolves as soon as the course MAP exists (intro + skeletons). Content filling
 * continues in the background, so the caller — the upload pipeline — is not held
 * open for the whole generation.
 */
async function generateCourseProgressive(docId, documentText, userId, opts = {}) {
  const t0 = Date.now();
  const log = (msg) => console.log(`[progressive ${docId.slice(0, 8)}] ${msg} (+${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId).catch(() => 'intermediate'),
    getUserInterests(userId).catch(() => []),
    getEffectiveLearningStyle(userId).catch(() => null),
    getEffectiveLearningPace(userId).catch(() => null),
  ]);
  const profile = { teachingLevel, interests, learningStyle, learningPace };
  const pedagogyOpts = { focusMode: opts.focusMode, mission: opts.mission };

  // Module 0 and the outline race in parallel. Module 0 wins — its output is
  // tiny — so the student is reading before the map even appears.
  const introPromise = (async () => {
    try {
      if (!opts.pages || !opts.pages.length) return null;
      const headings = deriveHeadings(opts.pages);
      const mod = await generateIntroModule(docId, {
        title: opts.title, headings, userId, mission: opts.mission,
      });
      log('intro module ready');
      return mod;
    } catch (err) {
      console.warn(`[progressive] Intro module failed (non-fatal): ${err.message}`);
      return null;
    }
  })();

  const segments = splitIntoSegments(documentText, SEGMENT_SIZE);
  const outline = await generateOutlineForSegment(
    segments[0], 0, segments.length, teachingLevel, interests, learningStyle, learningPace,
  );
  if (!outline || !outline.length) throw new Error('Outline generation produced nothing');
  log(`outline: ${outline.length} modules`);

  // Skeletons start at 1 — index 0 is reserved for the orientation module.
  const skeletons = await insertSkeletonModules(docId, outline, 1, opts);
  log(`course map visible (${skeletons.length} skeletons)`);

  await introPromise;

  // Background: fill content. Deliberately not awaited so the upload pipeline
  // is released as soon as the map exists.
  setImmediate(async () => {
    try {
      const batches = [];
      for (let i = 0; i < skeletons.length; i += BATCH_SIZE) {
        batches.push({ start: i, rows: skeletons.slice(i, i + BATCH_SIZE) });
      }

      const tasks = batches.map(({ start, rows }) => async () => {
        // Re-read status so a module the student already prioritised (and which
        // was filled on demand) is not generated a second time.
        const { data: fresh } = await supabase
          .from('modules').select('id, title, topic, content, document_id, content_status')
          .in('id', rows.map(r => r.id));
        const stillPending = (fresh || []).filter(r => r.content_status === 'pending');
        if (!stillPending.length) return 0;
        return fillSkeletonBatch(stillPending, segments[0], outline, start, profile, pedagogyOpts);
      });

      await runWithConcurrency(tasks, BATCH_CONCURRENCY);
      log('all content filled');

      await reapStalledSkeletons(docId);
      await upgradeIntroModule(docId, userId);
    } catch (err) {
      console.error(`[progressive] Background fill failed: ${err.message}`);
    }
  });

  return { moduleCount: skeletons.length, totalSegments: segments.length };
}

module.exports = {
  generateCourseProgressive,
  generateIntroModule,
  upgradeIntroModule,
  prioritizeModule,
  reapStalledSkeletons,
  deriveHeadings,
};
