const supabase = require('../config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
const { MODULE_GENERATION_PROMPT, MODULE_OUTLINE_PROMPT, MODULE_BATCH_GENERATION_PROMPT, QUESTION_REGENERATION_PROMPT, buildInterestsSection, buildLearningStyleSection, buildPaceSection, buildLegalGroundingSection, getModuleDepthSection, getQuizDepthSection, PEDAGOGY_CORE, BACKWARD_DESIGN_BLOCK, RETRIEVAL_PRACTICE_BLOCK, QUIZ_HYGIENE_BLOCK, buildMissionSection, buildLearnerStateSection, buildFocusSection, buildInterleavingSection } = require('../utils/prompts');
const { getUserTeachingLevel, getUserInterests, getEffectiveLearningStyle, getEffectiveLearningPace } = require('./userProfileService');
const { prepareTextForLLM } = require('./chunkingService');
const { moduleCache } = require('../config/cache');
const { v4: uuidv4 } = require('uuid');
const { extractJSON, tryExtractArrayItems } = require('../utils/jsonHelper');

// Max chars per LLM segment — Gemini Flash handles large contexts,
// but keeping segments reasonable ensures quality per-segment output.
const SEGMENT_SIZE = 40000;
const MAX_CONCURRENCY = 3;
const BATCH_SIZE = 3;         // modules per LLM batch call in two-phase generation
const BATCH_CONCURRENCY = 8;  // parallel batch calls within a segment — sized so a typical segment lands in ONE wave (key pool supports ~210 concurrent)

// Questions generated inline with a module. The full quiz is generated lazily
// when the student actually opens it, which both removes ~40% of upload-time
// output tokens and lets the distractors be built from that learner's real
// past mistakes. One inline question keeps the retrieval-practice loop intact.
const INLINE_QUESTION_COUNT = 1;
const FULL_QUIZ_QUESTION_COUNT = 5;

/**
 * Content length for a module, chosen by learner rather than by subject.
 *
 * Generation time is roughly linear in output tokens, so this is the single
 * biggest latency lever — but the reason it defaults short is pedagogical: a
 * 1200-word wall of text is the failure mode this platform exists to fix.
 * Depth is earned by learners who have demonstrated they want it.
 */
function getContentWordRange(teachingLevel, pedagogyOpts = {}) {
  const wantsDepth = teachingLevel === 'advanced';
  const needsShort = pedagogyOpts.focusMode || pedagogyOpts.learnerState?.pace === 'slow';
  if (needsShort) return '250-400 words';
  if (wantsDepth) return '600-1200 words';
  return '300-500 words';
}

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
 * Fill every pedagogy placeholder on a prompt template.
 *
 * `opts` carries adaptive, learner-specific context. When it is absent — the
 * normal case for a brand-new document — the learner-specific sections collapse
 * to empty strings and the prompt degrades cleanly to its non-adaptive form,
 * while the universal teaching principles still apply.
 *
 * @param {string} prompt Template containing pedagogy placeholders.
 * @param {object} [opts]
 * @param {string} [opts.mission] Why this student is studying the material.
 * @param {object} [opts.learnerState] See buildLearnerStateSection.
 * @param {boolean} [opts.focusMode] Attention accommodations (ADHD focus mode).
 * @param {string[]} [opts.priorTopics] Earlier topics to interleave into practice.
 */
function applyPedagogy(prompt, opts = {}) {
  const { mission, learnerState, focusMode, priorTopics } = opts;
  return prompt
    .replace('{pedagogy_section}', `${PEDAGOGY_CORE}${BACKWARD_DESIGN_BLOCK}${RETRIEVAL_PRACTICE_BLOCK}`)
    .replace('{quiz_hygiene_section}', QUIZ_HYGIENE_BLOCK)
    .replace('{mission_section}', buildMissionSection(mission))
    .replace('{learner_state_section}', buildLearnerStateSection(learnerState))
    .replace('{focus_section}', buildFocusSection(focusMode))
    .replace('{interleaving_section}', buildInterleavingSection(priorTopics));
}

/**
 * Phase 1: Generate a curriculum outline for a text segment.
 * Returns an array of { title, topic, description } — small output, fast.
 */
async function generateOutlineForSegment(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace) {
  const wordCount = segmentText.split(/\s+/).length;
  const targetModules = Math.max(5, Math.round(wordCount / 2000));
  const minModules = Math.max(3, Math.round(wordCount / 4000));

  const segmentNote = totalSegments > 1
    ? `\n\nNote: This is section ${segmentIndex + 1} of ${totalSegments} from the document. Create modules only for topics in THIS section.\n`
    : '';

  const { depthSection, domain } = getModuleDepthSection(segmentText);
  if (domain) {
    console.log(`[moduleGenerator] Detected domain: ${domain} — applying depth-enhanced generation`);
  }

  const prompt = MODULE_OUTLINE_PROMPT
    .replace('{document_text}', segmentText + segmentNote)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests, teachingLevel))
    .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
    .replace('{pace_section}', buildPaceSection(learningPace))
    .replace('{legal_grounding_section}', buildLegalGroundingSection(segmentText))
    .replace('{depth_section}', depthSection)
    .replace('{word_count}', String(wordCount))
    .replace('{target_modules}', String(targetModules))
    .replace('{min_modules}', String(minModules));

  const result = await withRetryOnRateLimit(async () => {
    // Outline is structurally simple (titles/topics) — use the faster lite tier,
    // with thinking disabled so the budget goes to JSON rather than reasoning.
    const model = getGenerativeModel('fast_lite');
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
    });
  }, 3, 1);
  const text = result.response.text();
  const parsed = extractJSON(text);
  return parsed?.modules || [];
}

