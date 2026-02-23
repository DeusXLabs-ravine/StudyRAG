const supabase = require('../config/database');
const { getGenerativeModel, selectModelTier } = require('../config/gemini');
const { QUIZ_GENERATION_PROMPT, buildInterestsSection } = require('../utils/prompts');
const vectorStore = require('./vectorStore');
const { getUserTeachingLevel, getUserInterests, getWeakTopics } = require('./userProfileService');
const { v4: uuidv4 } = require('uuid');

async function generateQuiz({ numQuestions = 10, difficulty = 'medium', docId = null, adaptive = false, isExam = false, timeLimitSeconds = null, userId = null }) {
  // Try page-based content first, fall back to chunks
  let contextItems = await getContentForGeneration(docId);

  if (contextItems.length === 0) {
    throw new Error('No study materials found. Please upload documents first.');
  }

  let selected;
  if (adaptive) {
    selected = await selectAdaptiveContent(contextItems, userId);
  } else {
    const shuffled = [...contextItems].sort(() => Math.random() - 0.5);
    // Pages are larger than chunks, so use fewer (5 pages vs 15 chunks)
    const limit = contextItems[0]?.pageNumber !== undefined ? 5 : 15;
    selected = shuffled.slice(0, Math.min(limit, shuffled.length));
  }

  // Track source page numbers for each content item (#8)
  const isPages = selected[0]?.pageNumber !== undefined;
  const context = selected.map(c => {
    if (isPages) {
      return `[Page ${c.pageNumber}${c.heading ? ` - ${c.heading}` : ''}]\n${c.text}`;
    }
    return c.text;
  }).join('\n\n---\n\n');

  // Build page number mapping for the LLM prompt
  const sourcePages = isPages ? selected.map(c => c.pageNumber) : [];

  const [teachingLevel, interests] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
  ]);

  const prompt = QUIZ_GENERATION_PROMPT
    .replace('{num_questions}', numQuestions)
    .replace('{difficulty}', difficulty)
    .replace('{context}', context)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests));

  const tier = selectModelTier({ isComplex: difficulty === 'hard' || isExam });
  const model = getGenerativeModel(tier);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse quiz generation response');
  }

  const sessionId = uuidv4();
  const questions = parsed.questions.map(q => ({
    ...q,
    id: uuidv4(),
    topic: q.topic || null,
    sourcePages: q.sourcePages || sourcePages.length > 0 ? (q.sourcePages || sourcePages) : undefined,
  }));

  const sessRow = {
    id: sessionId,
    document_id: docId || null,
    difficulty,
    num_questions: numQuestions,
    questions_json: questions,
    is_exam: isExam,
    time_limit_seconds: timeLimitSeconds || null,
  };
  if (userId) sessRow.user_id = userId;
  const { error } = await supabase.from('quiz_sessions').insert(sessRow);
  if (error) throw error;

  return {
    id: sessionId,
    questions,
    difficulty,
    isExam,
    timeLimitSeconds,
    createdAt: new Date().toISOString(),
    documentId: docId,
  };
}

