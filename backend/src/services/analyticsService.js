const supabase = require('../config/database');

async function getTopicMastery(userId = null) {
  const { data, error } = await supabase.rpc('get_topic_mastery', { p_user_id: userId });
  if (error) throw error;

  return (data || []).map(row => ({
    topic: row.topic,
    avgScore: Math.round(row.avg_score * 100),
    attempts: row.attempts,
    lastAttempt: row.last_attempt,
    minScore: Math.round(row.min_score * 100),
    maxScore: Math.round(row.max_score * 100),
    mastery: getMasteryLevel(row.avg_score),
  }));
}

async function getWeakTopics(threshold = 0.6, userId = null) {
  const { data, error } = await supabase.rpc('get_weak_topics', {
    threshold,
    result_limit: 100,
    p_user_id: userId,
  });
  if (error) throw error;

  return (data || []).map(row => ({
    topic: row.topic,
    avgScore: Math.round(row.avg_score * 100),
    attempts: row.attempts,
  }));
}

async function getOverallMastery(userId = null) {
  const { data, error } = await supabase.rpc('get_overall_mastery', { p_user_id: userId });
  if (error) throw error;

  const row = data && data[0];
  if (!row || row.avg_score === null) {
    return { score: 0, topicCount: 0, totalAttempts: 0 };
  }

  return {
    score: Math.round(row.avg_score * 100),
    topicCount: row.topic_count,
    totalAttempts: row.total_attempts,
  };
}

async function getStudyStreak(userId = null) {
  const { data: sessions, error } = await supabase.rpc('get_study_dates', { p_user_id: userId });
  if (error) throw error;

  if (!sessions || sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  for (let i = 0; i < sessions.length; i++) {
    const date = sessions[i].study_date;
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    const expectedDate = expected.toISOString().split('T')[0];

    if (date === expectedDate) {
      streak++;
      if (i === 0 || streak > 0) currentStreak = streak;
    } else {
      if (streak > longestStreak) longestStreak = streak;
      if (i === 0) currentStreak = 0;
      streak = 1;
    }
  }
  if (streak > longestStreak) longestStreak = streak;

  return {
    currentStreak,
    longestStreak,
    totalDays: sessions.length,
  };
}

async function getQuizScoreTrend(limit = 20, userId = null) {
  const { data, error } = await supabase.rpc('get_quiz_score_trend', {
    result_limit: limit,
    p_user_id: userId,
  });
  if (error) throw error;

  return (data || []).reverse().map(row => ({
    score: row.score,
    correct: row.correct_count,
    total: row.total_count,
    date: row.submitted_at,
    difficulty: row.difficulty,
    isExam: row.is_exam,
  }));
}

async function getActivityTimeline(days = 30, userId = null) {
  const { data, error } = await supabase.rpc('get_activity_timeline', {
    p_days: days,
    p_user_id: userId,
  });
  if (error) throw error;

  return (data || []).reduce((acc, row) => {
    if (!acc[row.date]) {
      acc[row.date] = { date: row.date, total: 0 };
    }
    acc[row.date][row.mode] = row.count;
    acc[row.date].total += Number(row.count);
    return acc;
  }, {});
}

async function getStudyRecommendation(userId = null) {
  const weakTopics = await getWeakTopics(0.6, userId);
  if (weakTopics.length > 0) {
    return {
      type: 'weak_topic',
      message: `Focus on "${weakTopics[0].topic}" - your average score is ${weakTopics[0].avgScore}%`,
      topic: weakTopics[0].topic,
      action: 'quiz',
    };
  }

  const { data: dueCount, error: dueErr } = await supabase.rpc('get_due_flashcard_count', { p_user_id: userId });
  if (dueErr) throw dueErr;

  if (dueCount > 0) {
    return {
      type: 'flashcard_review',
      message: `You have ${dueCount} flashcards due for review`,
      action: 'flashcards',
    };
  }

  const { data: incompleteModules, error: modErr } = await supabase.rpc('get_first_incomplete_module', { p_user_id: userId });
  if (modErr) throw modErr;

  if (incompleteModules && incompleteModules.length > 0) {
    return {
      type: 'module',
      message: `Continue learning: "${incompleteModules[0].title}"`,
      moduleId: incompleteModules[0].id,
      action: 'learn',
    };
  }

  return {
    type: 'review',
    message: 'Great job! Take a quiz to reinforce your knowledge',
    action: 'quiz',
  };
}

async function getFlashcardStats(userId = null) {
  const { data, error } = await supabase.rpc('get_flashcard_stats', { p_user_id: userId });
  if (error) throw error;

  const stats = data && data[0];
  return {
    total: Number(stats?.total) || 0,
    new: Number(stats?.new_count) || 0,
    learning: Number(stats?.learning_count) || 0,
    mastered: Number(stats?.mastered_count) || 0,
    dueToday: Number(stats?.due_count) || 0,
  };
}

async function getOverview(userId = null) {
  return {
    mastery: await getOverallMastery(userId),
    streak: await getStudyStreak(userId),
    recommendation: await getStudyRecommendation(userId),
    flashcardStats: await getFlashcardStats(userId),
  };
}

async function getUserSettings(userId = null) {
  const query = supabase
    .from('user_settings')
    .select('key, value');

  if (userId) query.eq('user_id', userId);

  const { data: rows, error } = await query;
  if (error) throw error;

  const settings = {};
  for (const row of (rows || [])) {
    settings[row.key] = row.value;
  }
  return settings;
}

async function updateUserSetting(key, value, userId = null) {
  await supabase.rpc('upsert_user_setting', {
    p_key: key,
    p_value: value,
    p_user_id: userId,
  });
}

function getMasteryLevel(score) {
  if (score >= 0.9) return 'mastered';
  if (score >= 0.7) return 'proficient';
  if (score >= 0.5) return 'developing';
  if (score >= 0.3) return 'beginner';
  return 'needs_work';
}

module.exports = {
  getTopicMastery,
  getWeakTopics,
  getOverallMastery,
  getStudyStreak,
  getQuizScoreTrend,
  getActivityTimeline,
  getStudyRecommendation,
  getFlashcardStats,
  getOverview,
  getUserSettings,
  updateUserSetting,
};