// Deprecated local logic replaced by shared jsonHelper utility


/**
 * Phase 2: Generate full module content for a batch of outlined modules.
 * Each batch is typically 3 modules — keeps output manageable per LLM call.
 */
async function generateModuleBatch(segmentText, fullOutline, batchModules, batchStart, teachingLevel, interests, learningStyle, learningPace, pedagogyOpts = {}) {
  const outlineText = fullOutline
    .map((m, i) => `${i + 1}. "${m.title}" [${m.topic}]: ${m.description}`)
    .join('\n');

  const batchText = batchModules
    .map((m, i) => `${batchStart + i + 1}. "${m.title}" [${m.topic}]: ${m.description}`)
    .join('\n');

  const { depthSection } = getModuleDepthSection(segmentText);
  const quizDepthSection = getQuizDepthSection(segmentText);
  const contentWordRange = getContentWordRange(teachingLevel, pedagogyOpts);
  const questionCount = pedagogyOpts.questionCount ?? INLINE_QUESTION_COUNT;

  const prompt = applyPedagogy(MODULE_BATCH_GENERATION_PROMPT, pedagogyOpts)
    .replace('{question_count}', String(questionCount))
    .replace('{document_text}', segmentText)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests, teachingLevel))
    .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
    .replace('{pace_section}', buildPaceSection(learningPace))
    .replace('{legal_grounding_section}', buildLegalGroundingSection(segmentText))
    .replace('{depth_section}', depthSection)
    .replace('{content_word_range}', contentWordRange)
    .replace('{quiz_depth_section}', quizDepthSection)
    .replace('{full_outline}', outlineText)
    .replace('{batch_modules}', batchText);

  const result = await withRetryOnRateLimit(async () => {
    // Model + config here were derived from measurement, not preference:
    //
    // gemini-2.5-flash is a reasoning model and its THINKING tokens count against
    // maxOutputTokens. A measured batch hit MAX_TOKENS having emitted only ~669
    // visible tokens of a 16384 budget — the rest went to internal reasoning. The
    // JSON was therefore always truncated, always failed to parse, and always
    // retried, which is what turned a ~25s batch into ~148s.
    //
    // thinkingBudget: 0 removes that failure mode (measured finishReason STOP
    // rather than MAX_TOKENS). flash-lite additionally measured 4.3x faster
    // (15.7s vs 67.7s) with better JSON compliance (3/3 modules parsed vs 2/3),
    // because it does not reason before answering — which structured extraction
    // does not need.
    const model = getGenerativeModel('fast_lite');
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  }, 3, 1);
  const text = result.response.text();
  const modules = tryExtractArrayItems(text, 'modules');
  if (modules.length === 0) {
    console.warn(`[moduleGenerator] Batch ${batchStart + 1} failed to parse JSON. Text: ${text.slice(0, 100)}...`);
    throw new Error('Failed to parse module batch');
  }
  return { modules };
}

