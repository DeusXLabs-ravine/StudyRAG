const supabase = require('../config/database');

async function getUserTeachingLevel(userId = null) {
  // Try profiles table first (has teaching_level directly)
  if (userId) {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('teaching_level')
      .eq('id', userId)
      .single();

    if (!profileErr && profile && profile.teaching_level) {
      return profile.teaching_level;
    }
  }

  // Fallback to user_settings
  const query = supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'teaching_level');

  if (userId) query.eq('user_id', userId);

  const { data, error } = await query.single();

  // PGRST116 = no rows found
  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.value : 'intermediate';
}

async function getUserInterests(userId = null) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('interests')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.interests || [];
}

async function getUserProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

async function getWeakTopics(limit = 10, threshold = 0.6, userId = null) {
  const { data, error } = await supabase.rpc('get_weak_topics', {
    threshold,
    result_limit: limit,
    p_user_id: userId,
  });
  if (error) throw error;
  return data || [];
}

module.exports = { getUserTeachingLevel, getUserInterests, getUserProfile, getWeakTopics };
