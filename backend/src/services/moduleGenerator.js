const supabase = require('../config/database');
const { getGenerativeModel } = require('../config/gemini');
const { MODULE_GENERATION_PROMPT, MODULE_OUTLINE_PROMPT, MODULE_BATCH_GENERATION_PROMPT, QUESTION_REGENERATION_PROMPT, buildInterestsSection } = require('../utils/prompts');
const { getUserTeachingLevel, getUserInterests } = require('./userProfileService');
const { prepareTextForLLM } = require('./chunkingService');
const { v4: uuidv4 } = require('uuid');

// Max chars per LLM segment — Gemini Flash handles large contexts,
// but keeping segments reasonable ensures quality per-segment output.
const SEGMENT_SIZE = 80000;
const MAX_CONCURRENCY = 3;
const BATCH_SIZE = 3;         // modules per LLM batch call in two-phase generation
const BATCH_CONCURRENCY = 2;  // parallel batch calls within a segment

// Track which documents currently have background module generation in progress.
// Ephemeral — resets on server restart (which also kills background jobs).
const _generatingDocs = new Set();

function isGeneratingModules(docId) {
  return _generatingDocs.has(docId);
}

/**
 * Split document text into section-aware segments of roughly SEGMENT_SIZE chars.
 * Tries to break at section boundaries so headings aren't cut mid-section.
 */
function splitIntoSegments(text, maxChars = SEGMENT_SIZE) {
  if (text.length <= maxChars) return [text];

  const { splitBySections } = require('./chunkingService');
  const sections = splitBySections(text);
  const segments = [];
  let current = '';

  for (const section of sections) {
    const sectionText = (section.heading ? `\n\n### ${section.heading}\n\n` : '\n\n') + section.text;

    if (current.length + sectionText.length > maxChars && current.length > 0) {
      segments.push(current);
      current = sectionText;
    } else {
      current += sectionText;
    }
  }

  if (current.trim()) {
    segments.push(current);
  }

  return segments;
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= tasks.length) return;
    results[idx] = await tasks[idx]();
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => next()));
  return results;
}

/**
 * Retry wrapper — retries a function up to `retries` times on failure.
 */