/**
 * Legacy single-call generation — used as fallback when two-phase fails.
 */
async function generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace, pedagogyOpts = {}) {
  const segmentNote = totalSegments > 1
    ? `\n\nNote: This is section ${segmentIndex + 1} of ${totalSegments} from the document. Create modules only for the topics in THIS section.\n`
    : '';

  const { depthSection } = getModuleDepthSection(segmentText);
  const quizDepthSection = getQuizDepthSection(segmentText);
  const contentWordRange = getContentWordRange(teachingLevel, pedagogyOpts);
  const questionCount = pedagogyOpts.questionCount ?? INLINE_QUESTION_COUNT;

  const prompt = applyPedagogy(MODULE_GENERATION_PROMPT, pedagogyOpts)
    .replace('{question_count}', String(questionCount))
    .replace('{document_text}', segmentText + segmentNote)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests, teachingLevel))
    .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
    .replace('{pace_section}', buildPaceSection(learningPace))
    .replace('{legal_grounding_section}', buildLegalGroundingSection(segmentText))
    .replace('{depth_section}', depthSection)
    .replace('{content_word_range}', contentWordRange)
    .replace('{quiz_depth_section}', quizDepthSection);

  const result = await withRetryOnRateLimit(async () => {
    // 'fast_lite', matching the primary path. Measured against a real 40k-char
    // segment, 2.5-flash took 46.2s and returned output that would not parse,
    // while 2.5-flash-lite produced a complete module in 7.2s. This is the
    // fallback that runs when two-phase generation has already failed, so it is
    // the last place that can afford to be slow or unreliable.
    const model = getGenerativeModel('fast_lite');
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 }, // see generateModuleBatch for why
      },
    });
  }, 3, 1);
  const text = result.response.text();
  try {
    return { modules: tryExtractArrayItems(text, 'modules') };
  } catch (e) {
    console.error(`[moduleGenerator] Legacy salvage failed for segment ${segmentIndex + 1}:`, e.message);
    return { modules: [] };
  }
}

/**
 * Two-phase module generation for a single text segment.
 * Phase 1: Generate outline (determines module count proportional to content).
 * Phase 2: Generate full modules in parallel batches of BATCH_SIZE.
 * Falls back to legacy single-call on outline failure.
 */
