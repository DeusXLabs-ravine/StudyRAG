const supabase = require('../config/database');
const { getGenerativeModel, selectModelTier, withRetryOnRateLimit } = require('../config/gemini');
const {
  EXAM_PATTERN_ANALYSIS_PROMPT,
  STUDY_GUIDE_GENERATION_PROMPT,
  REVISION_QUESTIONS_PROMPT,
  PRACTICE_EXAM_PROMPT,
  buildInterestsSection,
  buildLearningStyleSection,
  buildPaceSection,
  getModuleDepthSection,
  getQuizDepthSection,
} = require('../utils/prompts');
const vectorStore = require('./vectorStore');
const { prepareTextForLLM } = require('./chunkingService');
const { getUserTeachingLevel, getUserInterests, getWeakTopics, getEffectiveLearningStyle, getEffectiveLearningPace } = require('./userProfileService');
const { extractTextFromBuffer } = require('./fileProcessor');
const { generateQuiz } = require('./quizGenerator');
const { v4: uuidv4 } = require('uuid');

// ─── Session CRUD ──────────────────────────────────────────

async function createSession({ documentIds, name, config = {}, userId = null }) {
  if (!documentIds || documentIds.length === 0) {
    throw new Error('At least one document is required');
  }

  const id = uuidv4();
  const row = {
    id,
    name: name || 'Exam Prep Session',
    status: 'configuring',
    document_ids: documentIds,
    config_json: config,
  };
  if (userId) row.user_id = userId;
  const { error } = await supabase.from('exam_prep_sessions').insert(row);
  if (error) throw error;

  return { id, name, status: 'configuring', documentIds, config };
}

