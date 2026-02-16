const supabase = require('../config/database');

async function getUserTeachingLevel() {
  const { data, error } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'teaching_level')
    .single();

  // PGRST116 = no rows found
  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.value : 'intermediate';
}

async function getWeakTopics(limit = 10, threshold = 0.6) {
  const { data, error } = await supabase.rpc('get_weak_topics', {
    threshold,
    result_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

module.exports = { getUserTeachingLevel, getWeakTopics };
