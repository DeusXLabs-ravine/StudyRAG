const supabase = require('../config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
const { CROSS_DOCUMENT_OUTLINE_PROMPT, CROSS_DOCUMENT_MODULE_PROMPT, buildInterestsSection, buildLearningStyleSection, buildPaceSection } = require('../utils/prompts');
const { getUserTeachingLevel, getUserInterests, getEffectiveLearningStyle, getEffectiveLearningPace } = require('./userProfileService');
const courseService = require('./courseService');
const { v4: uuidv4 } = require('uuid');

const BATCH_SIZE = 3;
const BATCH_CONCURRENCY = 2;

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
 * Generate unified modules across multiple documents in a course.
 * This is the core cross-document synthesis engine.
 */
async function generateUnifiedModules(courseId, userId = null) {
  const prefix = `[CrossDoc ${courseId.slice(0, 8)}]`;
  console.log(`${prefix} Starting unified module generation...`);

  const course = await courseService.getCourse(courseId);
  if (!course) throw new Error('Course not found');

  await courseService.updateCourseStatus(courseId, { status: 'processing' });

  try {
    // 1. Gather all source texts from course documents
    const sourceDocuments = (course.documents || []).filter(d =>
      ['source', 'syllabus'].includes(d.role) && d.status === 'ready'
    );

    if (sourceDocuments.length === 0) {
      throw new Error('No ready source documents in course');
    }

    // Fetch page content for each document
    const docTexts = {};
    const docNames = {};
    const docSummaries = [];

    for (const doc of sourceDocuments) {
      const { data: pages } = await supabase
        .from('pages')
        .select('text, page_number')
        .eq('doc_id', doc.id)
        .order('page_number');

      const fullText = (pages || []).map(p => p.text).join('\n\n');
      docTexts[doc.id] = fullText;
      docNames[doc.id] = doc.original_name || doc.id;

      // Build summary (first ~2000 chars)
      docSummaries.push({
        id: doc.id,
        name: docNames[doc.id],
        role: doc.role,
        summary: fullText.slice(0, 2000),
      });
    }

    console.log(`${prefix} Gathered ${sourceDocuments.length} source documents`);

    // 2. Generate unified outline
    const summariesText = docSummaries.map(d =>
      `[Document "${d.name}" (ID: ${d.id}, Role: ${d.role})]\n${d.summary}\n---`
    ).join('\n\n');

    let syllabusSchedule = '';
    if (course.config?.weeklyTopics?.length > 0) {
      syllabusSchedule = 'Syllabus weekly schedule:\n' +
        course.config.weeklyTopics.map(w => `Week ${w.week}: ${w.topic} (Readings: ${w.readings || 'N/A'})`).join('\n');
    }

    const outlinePrompt = CROSS_DOCUMENT_OUTLINE_PROMPT
      .replace('{document_summaries}', summariesText)
      .replace('{syllabus_schedule}', syllabusSchedule);

    const outlineResult = await withRetryOnRateLimit(async () => {
      const outlineModel = getGenerativeModel('standard');
      return outlineModel.generateContent(outlinePrompt);
    }, 3, 1);
    const outlineText = outlineResult.response.text();
    const outlineJson = outlineText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const outline = JSON.parse(outlineJson);

    const modules = outline.modules || [];
    console.log(`${prefix} Generated unified outline: ${modules.length} modules`);

    if (modules.length === 0) {
      throw new Error('Outline generation produced no modules');
    }

    // 3. Get user context for module generation
    const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
      getUserTeachingLevel(userId),
      getUserInterests(userId),
      getEffectiveLearningStyle(userId),
      getEffectiveLearningPace(userId),
    ]);

    // 4. Generate module content in batches
    const batches = [];
    for (let i = 0; i < modules.length; i += BATCH_SIZE) {
      batches.push(modules.slice(i, i + BATCH_SIZE));
    }

    const allGeneratedModules = [];

    const batchTasks = batches.map((batch) => async () => {
      const batchResults = [];

      for (const mod of batch) {
        try {
          // Gather relevant text from contributing documents
          const sourceIds = mod.sourceDocuments || Object.keys(docTexts);
          const sourceTextsArr = sourceIds.map(id => {
            const text = docTexts[id];
            if (!text) return null;
            // Extract relevant sections (first ~10000 chars per doc for this module)
            return `[From "${docNames[id]}"]\n${text.slice(0, 10000)}`;
          }).filter(Boolean);

          const prompt = CROSS_DOCUMENT_MODULE_PROMPT
            .replace('{module_title}', mod.title)
            .replace('{module_topic}', mod.topic || mod.title)
            .replace('{source_count}', String(sourceTextsArr.length))
            .replace('{source_texts}', sourceTextsArr.join('\n\n---\n\n'))
            .replace('{teaching_level}', teachingLevel)
            .replace('{interests_section}', buildInterestsSection(interests, teachingLevel))
            .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
            .replace('{pace_section}', buildPaceSection(learningPace));

          const result = await withRetryOnRateLimit(async () => {
            const model = getGenerativeModel('fast');
            return model.generateContent(prompt);
          }, 3, 1);
          const text = result.response.text();
          const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(jsonStr);

          for (const genMod of (parsed.modules || [])) {
            batchResults.push({
              ...genMod,
              sourceDocuments: mod.sourceDocuments || sourceIds,
            });
          }
        } catch (err) {
          console.error(`${prefix} Module generation failed for "${mod.title}":`, err.message);
        }
      }

      return batchResults;
    });

    const batchResults = await runWithConcurrency(batchTasks, BATCH_CONCURRENCY);

    for (const result of batchResults) {
      if (result) allGeneratedModules.push(...result);
    }

    console.log(`${prefix} Generated ${allGeneratedModules.length} unified modules`);

    // 5. Insert modules with course attribution
    // First, delete any existing course modules
    await supabase.from('modules').delete().eq('course_id', courseId);

    const moduleRows = [];
    const questionRows = [];

    for (let i = 0; i < allGeneratedModules.length; i++) {
      const mod = allGeneratedModules[i];
      const moduleId = uuidv4();
      const topic = mod.topic || mod.title;
      // Use the first contributing doc for backward compat
      const primaryDocId = mod.sourceDocuments?.[0] || sourceDocuments[0]?.id;

      moduleRows.push({
        id: moduleId,
        document_id: primaryDocId,
        course_id: courseId,
        order_index: i,
        title: mod.title,
        topic,
        objectives: mod.objectives || [],
        content: mod.content || '',
        takeaways: mod.takeaways || [],
        source_documents: mod.sourceDocuments || [],
      });

      for (const q of (mod.questions || [])) {
        questionRows.push({
          id: uuidv4(),
          module_id: moduleId,
          type: q.type,
          question: q.question,
          options: q.options || null,
          correct: q.correct,
          explanation: q.explanation || null,
          topic: q.topic || topic,
        });
      }
    }

    // Batch insert modules
    for (let i = 0; i < moduleRows.length; i += 500) {
      const batch = moduleRows.slice(i, i + 500);
      const { error } = await supabase.from('modules').insert(batch);
      if (error) throw error;
    }

    // Batch insert questions
    if (questionRows.length > 0) {
      for (let i = 0; i < questionRows.length; i += 500) {
        const batch = questionRows.slice(i, i + 500);
        const { error } = await supabase.from('questions').insert(batch);
        if (error) throw error;
      }
    }

    // 6. Mark course as ready
    await courseService.updateCourseStatus(courseId, { status: 'ready' });
    console.log(`${prefix} Course ready: ${moduleRows.length} unified modules, ${questionRows.length} questions`);

    return { moduleCount: moduleRows.length, questionCount: questionRows.length };
  } catch (err) {
    console.error(`${prefix} Unified module generation failed:`, err.message);
    await courseService.updateCourseStatus(courseId, {
      status: 'failed',
      error: err.message,
    });
    throw err;
  }
}

module.exports = { generateUnifiedModules };