async function getSession(sessionId) {
  const { data: session, error } = await supabase
    .from('exam_prep_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  // Fetch materials
  const { data: materials, error: matErr } = await supabase
    .from('exam_prep_materials')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (matErr) throw matErr;

  // Fetch document metadata
  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, original_name, status, file_type')
    .in('id', session.document_ids || []);
  if (docErr) throw docErr;

  return {
    id: session.id,
    name: session.name,
    status: session.status,
    documentIds: session.document_ids,
    config: session.config_json,
    analysis: session.analysis_json,
    studyGuide: session.study_guide_json,
    revisionQuestions: session.revision_questions_json,
    errorMessage: session.error_message,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    materials: (materials || []).map(m => ({
      id: m.id,
      materialType: m.material_type,
      sourceType: m.source_type,
      originalName: m.original_name,
      fileSize: m.file_size,
      createdAt: m.created_at,
    })),
    documents: (docs || []).map(d => ({
      id: d.id,
      originalName: d.original_name,
      status: d.status,
      fileType: d.file_type,
    })),
  };
}

async function listSessions(userId = null) {
  const query = supabase
    .from('exam_prep_sessions')
    .select('id, name, status, document_ids, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    documentIds: s.document_ids,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

async function deleteSession(sessionId) {
  const { error } = await supabase
    .from('exam_prep_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
  return { success: true };
}

// ─── Material Handling ─────────────────────────────────────

async function addMaterial(sessionId, { materialType, buffer, ext, text, originalName }) {
  const id = uuidv4();
  let extractedText = text || '';
  let fileSize = 0;
  let sourceType = 'text';

  if (buffer && ext) {
    sourceType = 'file';
    fileSize = buffer.length;
    const result = await extractTextFromBuffer(buffer, ext);
    extractedText = result.text;
  }

  const { error } = await supabase.from('exam_prep_materials').insert({
    id,
    session_id: sessionId,
    material_type: materialType,
    source_type: sourceType,
    original_name: originalName || null,
    extracted_text: extractedText,
    file_size: fileSize,
  });
  if (error) throw error;

  return {
    id,
    materialType,
    sourceType,
    originalName,
    fileSize,
  };
}

// ─── Content Generation Pipeline ───────────────────────────

async function generatePrepContent(sessionId, userId = null) {
  // Update status to generating
  await supabase.from('exam_prep_sessions').update({
    status: 'generating',
    updated_at: new Date().toISOString(),
  }).eq('id', sessionId);

  try {
    // 1. Load session data
    const { data: session, error: sessErr } = await supabase
      .from('exam_prep_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessErr) throw sessErr;

    // 2. Gather study document content
    const allTexts = [];
    for (const docId of session.document_ids) {
      const pages = await vectorStore.getDocumentPages(docId);
      if (pages.length > 0) {
        const docText = pages.map(p =>
          `[Page ${p.pageNumber}${p.heading ? ` - ${p.heading}` : ''}]\n${p.text}`
        ).join('\n\n');
        allTexts.push(docText);
      } else {
        const chunks = await vectorStore.getDocumentChunks(docId);
        if (chunks.length > 0) {
          allTexts.push(chunks.map(c => c.text).join('\n\n---\n\n'));
        }
      }
    }

    const studyContent = prepareTextForLLM(allTexts.join('\n\n===\n\n'), 60000);

    // 3. Gather auxiliary materials grouped by type
    const { data: materials } = await supabase
      .from('exam_prep_materials')
      .select('*')
      .eq('session_id', sessionId);

    const auxByType = {};
    for (const mat of (materials || [])) {
      if (!auxByType[mat.material_type]) auxByType[mat.material_type] = [];
      auxByType[mat.material_type].push(mat.extracted_text);
    }

    const hasAuxMaterials = Object.keys(auxByType).length > 0;

    // Build auxiliary section for prompts
    let auxiliarySection = '';
    if (hasAuxMaterials) {
      const parts = [];
      if (auxByType.past_exam) {
        parts.push(`--- PAST EXAMS ---\n${prepareTextForLLM(auxByType.past_exam.join('\n\n---\n\n'), 30000)}`);
      }
      if (auxByType.current_test) {
        parts.push(`--- CURRENT TESTS ---\n${prepareTextForLLM(auxByType.current_test.join('\n\n---\n\n'), 20000)}`);
      }
      if (auxByType.assignment) {
        parts.push(`--- ASSIGNMENTS ---\n${prepareTextForLLM(auxByType.assignment.join('\n\n---\n\n'), 20000)}`);
      }
      auxiliarySection = parts.join('\n\n');
    }

    // 4. Get user context
    const [teachingLevel, interests, weakTopics, learningStyle, learningPace] = await Promise.all([
      getUserTeachingLevel(userId),
      getUserInterests(userId),
      getWeakTopics(10, 0.6, userId),
      getEffectiveLearningStyle(userId),
      getEffectiveLearningPace(userId),
    ]);
    const weakTopicsSection = weakTopics.length > 0
      ? `Student's weak topics (focus extra attention here):\n${weakTopics.map(t => `- ${t.topic} (avg score: ${Math.round(t.avg_score * 100)}%)`).join('\n')}`
      : '';

    const config = session.config_json || {};
    const numRevisionQuestions = config.numRevisionQuestions || 30;

    // 5. Pattern analysis (only if aux materials exist)
    let analysisResult = null;
    if (hasAuxMaterials) {
      const analysisPrompt = EXAM_PATTERN_ANALYSIS_PROMPT
        .replace('{teaching_level}', teachingLevel)
        .replace('{study_content}', studyContent)
        .replace('{auxiliary_section}', `Auxiliary Materials:\n${auxiliarySection}`)
        .replace('{weak_topics_section}', weakTopicsSection);

      const result = await withRetryOnRateLimit(async () => {
        const tier = selectModelTier({ isComplex: true });
        const model = getGenerativeModel(tier);
        return model.generateContent(analysisPrompt);
      }, 3, 1);
      const text = result.response.text();
      analysisResult = parseJsonResponse(text);
    }

    const analysisSection = analysisResult
      ? `Exam Pattern Analysis (from past exams/tests):\n${JSON.stringify(analysisResult, null, 2)}`
      : 'No exam pattern analysis available (no auxiliary materials provided).';

    // 6. Generate study guide and revision questions in parallel
    const interestsSection = buildInterestsSection(interests);
    const learningStyleSection = buildLearningStyleSection(learningStyle);
    const paceSection = buildPaceSection(learningPace);

    const { depthSection: studyGuideDepth } = getModuleDepthSection(studyContent);

    const studyGuidePrompt = STUDY_GUIDE_GENERATION_PROMPT
      .replace('{teaching_level}', teachingLevel)
      .replace('{study_content}', studyContent)
      .replace('{analysis_section}', analysisSection)
      .replace('{weak_topics_section}', weakTopicsSection)
      .replace('{depth_section}', studyGuideDepth)
      .replace('{interests_section}', interestsSection)
      .replace('{learning_style_section}', learningStyleSection)
      .replace('{pace_section}', paceSection);

    const revisionPrompt = REVISION_QUESTIONS_PROMPT
      .replace('{teaching_level}', teachingLevel)
      .replace('{study_content}', studyContent)
      .replace('{analysis_section}', analysisSection)
      .replace('{weak_topics_section}', weakTopicsSection)
      .replace('{quiz_depth_section}', getQuizDepthSection(studyContent))
      .replace('{num_questions}', numRevisionQuestions);

    const [guideResult, questionsResult] = await Promise.all([
      withRetryOnRateLimit(async () => {
        const model = getGenerativeModel(selectModelTier({ isComplex: true }));
        return model.generateContent(studyGuidePrompt);
      }, 3, 1),
      withRetryOnRateLimit(async () => {
        const model = getGenerativeModel(selectModelTier({ isComplex: true }));
        return model.generateContent(revisionPrompt);
      }, 3, 1),
    ]);

    const studyGuide = parseJsonResponse(guideResult.response.text());
    const revisionQuestions = parseJsonResponse(questionsResult.response.text());

    // 7. Store results
    const { error: updateErr } = await supabase.from('exam_prep_sessions').update({
      status: 'ready',
      analysis_json: analysisResult,
      study_guide_json: studyGuide,
      revision_questions_json: revisionQuestions,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    if (updateErr) throw updateErr;

    return { status: 'ready' };
  } catch (err) {
    console.error('Exam prep generation failed:', err);
    await supabase.from('exam_prep_sessions').update({
      status: 'failed',
      error_message: err.message || 'Generation failed',
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    throw err;
  }
}

// ─── Practice Exam Generation ──────────────────────────────

async function generatePracticeExam(sessionId, { numQuestions = 20, difficulty = 'medium', timeLimitMinutes = 30, userId = null }) {
  const { data: session, error: sessErr } = await supabase
    .from('exam_prep_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (sessErr) throw sessErr;

  // Gather study content
  const allTexts = [];
  for (const docId of session.document_ids) {
    const pages = await vectorStore.getDocumentPages(docId);
    if (pages.length > 0) {
      allTexts.push(pages.map(p => p.text).join('\n\n'));
    } else {
      const chunks = await vectorStore.getDocumentChunks(docId);
      if (chunks.length > 0) {
        allTexts.push(chunks.map(c => c.text).join('\n\n'));
      }
    }
  }

  const studyContent = prepareTextForLLM(allTexts.join('\n\n===\n\n'), 50000);
  const teachingLevel = await getUserTeachingLevel(userId);
  const weakTopics = await getWeakTopics(10, 0.6, userId);
  const weakTopicsSection = weakTopics.length > 0
    ? `Student's weak topics:\n${weakTopics.map(t => `- ${t.topic} (avg score: ${Math.round(t.avg_score * 100)}%)`).join('\n')}`
    : '';

  const analysisSection = session.analysis_json
    ? `Exam Pattern Analysis:\n${JSON.stringify(session.analysis_json, null, 2)}`
    : 'No exam pattern analysis available.';

  const prompt = PRACTICE_EXAM_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{difficulty}', difficulty)
    .replace('{study_content}', studyContent)
    .replace('{analysis_section}', analysisSection)
    .replace('{weak_topics_section}', weakTopicsSection)
    .replace('{num_questions}', numQuestions)
    .replace('{quiz_depth_section}', getQuizDepthSection(studyContent));

  const result = await withRetryOnRateLimit(async () => {
    const tier = selectModelTier({ isComplex: true });
    const model = getGenerativeModel(tier);
    return model.generateContent(prompt);
  }, 3, 1);
  const parsed = parseJsonResponse(result.response.text());

  // Store as a quiz session linked to this prep session
  const quizSessionId = uuidv4();
  const questions = parsed.questions.map(q => ({
    ...q,
    id: uuidv4(),
    topic: q.topic || null,
  }));

  const { error: insertErr } = await supabase.from('quiz_sessions').insert({
    id: quizSessionId,
    document_id: session.document_ids[0] || null,
    difficulty,
    num_questions: numQuestions,
    questions_json: questions,
    is_exam: true,
    time_limit_seconds: timeLimitMinutes * 60,
    exam_prep_session_id: sessionId,
  });
  if (insertErr) throw insertErr;

  return {
    id: quizSessionId,
    questions,
    difficulty,
    isExam: true,
    timeLimitSeconds: timeLimitMinutes * 60,
    createdAt: new Date().toISOString(),
    examPrepSessionId: sessionId,
  };
}

// ─── Helpers ───────────────────────────────────────────────

function parseJsonResponse(text) {
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse LLM JSON response');
  }
}

module.exports = {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  addMaterial,
  generatePrepContent,
  generatePracticeExam,
};