async function submitQuiz(quizId, answers, questions, timeSpentSeconds = null, userId = null) {
  let correct = 0;
  const results = questions.map((q, i) => {
    const userAnswer = answers[i];
    const isCorrect = userAnswer?.toString().toLowerCase().trim() === q.correct?.toString().toLowerCase().trim();
    if (isCorrect) correct++;
    return {
      question: q.question,
      userAnswer,
      correctAnswer: q.correct,
      isCorrect,
      explanation: q.explanation,
      topic: q.topic || null,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const resultId = uuidv4();

  const { error: resErr } = await supabase.from('quiz_results').insert({
    id: resultId,
    quiz_session_id: quizId,
    score,
    correct_count: correct,
    total_count: questions.length,
    results_json: results,
    time_spent_seconds: timeSpentSeconds || null,
  });
  if (resErr) throw resErr;

  // Record topic performance for each question that has a topic
  const topicPerfRows = results
    .filter(r => r.topic)
    .map(r => {
      const row = {
        topic: r.topic,
        source_mode: 'quiz',
        source_id: resultId,
        score: r.isCorrect ? 1.0 : 0.0,
      };
      if (userId) row.user_id = userId;
      return row;
    });

  if (topicPerfRows.length > 0) {
    const { error: tpErr } = await supabase.from('topic_performance').insert(topicPerfRows);
    if (tpErr) throw tpErr;
  }

  const studyRow = {
    mode: 'quiz',
    details_json: {
      quizId,
      resultId,
      score,
      correct,
      total: questions.length,
      timeSpentSeconds,
    },
  };
  if (userId) studyRow.user_id = userId;
  const { error: sessErr } = await supabase.from('study_sessions').insert(studyRow);
  if (sessErr) throw sessErr;

  await updateTeachingLevelFromQuiz(score, results, userId);

  return {
    id: resultId,
    quizId,
    score,
    correct,
    total: questions.length,
    results,
    timeSpentSeconds,
    submittedAt: new Date().toISOString(),
  };
}

async function getQuizHistory(userId = null) {
  const { data, error } = await supabase.rpc('get_quiz_history', { p_user_id: userId });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    quizId: row.quiz_session_id,
    score: row.score,
    correct: row.correct_count,
    total: row.total_count,
    results: row.results_json,
    timeSpentSeconds: row.time_spent_seconds,
    submittedAt: row.submitted_at,
    difficulty: row.difficulty,
    documentId: row.document_id,
    isExam: row.is_exam,
  }));
}

async function getQuizSession(sessionId) {
  const { data: row, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  return {
    id: row.id,
    documentId: row.document_id,
    difficulty: row.difficulty,
    numQuestions: row.num_questions,
    questions: row.questions_json,
    isExam: row.is_exam,
    timeLimitSeconds: row.time_limit_seconds,
    createdAt: row.created_at,
  };
}

// --- Content retrieval helpers ---

/**
 * Get content for quiz/flashcard generation. Tries pages first, falls back to chunks.
 */
async function getContentForGeneration(docId) {
  if (docId) {
    // Try page-based content first
    const pages = await vectorStore.getDocumentPages(docId);
    if (pages.length > 0) return pages;
    // Fall back to chunks for legacy documents
    return await vectorStore.getDocumentChunks(docId);
  }
  // No docId: use all chunks (cross-document)
  return await vectorStore.getAllChunksWithText();
}

// --- Adaptive selection helpers ---

async function selectAdaptiveContent(allItems, userId = null) {
  const weakTopics = await getWeakTopics(10, 0.6, userId);
  // Pages are larger, so use fewer items
  const isPages = allItems[0]?.pageNumber !== undefined;
  const maxItems = isPages ? 5 : 15;

  if (weakTopics.length === 0) {
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(maxItems, shuffled.length));
  }

  const weakSet = new Set(weakTopics.map(t => t.topic.toLowerCase()));
  const weakItems = [];
  const otherItems = [];

  for (const item of allItems) {
    const heading = (item.heading || '').toLowerCase();
    const text = (item.text || '').toLowerCase().slice(0, 200);
    const isWeak = [...weakSet].some(topic => heading.includes(topic) || text.includes(topic));
    if (isWeak) {
      weakItems.push(item);
    } else {
      otherItems.push(item);
    }
  }

  const weakCount = Math.min(Math.ceil(maxItems * 0.6), weakItems.length);
  const otherCount = Math.min(maxItems - weakCount, otherItems.length);

  const shuffledWeak = [...weakItems].sort(() => Math.random() - 0.5).slice(0, weakCount);
  const shuffledOther = [...otherItems].sort(() => Math.random() - 0.5).slice(0, otherCount);

  return [...shuffledWeak, ...shuffledOther];
}

async function updateTeachingLevelFromQuiz(score, results, userId = null) {
  const total = results.length;

  let newLevel;
  if (score >= 90) {
    newLevel = 'advanced';
  } else if (score >= 70) {
    newLevel = 'intermediate';
  } else if (score >= 40) {
    newLevel = 'beginner';
  } else {
    newLevel = 'dummy';
  }

  if (total >= 3) {
    await supabase.rpc('upsert_user_setting', {
      p_key: 'teaching_level',
      p_value: newLevel,
      p_user_id: userId,
    });
  }
}

module.exports = { generateQuiz, submitQuiz, getQuizHistory, getQuizSession };