async function generateModulesForSegment(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace) {
  const wordCount = segmentText.split(/\s+/).length;

  // Phase 1: Generate curriculum outline
  let outline;
  try {
    outline = await withRetry(
      () => generateOutlineForSegment(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace),
      2, // Increased from 1
      `Outline seg-${segmentIndex + 1}`
    );
    console.log(`[moduleGenerator] Segment ${segmentIndex + 1}/${totalSegments}: outline → ${outline.length} modules (${wordCount} words)`);
  } catch (err) {
    console.error(`[moduleGenerator] Outline failed for segment ${segmentIndex + 1}, falling back to single-call:`, err.message);
    return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace);
  }

  if (!outline || outline.length === 0) {
    console.warn(`[moduleGenerator] Empty outline for segment ${segmentIndex + 1}, falling back`);
    return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace);
  }

  // For very small outlines (≤ BATCH_SIZE), generate all in one call
  if (outline.length <= BATCH_SIZE) {
    try {
      const result = await withRetry(
        () => generateModuleBatch(segmentText, outline, outline, 0, teachingLevel, interests, learningStyle, learningPace),
        2, // Increased from 1
        `Single-batch seg-${segmentIndex + 1}`
      );
      console.log(`[moduleGenerator] Segment ${segmentIndex + 1}: ${result.modules?.length || 0} modules (single batch)`);
      return result;
    } catch (err) {
      console.error(`[moduleGenerator] Single-batch failed for segment ${segmentIndex + 1}, falling back:`, err.message);
      return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace);
    }
  }

  // Phase 2: Generate modules in parallel batches.
  //
  // High-depth domains used to halve the batch size to avoid truncation at the
  // old 8192 output-token cap. With the cap now at 16384 and modules defaulting
  // to 300-500 words with one inline question, that guard is over-tuned: it was
  // doubling the batch count (and therefore the number of sequential waves) for
  // no benefit. Measured at 8 batches / 2 waves / 247s before this change.
  const effectiveBatchSize = BATCH_SIZE;
  
  const batches = [];
  for (let i = 0; i < outline.length; i += effectiveBatchSize) {
    batches.push({ start: i, items: outline.slice(i, i + effectiveBatchSize) });
  }

  const batchTasks = batches.map(({ start, items }) => async () => {
    try {
      return await withRetry(
        () => generateModuleBatch(segmentText, outline, items, start, teachingLevel, interests, learningStyle, learningPace),
        2, // Increased from 1
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

  // If every batch failed or returned nothing, fall back to the single-call approach
  if (allModules.length === 0) {
    console.warn(`[moduleGenerator] All batches returned 0 modules for segment ${segmentIndex + 1}, falling back to legacy single-call`);
    return generateModulesForSegmentLegacy(segmentText, segmentIndex, totalSegments, teachingLevel, interests, learningStyle, learningPace);
  }

  return { modules: allModules };
}

/**
 * Insert parsed module results into the DB, starting at the given orderIndex.
 * Returns the next orderIndex to use.
 * @param {string} docId - Document ID
 * @param {Array} segmentResults - Array of { modules: [...] } objects
 * @param {number} startOrderIndex - Starting order index
 * @param {Object} [opts] - Optional: { courseId, sourceDocuments, userId }
 */
async function insertModuleResults(docId, segmentResults, startOrderIndex, opts = {}) {
  const allModuleRows = [];
  const allQuestionRows = [];
  let orderIndex = startOrderIndex;

  for (const parsed of segmentResults) {
    for (const mod of (parsed.modules || [])) {
      const id = uuidv4();
      const topic = mod.topic || mod.title;

      const row = {
        id,
        document_id: docId,
        order_index: orderIndex++,
        title: mod.title || 'Untitled Module',
        topic: mod.topic || mod.title || 'General',
        objectives: Array.isArray(mod.objectives) ? mod.objectives : [],
        content: mod.content || 'Content generation failed for this section.',
        takeaways: Array.isArray(mod.takeaways) ? mod.takeaways : [],
        // Pedagogy metadata (backward design): the outcome the module teaches and
        // its Bloom level. Nullable — older/stripped generations may omit them.
        outcome: mod.outcome || null,
        bloom_level: mod.bloomLevel || null,
      };

      if (opts.courseId) row.course_id = opts.courseId;
      if (opts.sourceDocuments) row.source_documents = opts.sourceDocuments;

      allModuleRows.push(row);

      const questions = mod.questions || mod.comprehension_questions || mod.comprehensionQuestions || [];
      for (const q of questions) {
        if (!q.question) continue; // Skip truly empty objects

        const qType = q.type || (q.options ? 'multiple_choice' : 'true_false');
        const qOptions = Array.isArray(q.options) ? q.options : (qType === 'multiple_choice' ? ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'] : null);
        const qCorrect = String(q.correct || (qType === 'true_false' ? 'true' : 'A'));

        allQuestionRows.push({
          id: uuidv4(),
          module_id: id,
          type: qType,
          question: q.question,
          options: qOptions,
          correct: qCorrect,
          explanation: q.explanation || 'Answer based on the module content.',
          misconception: q.misconception || null,
          topic: q.topic || row.topic,
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

  // Invalidate module caches after writes
  moduleCache.del(`byDoc:${docId}`);
  moduleCache.del('allModules');

  // Background enrichment for each inserted module (diagrams + medical resources)
  if (allModuleRows.length > 0) {
    const userId = opts.userId || null;

    // Background diagrams
    setImmediate(async () => {
      try {
        const { generateModuleDiagrams } = require('./diagramGenerationService');
        const { getUserTeachingLevel, getUserInterests } = require('./userProfileService');
        const [teachingLevel, interests] = await Promise.all([
          getUserTeachingLevel(userId),
          getUserInterests(userId),
        ]);

        await runWithConcurrency(
          allModuleRows.map(row => async () => {
            try {
              await generateModuleDiagrams(
                row.id, docId, row.topic || row.title,
                row.content, teachingLevel, interests, userId
              );
            } catch (err) {
              console.warn(`[moduleGenerator] Background diagram gen failed for module ${row.id.slice(0, 8)}: ${err.message}`);
            }
          }),
          3   // max 3 concurrent diagram jobs
        );
        console.log(`[moduleGenerator] Background diagram generation complete for ${allModuleRows.length} modules`);
      } catch (err) {
        console.error(`[moduleGenerator] Background diagram generation error: ${err.message}`);
      }
    });

    // Background resource enrichment — medical for clinical docs, web for everything else.
    setImmediate(async () => {
      try {
        const { enrichModuleWithMedicalResources, enrichModuleWithWebResources, quickMedicalCheck } = require('./medicalResourceService');

        // Quick check: require ≥2 keyword hits to qualify as medical material.
        const sampleContent = allModuleRows.slice(0, 3).map(r => r.content).join(' ');
        const confidence = quickMedicalCheck(sampleContent);
        const isMedical = confidence >= 0.4;

        if (isMedical) {
          console.log(`[moduleGenerator] Medical content detected (confidence: ${confidence.toFixed(2)}) — enriching with clinical references`);
          await runWithConcurrency(
            allModuleRows.map(row => async () => {
              try {
                await enrichModuleWithMedicalResources({
                  moduleId: row.id,
                  documentId: docId,
                  topic: row.topic || row.title,
                  content: row.content,
                  userId,
                });
              } catch (err) {
                console.warn(`[moduleGenerator] Medical enrichment failed for module ${row.id.slice(0, 8)}: ${err.message}`);
              }
            }),
            2
          );
          console.log(`[moduleGenerator] Medical resource enrichment complete for ${allModuleRows.length} modules`);
        } else {
          console.log(`[moduleGenerator] Non-medical content (confidence: ${confidence.toFixed(2)}) — enriching with web references`);
          // Only enrich the first 3 modules to keep costs low; the rest use similar sources
          await runWithConcurrency(
            allModuleRows.slice(0, 3).map(row => async () => {
              try {
                await enrichModuleWithWebResources({
                  moduleId: row.id,
                  documentId: docId,
                  topic: row.topic || row.title,
                  content: row.content,
                  userId,
                });
              } catch (err) {
                console.warn(`[moduleGenerator] Web enrichment failed for module ${row.id.slice(0, 8)}: ${err.message}`);
              }
            }),
            2
          );
          console.log(`[moduleGenerator] Web resource enrichment complete`);
        }
      } catch (err) {
        console.error(`[moduleGenerator] Resource enrichment error: ${err.message}`);
      }
    });
  }

  return { moduleCount: allModuleRows.length, nextOrderIndex: orderIndex };
}

/**
 * Generate only the initial batch of modules (first segment) so the user
 * can start learning immediately. Returns quickly.
 */
async function generateInitialModules(docId, documentText, userId = null) {
  // Mark as generating from the very start so the frontend knows modules are in progress
  _generatingDocs.add(docId);

  // ── Guard: detect empty / near-empty text extraction ─────────────────────
  // This happens with scanned PDFs (image-only, no text layer) or corrupt files.
  // Without this check the LLM receives an empty prompt and generates generic
  // garbage about "what a document is" — completely useless to the student.
  const cleanedText = (documentText || '').trim();
  const MIN_MEANINGFUL_CHARS = 300;

  if (cleanedText.length < MIN_MEANINGFUL_CHARS) {
    _generatingDocs.delete(docId);
    const reason = cleanedText.length === 0
      ? 'No text could be extracted from this file.'
      : `Only ${cleanedText.length} characters extracted — the file may be a scanned image PDF with no text layer.`;
    console.warn(`[moduleGenerator] ${docId.slice(0, 8)} skipped module generation: ${reason}`);
    throw new Error(
      `Unable to generate study modules: ${reason} ` +
      `If this is a scanned document, please use a PDF with a text layer (OCR'd) or copy-paste the text as a .txt file.`
    );
  }

  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const segments = splitIntoSegments(documentText, SEGMENT_SIZE);
  const totalSegments = segments.length;
  console.log(`[moduleGenerator] Document split into ${totalSegments} segment(s) (${documentText.length} chars total)`);

  // Generate modules from the first segment only
  const firstResult = await generateModulesForSegment(segments[0], 0, totalSegments, teachingLevel, interests, learningStyle, learningPace);
  const { moduleCount } = await insertModuleResults(docId, [firstResult], 0, { userId });

  console.log(`[moduleGenerator] Initial batch: ${moduleCount} modules from segment 1/${totalSegments}`);

  // For single-segment documents, generation is done after initial modules
  if (totalSegments <= 1) {
    _generatingDocs.delete(docId);
  }

  return { moduleCount, totalSegments };
}

/**
 * Generate modules for all remaining segments (2..N) in the background.
 * Each segment is processed with the two-phase approach and results are
 * inserted per-segment so the frontend can poll for progressive updates.
 * Individual segment failures are caught and logged — they don't kill the pipeline.
 */
async function generateRemainingModules(docId, documentText, userId = null) {
  // Skip if text is too short (matches guard in generateInitialModules)
  if (!documentText || documentText.trim().length < 300) return;

  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const segments = splitIntoSegments(documentText, SEGMENT_SIZE);
  if (segments.length <= 1) return; // nothing more to generate

  // _generatingDocs.add(docId) is already called by generateInitialModules
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

    // Process segments one by one — each is generated and inserted immediately
    // so the frontend sees modules appearing progressively via polling.
    // Within each segment, batch LLM calls still run in parallel for speed.
    for (let idx = 0; idx < remaining.length; idx++) {
      try {
        const result = await generateModulesForSegment(
          remaining[idx], idx + 1, segments.length, teachingLevel, interests, learningStyle, learningPace
        );
        if (result?.modules?.length > 0) {
          const { moduleCount, nextOrderIndex } = await insertModuleResults(docId, [result], nextOrder, { userId });
          nextOrder = nextOrderIndex;
          totalGenerated += moduleCount;
          console.log(`[moduleGenerator] Segment ${idx + 2}/${segments.length}: +${moduleCount} modules (running total: ${totalGenerated})`);
        }
      } catch (err) {
        console.error(`[moduleGenerator] Segment ${idx + 2}/${segments.length} failed:`, err.message);
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
    const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
      getUserTeachingLevel(userId),
      getUserInterests(userId),
      getEffectiveLearningStyle(userId),
      getEffectiveLearningPace(userId),
    ]);
    const result = await generateModulesForSegment(documentText, 0, 1, teachingLevel, interests, learningStyle, learningPace);
    await insertModuleResults(docId, [result], 0, { userId });
    return await getModulesByDocument(docId);
  }

  // Large doc — initial fast, then remaining
  await generateInitialModules(docId, documentText, userId);
  await generateRemainingModules(docId, documentText, userId);
  return await getModulesByDocument(docId);
}

async function getModulesByDocument(docId) {
  const cacheKey = `byDoc:${docId}`;
  const cached = moduleCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .eq('document_id', docId)
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) {
    moduleCache.set(cacheKey, []);
    return [];
  }

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

  const result = rows.map(row => formatModule(row, questionsByModule[row.id] || []));
  moduleCache.set(cacheKey, result);
  return result;
}

async function getModuleById(moduleId) {
  const cacheKey = `mod:${moduleId}`;
  const cached = moduleCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data: row, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (error && error.code === 'PGRST116') {
    moduleCache.set(cacheKey, null);
    return null;
  }
  if (error) throw error;

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('module_id', moduleId);
  if (qErr) throw qErr;

  const result = formatModule(row, questions || []);
  moduleCache.set(cacheKey, result);
  return result;
}

async function getAllModules() {
  const cacheKey = 'allModules';
  const cached = moduleCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) {
    moduleCache.set(cacheKey, []);
    return [];
  }

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

  const result = rows.map(row => formatModule(row, questionsByModule[row.id] || []));
  moduleCache.set(cacheKey, result);
  return result;
}

async function getModulesByCourse(courseId) {
  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

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
  const mod = {
    id: row.id,
    documentId: row.document_id,
    orderIndex: row.order_index,
    title: row.title,
    topic: row.topic,
    objectives: row.objectives,
    content: row.content,
    takeaways: row.takeaways,
    outcome: row.outcome || null,
    bloomLevel: row.bloom_level || null,
    contentStatus: row.content_status || 'ready',
    isIntro: row.is_intro === true,
    version: row.version || 1,
    regenReason: row.regen_reason || null,
    regeneratedAt: row.regenerated_at || null,
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
  mod.moduleType = row.module_type || 'standard';
  mod.parentModuleId = row.parent_module_id || null;
  if (row.course_id) mod.courseId = row.course_id;
  if (row.source_documents) mod.sourceDocuments = row.source_documents;
  return mod;
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

  const quizDepthSection = getQuizDepthSection(mod.content);

  const prompt = QUESTION_REGENERATION_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{module_content}', mod.content)
    .replace('{quiz_depth_section}', quizDepthSection)
    .replace('{previous_questions}', prevQuestionsText)
    .replace(/\{topic\}/g, mod.topic || mod.title);

  const { selectModelTier } = require('../config/gemini');
  const result = await withRetryOnRateLimit(async () => {
    const tier = selectModelTier({});
    const model = getGenerativeModel(tier);
    return model.generateContent(prompt);
  }, 3, 1);
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

  // Invalidate caches so next fetch reflects new questions
  moduleCache.del(`mod:${moduleId}`);
  moduleCache.del('allModules');

  // Return updated module
  return await getModuleById(moduleId);
}

/**
 * Regenerate ONE existing module, taught differently for this specific learner.
 *
 * Grounded on the module's OWN current content — the facts stay the same, the
 * teaching changes. What makes the new version different is `pedagogyOpts`:
 * the learner's misconceptions, how many times they've already failed this
 * material (attemptNumber), their pace, and their preferred analogy domain.
 * Because attemptNumber > 1 triggers the "do not restate the previous
 * explanation" rule in the prompt, the rewrite is forced to change approach.
 *
 * Returns a parsed module object ({ title, topic, outcome, bloomLevel,
 * objectives, content, takeaways, questions }). Does NOT write to the DB —
 * adaptiveLearningService owns the archive-and-swap.
 */
async function regenerateModuleContent(module, userId, pedagogyOpts = {}) {
  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const takeaways = Array.isArray(module.takeaways) ? module.takeaways.join('\n- ') : '';
  const grounding = `${module.content || ''}\n\nKey points:\n- ${takeaways}`;
  const outline = [{
    title: module.title,
    topic: module.topic || module.title,
    description: Array.isArray(module.objectives)
      ? module.objectives.join('; ')
      : (module.objectives || ''),
  }];

  const { modules } = await generateModuleBatch(
    grounding, outline, outline, 0,
    teachingLevel, interests, learningStyle, learningPace,
    pedagogyOpts,
  );
  if (!modules || !modules.length) throw new Error('Regeneration produced no module');
  return modules[0];
}

// ─── Progressive (skeleton-first) generation ──────────────────
//
// The outline is persisted IMMEDIATELY as "pending" module rows, so the student
// sees the whole course map within seconds instead of staring at a spinner until
// every batch has finished. Content batches then UPDATE those rows in place.
//
// This ordering also removes the order_index collision hazard that previously
// made per-batch writes unsafe: rows are inserted once, in order, up front, and
// afterwards only updated — so there are no concurrent inserts to collide.

/**
 * Persist an outline as pending skeleton modules.
 *
 * The outline's description is stored as placeholder content so a student who
 * opens a not-yet-written module still has something meaningful to read, rather
 * than an empty page.
 *
 * @returns {Promise<object[]>} the inserted rows, in order
 */
async function insertSkeletonModules(docId, outline, startOrderIndex, opts = {}) {
  const rows = outline.map((m, i) => ({
    id: uuidv4(),
    document_id: docId,
    order_index: startOrderIndex + i,
    title: m.title || 'Untitled Module',
    topic: m.topic || m.title || 'General',
    objectives: [],
    content: m.description || 'This lesson is being written…',
    takeaways: [],
    content_status: 'pending',
    ...(opts.courseId ? { course_id: opts.courseId } : {}),
    ...(opts.sourceDocuments ? { source_documents: opts.sourceDocuments } : {}),
  }));

  const { error } = await supabase.from('modules').insert(rows);
  if (error) throw error;

  moduleCache.del(`byDoc:${docId}`);
  moduleCache.del('allModules');
  return rows;
}

/**
 * Match generated modules back onto their skeleton rows.
 *
 * Prefers title matching over positional matching because a model may return
 * fewer modules than requested, or return them reordered; blindly zipping by
 * index would then write content onto the wrong lesson.
 */
function pairGeneratedWithSkeletons(skeletons, generated) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const unused = [...generated];
  const pairs = [];

  for (const row of skeletons) {
    const key = norm(row.title);
    let idx = unused.findIndex(g => norm(g.title) === key);
    if (idx === -1) idx = unused.findIndex(g => norm(g.title).includes(key) || key.includes(norm(g.title)));
    if (idx === -1) continue;
    pairs.push({ row, gen: unused[idx] });
    unused.splice(idx, 1);
  }

  // Anything left unmatched falls back to filling remaining skeletons in order.
  const matched = new Set(pairs.map(p => p.row.id));
  const leftovers = skeletons.filter(r => !matched.has(r.id));
  leftovers.forEach((row, i) => {
    if (unused[i]) pairs.push({ row, gen: unused[i] });
  });

  return pairs;
}

/**
 * Generate content for one batch of skeleton rows and write it in place.
 * Marks the rows 'ready' on success, 'failed' on error so they can be retried
 * rather than sitting pending forever.
 */
async function fillSkeletonBatch(skeletons, segmentText, fullOutline, batchStart, profile, pedagogyOpts = {}) {
  const { teachingLevel, interests, learningStyle, learningPace } = profile;
  const ids = skeletons.map(r => r.id);

  await supabase.from('modules')
    .update({ generation_started_at: new Date().toISOString() })
    .in('id', ids);

  const items = skeletons.map(r => ({ title: r.title, topic: r.topic, description: r.content }));

  let generated;
  try {
    const result = await withRetry(
      () => generateModuleBatch(segmentText, fullOutline, items, batchStart, teachingLevel, interests, learningStyle, learningPace, pedagogyOpts),
      2,
      `Fill ${batchStart + 1}-${batchStart + items.length}`,
    );
    generated = result.modules || [];
  } catch (err) {
    console.error(`[moduleGenerator] Fill failed for batch ${batchStart + 1}: ${err.message}`);
    await supabase.from('modules').update({ content_status: 'failed' }).in('id', ids);
    return 0;
  }

  const pairs = pairGeneratedWithSkeletons(skeletons, generated);
  const questionRows = [];

  await Promise.all(pairs.map(({ row, gen }) => {
    for (const q of (gen.questions || [])) {
      if (!q.question) continue;
      const qType = q.type || (q.options ? 'multiple_choice' : 'true_false');
      questionRows.push({
        id: uuidv4(),
        module_id: row.id,
        type: qType,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : null,
        correct: String(q.correct ?? (qType === 'true_false' ? 'true' : 'A')),
        explanation: q.explanation || 'Answer based on the module content.',
        misconception: q.misconception || null,
        topic: q.topic || row.topic,
      });
    }
    return supabase.from('modules').update({
      content: gen.content || row.content,
      objectives: Array.isArray(gen.objectives) ? gen.objectives : [],
      takeaways: Array.isArray(gen.takeaways) ? gen.takeaways : [],
      outcome: gen.outcome || null,
      bloom_level: gen.bloomLevel || null,
      content_status: 'ready',
    }).eq('id', row.id);
  }));

  if (questionRows.length) {
    const { error } = await supabase.from('questions').insert(questionRows);
    if (error) console.warn(`[moduleGenerator] Question insert failed: ${error.message}`);
  }

  // Any skeleton the model simply didn't return content for.
  const filled = new Set(pairs.map(p => p.row.id));
  const missed = ids.filter(id => !filled.has(id));
  if (missed.length) {
    await supabase.from('modules').update({ content_status: 'failed' }).in('id', missed);
  }

  moduleCache.del(`byDoc:${skeletons[0].document_id}`);
  moduleCache.del('allModules');
  pairs.forEach(p => moduleCache.del(`mod:${p.row.id}`));

  return pairs.length;
}

module.exports = {
  generateModules,
  generateInitialModules,
  generateRemainingModules,
  insertSkeletonModules,
  fillSkeletonBatch,
  pairGeneratedWithSkeletons,
  generateOutlineForSegment,
  splitIntoSegments,
  runWithConcurrency,
  getContentWordRange,
  SEGMENT_SIZE,
  BATCH_SIZE,
  BATCH_CONCURRENCY,
  INLINE_QUESTION_COUNT,
  FULL_QUIZ_QUESTION_COUNT,
  isGeneratingModules,
  getModulesByDocument,
  getModulesByCourse,
  getModuleById,
  getAllModules,
  deleteModulesByDocument,
  enrichModulesWithResources,
  regenerateQuestions,
  regenerateModuleContent,
  insertModuleResults,
};
