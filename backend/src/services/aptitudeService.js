const supabase = require('../config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
const { APTITUDE_TEST_PROMPT } = require('../utils/prompts');
const { v4: uuidv4 } = require('uuid');

async function generateAptitudeTest(subject) {
  const prompt = APTITUDE_TEST_PROMPT.replace(/\{subject\}/g, subject);

  // Use advanced model for aptitude tests
  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('advanced');
    return model.generateContent(prompt);
  });
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse aptitude test generation response');
  }

  const testId = uuidv4();
  const questions = parsed.questions.map(q => ({
    ...q,
    id: uuidv4(),
  }));

  return {
    id: testId,
    testName: parsed.test_name,
    subject,
    questions,
    createdAt: new Date().toISOString(),
  };
}

async function submitAptitudeTest(subject, answers, questions, userId = null) {
  let correct = 0;
  const tierScores = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
  const tierTotals = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };

  const results = questions.map((q, i) => {
    const userAnswer = answers[i];
    const isCorrect = userAnswer?.toString().toLowerCase().trim() === q.correct?.toString().toLowerCase().trim();
    if (isCorrect) correct++;

    const tier = q.difficulty_tier || 'intermediate';
    if (tierTotals[tier] !== undefined) {
      tierTotals[tier]++;
      if (isCorrect) tierScores[tier]++;
    }

    return {
      question: q.question,
      userAnswer,
      correctAnswer: q.correct,
      isCorrect,
      explanation: q.explanation,
      difficultyTier: tier,
    };
  });

  const score = Math.round((correct / questions.length) * 100);

  let knowledgeLevel;
  if (tierScores.expert > 0 && tierScores.advanced >= tierTotals.advanced * 0.5) {
    knowledgeLevel = 'advanced';
  } else if (tierScores.advanced > 0 && tierScores.intermediate >= tierTotals.intermediate * 0.5) {
    knowledgeLevel = 'intermediate';
  } else if (tierScores.intermediate > 0 || tierScores.beginner >= tierTotals.beginner * 0.5) {
    knowledgeLevel = 'beginner';
  } else {
    knowledgeLevel = 'dummy';
  }

  const upperCorrect = tierScores.advanced + tierScores.expert;
  let learningPace;
  if (score >= 80 && upperCorrect > 0) {
    learningPace = 'fast';
  } else if (score >= 50) {
    learningPace = 'moderate';
  } else {
    learningPace = 'slow';
  }

  const aptRow = {
    subject,
    knowledge_level: knowledgeLevel,
    learning_pace: learningPace,
    score,
    details_json: { results, tierScores, tierTotals },
  };
  if (userId) aptRow.user_id = userId;
  const { error: resErr } = await supabase.from('aptitude_results').insert(aptRow);
  if (resErr) throw resErr;

  await supabase.rpc('upsert_user_setting', { p_key: 'teaching_level', p_value: knowledgeLevel, p_user_id: userId });
  await supabase.rpc('upsert_user_setting', { p_key: 'learning_pace', p_value: learningPace, p_user_id: userId });
  await supabase.rpc('upsert_user_setting', { p_key: 'last_aptitude_subject', p_value: subject, p_user_id: userId });

  const sessRow = {
    mode: 'aptitude',
    details_json: { subject, score, knowledgeLevel, learningPace },
  };
  if (userId) sessRow.user_id = userId;
  const { error: sessErr } = await supabase.from('study_sessions').insert(sessRow);
  if (sessErr) throw sessErr;

  return {
    score,
    correct,
    total: questions.length,
    knowledgeLevel,
    learningPace,
    tierScores,
    tierTotals,
    results,
  };
}

async function getAptitudeHistory(userId = null) {
  const query = supabase
    .from('aptitude_results')
    .select('*')
    .order('taken_at', { ascending: false });
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    subject: row.subject,
    knowledgeLevel: row.knowledge_level,
    learningPace: row.learning_pace,
    score: row.score,
    details: row.details_json,
    takenAt: row.taken_at,
  }));
}

async function getLatestAptitude(userId = null) {
  const query = supabase
    .from('aptitude_results')
    .select('*')
    .order('taken_at', { ascending: false })
    .limit(1);
  if (userId) query.eq('user_id', userId);
  const { data: row, error } = await query.single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  return {
    id: row.id,
    subject: row.subject,
    knowledgeLevel: row.knowledge_level,
    learningPace: row.learning_pace,
    score: row.score,
    takenAt: row.taken_at,
  };
}

module.exports = {
  generateAptitudeTest,
  submitAptitudeTest,
  getAptitudeHistory,
  getLatestAptitude,
};
