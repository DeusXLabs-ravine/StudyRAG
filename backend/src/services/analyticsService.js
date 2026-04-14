const supabase = require('../config/database');

function isTransientSupabaseError(error) {
  const message = `${error?.message || ''} ${error?.cause?.message || ''}`.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('socket') ||
    message.includes('network')
  );
}

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
  const [weakTopics, dueRes, incompleteRes] = await Promise.all([
    getWeakTopics(0.6, userId),
    supabase.rpc('get_due_flashcard_count', { p_user_id: userId }),
    supabase.rpc('get_first_incomplete_module', { p_user_id: userId }),
  ]);

  if (dueRes.error) throw dueRes.error;
  if (incompleteRes.error) throw incompleteRes.error;

  if (weakTopics.length > 0) {
    return {
      type: 'weak_topic',
      title: `Improve "${weakTopics[0].topic}"`,
      description: `Your average score is ${weakTopics[0].avgScore}%. Let's bump that up with a quick quiz.`,
      topic: weakTopics[0].topic,
      link: '/quiz',
    };
  }

  if (dueRes.data > 0) {
    return {
      type: 'flashcard_review',
      title: 'Retention Time',
      description: `You have ${dueRes.data} cards ready for review. Don't let them slip!`,
      link: '/flashcards',
    };
  }

  const incompleteModules = incompleteRes.data;
  if (incompleteModules && incompleteModules.length > 0) {
    return {
      type: 'module',
      title: 'Keep Learning',
      description: `Continue where you left off: "${incompleteModules[0].title}"`,
      link: '/learn',
    };
  }

  return {
    type: 'review',
    title: 'Expert Mode',
    description: 'You\'re doing great! Take an adaptive quiz to keep your edge.',
    link: '/quiz',
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

// ─── Enhanced Analytics ───────────────────────────────────────

async function getStudyTimeByMode(userId = null) {
  try {
    const { data, error } = await supabase.rpc('get_study_time_by_mode', { p_user_id: userId });
    if (error) return [];
    return data.map(row => ({
      mode: row.mode,
      seconds: Number(row.total_seconds)
    }));
  } catch {
    return [];
  }
}

async function getStudyTimeTrend(days = 14, userId = null) {
  try {
    const { data, error } = await supabase.rpc('get_study_time_trend', { p_days: days, p_user_id: userId });
    if (error) return [];
    return data.map(row => ({
      date: row.study_date,
      seconds: Number(row.total_seconds)
    }));
  } catch {
    return [];
  }
}

async function getDocumentMastery(userId = null) {
  try {
    const { data, error } = await supabase.rpc('get_document_mastery', { p_user_id: userId });
    if (error) return [];
    return data.map(row => ({
      id: row.document_id,
      name: row.original_name,
      avgScore: row.avg_score ? Math.round(row.avg_score) : 0,
      completion: Math.round((row.completion_rate || 0) * 100),
      totalModules: Number(row.total_modules),
      completedModules: Number(row.completed_modules)
    }));
  } catch {
    return [];
  }
}

async function getUserPerformanceSummary(userId = null) {
  try {
    const { data, error } = await supabase.rpc('get_user_performance_summary', { p_user_id: userId });
    if (error || !data?.[0]) return { totalXp: 0, level: 1, gamesPlayed: 0, totalDocs: 0, totalSessions: 0 };
    const row = data[0];
    return {
      totalXp: row.total_xp,
      level: row.current_level,
      gamesPlayed: row.games_played,
      totalDocs: Number(row.total_documents),
      totalSessions: Number(row.total_sessions)
    };
  } catch {
    return { totalXp: 0, level: 1, gamesPlayed: 0, totalDocs: 0, totalSessions: 0 };
  }
}

async function getOverview(userId = null) {
  const [
    mastery, 
    streak, 
    recommendation, 
    flashcardStats,
    timeByMode,
    timeTrend,
    docMastery,
    performance
  ] = await Promise.all([
    getOverallMastery(userId),
    getStudyStreak(userId),
    getStudyRecommendation(userId),
    getFlashcardStats(userId),
    getStudyTimeByMode(userId),
    getStudyTimeTrend(14, userId),
    getDocumentMastery(userId),
    getUserPerformanceSummary(userId)
  ]);

  return { 
    mastery, 
    streak, 
    recommendation, 
    flashcardStats, 
    timeByMode, 
    timeTrend,
    docMastery, 
    performance 
  };
}

async function getUserSettings(userId = null) {
  try {
    const query = supabase
      .from('user_settings')
      .select('key, value');

    if (userId) query.eq('user_id', userId);

    const { data: rows, error } = await query;
    if (error) {
      console.warn(`[Analytics] Failed to load user settings for ${userId || 'anon'}: ${error.message}`);
      return {};
    }

    const settings = {};
    for (const row of (rows || [])) {
      settings[row.key] = row.value;
    }
    return settings;
  } catch (error) {
    // Settings are non-critical — always degrade gracefully so the
    // endpoint never 500s just because the database is unreachable.
    console.warn(`[Analytics] Settings fetch failure for ${userId || 'anon'}: ${error.message}`);
    return {};
  }
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
  getStudyTimeByMode,
  getStudyTimeTrend,
  getDocumentMastery,
  getUserPerformanceSummary,
  getOverview,
  getUserSettings,
  updateUserSetting,
};