async function withRetry(fn, retries = 1, label = '') {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[moduleGenerator] ${label} attempt ${attempt + 1} failed, retrying: ${err.message}`);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Phase 1: Generate a curriculum outline for a text segment.
 * Returns an array of { title, topic, description } — small output, fast.
 */
async function generateOutlineForSegment(segmentText, segmentIndex, totalSegments, teachingLevel, interests) {
  const wordCount = segmentText.split(/\s+/).length;
  const targetModules = Math.max(5, Math.round(wordCount / 2000));
  const minModules = Math.max(3, Math.round(wordCount / 4000));

  const segmentNote = totalSegments > 1
    ? `\n\nNote: This is section ${segmentIndex + 1} of ${totalSegments} from the document. Create modules only for topics in THIS section.\n`
    : '';

  const prompt = MODULE_OUTLINE_PROMPT
    .replace('{document_text}', segmentText + segmentNote)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests))
    .replace('{word_count}', String(wordCount))
    .replace('{target_modules}', String(targetModules))
    .replace('{min_modules}', String(minModules));

  const model = getGenerativeModel('fast');
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  return parsed.modules || [];
}

/**
 * Phase 2: Generate full module content for a batch of outlined modules.
 * Each batch is typically 3 modules — keeps output manageable per LLM call.
 */
async function generateModuleBatch(segmentText, fullOutline, batchModules, batchStart, teachingLevel, interests) {
  const outlineText = fullOutline
    .map((m, i) => `${i + 1}. "${m.title}" [${m.topic}]: ${m.description}`)
    .join('\n');

  const batchText = batchModules
    .map((m, i) => `${batchStart + i + 1}. "${m.title}" [${m.topic}]: ${m.description}`)
    .join('\n');

  const prompt = MODULE_BATCH_GENERATION_PROMPT
    .replace('{document_text}', segmentText)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests))
    .replace('{full_outline}', outlineText)
    .replace('{batch_modules}', batchText);

  const model = getGenerativeModel('fast');
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

/**
 * Legacy single-call generation — used as fallback when two-phase fails.
 */
async function generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests) {
  const segmentNote = totalSegments > 1
    ? `\n\nNote: This is section ${segmentIndex + 1} of ${totalSegments} from the document. Create modules only for the topics in THIS section.\n`
    : '';

  const prompt = MODULE_GENERATION_PROMPT
    .replace('{document_text}', segmentText + segmentNote)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests));

  const model = getGenerativeModel('fast');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(`[moduleGenerator] Legacy parse failed for segment ${segmentIndex + 1}:`, e.message);
    return { modules: [] };
  }
}

/**
 * Two-phase module generation for a single text segment.
 * Phase 1: Generate outline (determines module count proportional to content).
 * Phase 2: Generate full modules in parallel batches of BATCH_SIZE.
 * Falls back to legacy single-call on outline failure.
 */
async function generateModulesForSegment(segmentText, segmentIndex, totalSegments, teachingLevel, interests) {
  const wordCount = segmentText.split(/\s+/).length;

  // Phase 1: Generate curriculum outline
  let outline;
  try {
    outline = await withRetry(
      () => generateOutlineForSegment(segmentText, segmentIndex, totalSegments, teachingLevel, interests),
      1,
      `Outline seg-${segmentIndex + 1}`
    );
    console.log(`[moduleGenerator] Segment ${segmentIndex + 1}/${totalSegments}: outline → ${outline.length} modules (${wordCount} words)`);
  } catch (err) {
    console.error(`[moduleGenerator] Outline failed for segment ${segmentIndex + 1}, falling back to single-call:`, err.message);
    return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests);
  }

  if (!outline || outline.length === 0) {
    console.warn(`[moduleGenerator] Empty outline for segment ${segmentIndex + 1}, falling back`);
    return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests);
  }

  // For very small outlines (≤ BATCH_SIZE), generate all in one call
  if (outline.length <= BATCH_SIZE) {
    try {
      const result = await withRetry(
        () => generateModuleBatch(segmentText, outline, outline, 0, teachingLevel, interests),
        1,
        `Single-batch seg-${segmentIndex + 1}`
      );
      console.log(`[moduleGenerator] Segment ${segmentIndex + 1}: ${result.modules?.length || 0} modules (single batch)`);
      return result;
    } catch (err) {
      console.error(`[moduleGenerator] Single-batch failed for segment ${segmentIndex + 1}, falling back:`, err.message);
      return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests);
    }
  }

  // Phase 2: Generate modules in parallel batches
  const batches = [];
  for (let i = 0; i < outline.length; i += BATCH_SIZE) {
    batches.push({ start: i, items: outline.slice(i, i + BATCH_SIZE) });
  }

  const batchTasks = batches.map(({ start, items }) => async () => {
    try {
      return await withRetry(
        () => generateModuleBatch(segmentText, outline, items, start, teachingLevel, interests),
        1,
        `Batch ${start + 1}-${start + items.length} seg-${segmentIndex + 1}`
      );
    } catch (err) {
      console.error(`[moduleGenerator] Batch ${start + 1}-${start + items.length} failed for segment ${segmentIndex + 1}:`, err.message);
      return { modules: [] };
    }
  });

  const batchResults = await runWithConcurrency(batchTasks, BATCH_CONCURRENCY);

  // Combine all batch results
  const allModules = [];
  for (const result of batchResults) {
    if (result?.modules) {
      allModules.push(...result.modules);
    }
  }

  console.log(`[moduleGenerator] Segment ${segmentIndex + 1}: ${allModules.length} modules from ${batches.length} batches`);
  return { modules: allModules };
}

/**
 * Insert parsed module results into the DB, starting at the given orderIndex.
 * Returns the next orderIndex to use.
 */
async function insertModuleResults(docId, segmentResults, startOrderIndex) {
  const allModuleRows = [];
  const allQuestionRows = [];
  let orderIndex = startOrderIndex;

  for (const parsed of segmentResults) {
    for (const mod of (parsed.modules || [])) {
      const id = uuidv4();
      const topic = mod.topic || mod.title;

      allModuleRows.push({
        id,
        document_id: docId,
        order_index: orderIndex++,
        title: mod.title,
        topic,
        objectives: mod.objectives,
        content: mod.content,
        takeaways: mod.takeaways,
      });

      for (const q of (mod.questions || [])) {
        allQuestionRows.push({
          id: uuidv4(),
          module_id: id,
          type: q.type,
          question: q.question,
          options: q.options || null,
          correct: q.correct,
          explanation: q.explanation || null,
          topic: q.topic || topic,
        });
      }
    }
  }

  for (let i = 0; i < allModuleRows.length; i += 500) {
    const batch = allModuleRows.slice(i, i + 500);
    const { error: modErr } = await supabase.from('modules').insert(batch);
    if (modErr) throw modErr;
  }

  if (allQuestionRows.length > 0) {
    for (let i = 0; i < allQuestionRows.length; i += 500) {
      const batch = allQuestionRows.slice(i, i + 500);
      const { error: qErr } = await supabase.from('questions').insert(batch);
      if (qErr) throw qErr;
    }
  }

  return { moduleCount: allModuleRows.length, nextOrderIndex: orderIndex };
}

/**
 * Generate only the initial batch of modules (first segment) so the user
 * can start learning immediately. Returns quickly.
 */
async function generateInitialModules(docId, documentText, userId = null) {
  const [teachingLevel, interests] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
  ]);

  const segments = splitIntoSegments(documentText, SEGMENT_SIZE);
  const totalSegments = segments.length;
  console.log(`[moduleGenerator] Document split into ${totalSegments} segment(s) (${documentText.length} chars total)`);

  // Generate modules from the first segment only
  const firstResult = await generateModulesForSegment(segments[0], 0, totalSegments, teachingLevel, interests);
  const { moduleCount } = await insertModuleResults(docId, [firstResult], 0);

  console.log(`[moduleGenerator] Initial batch: ${moduleCount} modules from segment 1/${totalSegments}`);
  return { moduleCount, totalSegments };
}

/**
 * Generate modules for all remaining segments (2..N) in the background.
 * Each segment is processed with the two-phase approach and results are
 * inserted per-segment so the frontend can poll for progressive updates.
 * Individual segment failures are caught and logged — they don't kill the pipeline.
 */
async function generateRemainingModules(docId, documentText, userId = null) {
  const [teachingLevel, interests] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
  ]);

  const segments = splitIntoSegments(documentText, SEGMENT_SIZE);
  if (segments.length <= 1) return; // nothing more to generate

  _generatingDocs.add(docId);
  const remaining = segments.slice(1);

  try {
    // Get the current max order_index so we continue the sequence
    const { data: lastMod } = await supabase
      .from('modules')
      .select('order_index')
      .eq('document_id', docId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (lastMod?.order_index ?? -1) + 1;
    let totalGenerated = 0;

    // Wrap each segment task with error handling so one failure doesn't kill all
    const tasks = remaining.map((seg, idx) => async () => {
      try {
        return await generateModulesForSegment(seg, idx + 1, segments.length, teachingLevel, interests);
      } catch (err) {
        console.error(`[moduleGenerator] Segment ${idx + 2}/${segments.length} failed entirely:`, err.message);
        return { modules: [] };
      }
    });

    // Process segments with concurrency
    const segmentResults = await runWithConcurrency(tasks, MAX_CONCURRENCY);

    // Insert results segment by segment (preserves ordering)
    for (let i = 0; i < segmentResults.length; i++) {
      const result = segmentResults[i];
      if (result?.modules?.length > 0) {
        try {
          const { moduleCount, nextOrderIndex } = await insertModuleResults(docId, [result], nextOrder);
          nextOrder = nextOrderIndex;
          totalGenerated += moduleCount;
          console.log(`[moduleGenerator] Background seg ${i + 2}/${segments.length}: +${moduleCount} modules (running total: ${totalGenerated})`);
        } catch (err) {
          console.error(`[moduleGenerator] Failed to insert modules for segment ${i + 2}:`, err.message);
        }
      }
    }

    console.log(`[moduleGenerator] Background complete: +${totalGenerated} modules for doc ${docId.slice(0, 8)}`);
  } catch (err) {
    console.error(`[moduleGenerator] Background generation failed for ${docId.slice(0, 8)}:`, err.message);
  } finally {
    _generatingDocs.delete(docId);
  }
}

/**
 * Legacy single-pass generation — kept for small documents where splitting
 * isn't needed. Calls initial + remaining sequentially.
 */
async function generateModules(docId, documentText, userId = null) {
  const segments = splitIntoSegments(documentText, SEGMENT_SIZE);

  if (segments.length <= 1) {
    // Small doc — single pass, no background needed
    const [teachingLevel, interests] = await Promise.all([
      getUserTeachingLevel(userId),
      getUserInterests(userId),
    ]);
    const result = await generateModulesForSegment(documentText, 0, 1, teachingLevel, interests);
    await insertModuleResults(docId, [result], 0);
    return await getModulesByDocument(docId);
  }

  // Large doc — initial fast, then remaining
  await generateInitialModules(docId, documentText, userId);
  await generateRemainingModules(docId, documentText, userId);
  return await getModulesByDocument(docId);
}

async function getModulesByDocument(docId) {
  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .eq('document_id', docId)
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Fetch all questions for these modules in a single query
  const moduleIds = rows.map(r => r.id);
  const { data: allQuestions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .in('module_id', moduleIds);
  if (qErr) throw qErr;

  // Group questions by module_id
  const questionsByModule = {};
  for (const q of (allQuestions || [])) {
    if (!questionsByModule[q.module_id]) questionsByModule[q.module_id] = [];
    questionsByModule[q.module_id].push(q);
  }

  return rows.map(row => formatModule(row, questionsByModule[row.id] || []));
}

async function getModuleById(moduleId) {
  const { data: row, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('module_id', moduleId);
  if (qErr) throw qErr;

  return formatModule(row, questions || []);
}

async function getAllModules() {
  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Fetch all questions in a single query
  const moduleIds = rows.map(r => r.id);
  const { data: allQuestions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .in('module_id', moduleIds);
  if (qErr) throw qErr;

  const questionsByModule = {};
  for (const q of (allQuestions || [])) {
    if (!questionsByModule[q.module_id]) questionsByModule[q.module_id] = [];
    questionsByModule[q.module_id].push(q);
  }

  return rows.map(row => formatModule(row, questionsByModule[row.id] || []));
}

async function deleteModulesByDocument(docId) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('document_id', docId);
  if (error) throw error;
}

function formatModule(row, questionRows) {
  return {
    id: row.id,
    documentId: row.document_id,
    orderIndex: row.order_index,
    title: row.title,
    topic: row.topic,
    objectives: row.objectives,
    content: row.content,
    takeaways: row.takeaways,
    questions: questionRows.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
      topic: q.topic,
    })),
    createdAt: row.created_at,
  };
}

/**
 * Enrich existing modules with web research resources.
 * Appends a "Supplementary Resources" markdown section to each module's content.
 */
async function enrichModulesWithResources(docId) {
  const { getResourcesByDocument } = require('./webResearchService');
  const resources = await getResourcesByDocument(docId);
  if (resources.length === 0) return;

  const modules = await getModulesByDocument(docId);

  // Build all updates, then execute in parallel
  const updates = [];
  for (const mod of modules) {
    const relevant = resources.filter(r => {
      if (!r.topic || !mod.topic) return false;
      const rTopic = r.topic.toLowerCase();
      const mTopic = mod.topic.toLowerCase();
      return rTopic.includes(mTopic) || mTopic.includes(rTopic);
    });

    if (relevant.length === 0) continue;

    const resourceSection = '\n\n---\n\n### Supplementary Resources\n\n' +
      '*These external resources are optional further reading to complement your study materials above. Your uploaded materials remain the primary source for this course.*\n\n' +
      relevant.slice(0, 5).map(r => {
        const link = r.url ? `[${r.title}](${r.url})` : `**${r.title}**`;
        return `- ${link} *(${r.resourceType})* — ${r.snippet || ''}`;
      }).join('\n');

    updates.push(
      supabase.from('modules').update({ content: mod.content + resourceSection }).eq('id', mod.id)
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

async function regenerateQuestions(moduleId, userId = null) {
  const mod = await getModuleById(moduleId);
  if (!mod) throw new Error('Module not found');

  const teachingLevel = await getUserTeachingLevel(userId);

  // Format previous questions for the prompt
  const prevQuestionsText = mod.questions
    .map(q => `- [${q.type}] ${q.question}`)
    .join('\n');

  const prompt = QUESTION_REGENERATION_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{module_content}', mod.content)
    .replace('{previous_questions}', prevQuestionsText)
    .replace(/\{topic\}/g, mod.topic || mod.title);

  const { selectModelTier } = require('../config/gemini');
  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse question regeneration response as JSON');
  }

  // Delete old questions
  const { error: delErr } = await supabase
    .from('questions')
    .delete()
    .eq('module_id', moduleId);
  if (delErr) throw delErr;

  // Insert new questions
  const newQuestions = (parsed.questions || []).map(q => ({
    id: uuidv4(),
    module_id: moduleId,
    type: q.type,
    question: q.question,
    options: q.options || null,
    correct: q.correct,
    explanation: q.explanation || null,
    topic: q.topic || mod.topic,
  }));

  if (newQuestions.length > 0) {
    const { error: insErr } = await supabase.from('questions').insert(newQuestions);
    if (insErr) throw insErr;
  }

  // Return updated module
  return await getModuleById(moduleId);
}

module.exports = {
  generateModules,
  generateInitialModules,
  generateRemainingModules,
  isGeneratingModules,
  getModulesByDocument,
  getModuleById,
  getAllModules,
  deleteModulesByDocument,
  enrichModulesWithResources,
  regenerateQuestions,
};
