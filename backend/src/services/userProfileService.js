const supabase = require('../config/database');
const { profileCache } = require('../config/cache');

// ─── Cached Profile Helpers ───────────────────────────────────

/**
 * Get full profile from cache or DB. Cached for 5 minutes.
 */
async function _getCachedProfile(userId) {
  if (!userId) return null;
  const cacheKey = `profile:${userId}`;
  const cached = profileCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const profile = (error || !data) ? null : data;
  profileCache.set(cacheKey, profile);
  return profile;
}

/**
 * Get all user_settings for a user in one query. Cached for 5 minutes.
 */
async function _getCachedSettings(userId) {
  const cacheKey = `settings:${userId || 'anon'}`;
  const cached = profileCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const query = supabase.from('user_settings').select('key, value');
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;

  const settingsMap = {};
  if (!error && data) {
    for (const row of data) settingsMap[row.key] = row.value;
  }
  profileCache.set(cacheKey, settingsMap);
  return settingsMap;
}

// ─── Public API ───────────────────────────────────────────────

async function getUserTeachingLevel(userId = null) {
  // Try profiles table first
  if (userId) {
    const profile = await _getCachedProfile(userId);
    if (profile?.teaching_level) return profile.teaching_level;
  }
  // Fallback to user_settings
  const settings = await _getCachedSettings(userId);
  return settings.teaching_level || 'intermediate';
}

async function getUserInterests(userId = null) {
  if (!userId) return [];
  const profile = await _getCachedProfile(userId);
  return profile?.interests || [];
}

async function getUserProfile(userId) {
  return _getCachedProfile(userId);
}

async function getWeakTopics(limit = 10, threshold = 0.6, userId = null) {
  // Cached briefly — called frequently in prompt building
  const cacheKey = `weak:${userId || 'anon'}:${limit}:${threshold}`;
  const cached = profileCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase.rpc('get_weak_topics', {
    threshold,
    result_limit: limit,
    p_user_id: userId,
  });
  if (error) throw error;
  const result = data || [];
  profileCache.set(cacheKey, result, 3 * 60_000); // 3 min TTL (changes with quiz scores)
  return result;
}

// ─── Learning Style & Pace ────────────────────────────────────

const VALID_LEARNING_STYLES = ['visual', 'auditory', 'reading_writing', 'kinesthetic'];
const VALID_PACES = ['slow', 'moderate', 'fast'];

async function getUserLearningStyle(userId = null) {
  const settings = await _getCachedSettings(userId);
  return settings.learning_style || 'auto';
}

async function getUserLearningPace(userId = null) {
  const settings = await _getCachedSettings(userId);
  return settings.learning_pace || 'auto';
}

async function recordLearningInteraction(contentType, engagement, userId = null) {
  const row = {
    content_type: contentType,
    engagement,
    recorded_at: new Date().toISOString(),
  };
  if (userId) row.user_id = userId;
  await supabase.from('learning_interactions').insert(row);
  // Invalidate style/pace cache on new interaction
  if (userId) {
    profileCache.del(`style:${userId}`);
    profileCache.del(`pace:${userId}`);
  }
}

/**
 * Auto-detect learning style from interaction history (cached 10 min).
 */
async function detectLearningStyle(userId = null) {
  const cacheKey = `style:${userId || 'anon'}`;
  const cached = profileCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const query = supabase
    .from('learning_interactions')
    .select('content_type')
    .order('recorded_at', { ascending: false })
    .limit(100); // Bound the query — don't scan entire history
  if (userId) query.eq('user_id', userId);

  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') throw error;

  const interactions = data || [];
  if (interactions.length < 5) {
    profileCache.set(cacheKey, null, 10 * 60_000);
    return null;
  }

  const varkScores = { visual: 0, auditory: 0, reading_writing: 0, kinesthetic: 0 };
  for (const row of interactions) {
    switch (row.content_type) {
      case 'diagram': case 'image': case 'chart':
        varkScores.visual += 1; break;
      case 'example_analogy': case 'video': case 'audio':
        varkScores.auditory += 1; break;
      case 'text_explanation': case 'reading': case 'notes':
        varkScores.reading_writing += 1; break;
      case 'step_by_step': case 'quiz': case 'practice': case 'interactive':
        varkScores.kinesthetic += 1; break;
    }
  }

  const sorted = Object.entries(varkScores).sort((a, b) => b[1] - a[1]);
  const result = sorted[0][1] === 0 ? null : sorted[0][0];
  profileCache.set(cacheKey, result, 10 * 60_000); // 10 min
  return result;
}

/**
 * Auto-detect learning pace (cached 10 min).
 */
async function detectLearningPace(userId = null) {
  const cacheKey = `pace:${userId || 'anon'}`;
  const cached = profileCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Batch both queries together
  const scoreQuery = supabase
    .from('topic_performance')
    .select('score')
    .order('recorded_at', { ascending: false })
    .limit(20);
  if (userId) scoreQuery.eq('user_id', userId);

  const progressQuery = supabase
    .from('module_progress')
    .select('attempts, best_score')
    .limit(20);
  if (userId) progressQuery.eq('user_id', userId);

  const [scoresRes, progressRes] = await Promise.all([scoreQuery, progressQuery]);

  const scoreRows = scoresRes.data || [];
  const progressRows = progressRes.data || [];

  if (scoreRows.length < 3 && progressRows.length < 3) {
    profileCache.set(cacheKey, null, 10 * 60_000);
    return null;
  }

  const avgScore = scoreRows.length > 0
    ? scoreRows.reduce((sum, r) => sum + r.score, 0) / scoreRows.length
    : 0.5;

  const avgAttempts = progressRows.length > 0
    ? progressRows.reduce((sum, r) => sum + (r.attempts || 1), 0) / progressRows.length
    : 1;

  let result;
  if (avgScore >= 0.8 && avgAttempts <= 1.2) result = 'fast';
  else if (avgScore < 0.5 || avgAttempts >= 2.5) result = 'slow';
  else result = 'moderate';

  profileCache.set(cacheKey, result, 10 * 60_000);
  return result;
}

async function getEffectiveLearningStyle(userId = null) {
  const preference = await getUserLearningStyle(userId);
  if (preference !== 'auto' && VALID_LEARNING_STYLES.includes(preference)) {
    return preference;
  }
  const detected = await detectLearningStyle(userId);
  return detected || 'reading_writing';
}

async function getEffectiveLearningPace(userId = null) {
  const preference = await getUserLearningPace(userId);
  if (preference !== 'auto' && VALID_PACES.includes(preference)) {
    return preference;
  }
  const detected = await detectLearningPace(userId);
  return detected || 'moderate';
}

/** Invalidate all caches for a user (call on profile update). */
function invalidateUserCache(userId) {
  if (!userId) return;
  profileCache.invalidatePrefix(`profile:${userId}`);
  profileCache.invalidatePrefix(`settings:${userId}`);
  profileCache.invalidatePrefix(`weak:${userId}`);
  profileCache.invalidatePrefix(`style:${userId}`);
  profileCache.invalidatePrefix(`pace:${userId}`);
}

module.exports = {
  getUserTeachingLevel,
  getUserInterests,
  getUserProfile,
  getWeakTopics,
  getUserLearningStyle,
  getUserLearningPace,
  recordLearningInteraction,
  detectLearningStyle,
  detectLearningPace,
  getEffectiveLearningStyle,
  getEffectiveLearningPace,
  invalidateUserCache,
};
