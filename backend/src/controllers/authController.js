const supabase = require('../config/database');

async function getProfile(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.json({ profile: null });
    }
    if (error) throw error;

    res.json({
      profile: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        age: data.age,
        teachingLevel: data.teaching_level,
        interests: data.interests || [],
        onboardingCompleted: data.onboarding_completed,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createProfile(req, res, next) {
  try {
    const { displayName, avatarUrl, age, teachingLevel, interests } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        email: req.user.email,
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        age: age || null,
        teaching_level: teachingLevel || 'intermediate',
        interests: interests || [],
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Also sync teaching_level into user_settings for backward compat
    await supabase.rpc('upsert_user_setting', {
      p_key: 'teaching_level',
      p_value: teachingLevel || 'intermediate',
      p_user_id: req.user.id,
    });

    res.json({
      profile: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        age: data.age,
        teachingLevel: data.teaching_level,
        interests: data.interests || [],
        onboardingCompleted: data.onboarding_completed,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updates = {};
    const { displayName, avatarUrl, age, teachingLevel, interests } = req.body;

    if (displayName !== undefined) updates.display_name = displayName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (age !== undefined) updates.age = age;
    if (teachingLevel !== undefined) updates.teaching_level = teachingLevel;
    if (interests !== undefined) updates.interests = interests;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Sync teaching_level to user_settings if it changed
    if (teachingLevel !== undefined) {
      await supabase.rpc('upsert_user_setting', {
        p_key: 'teaching_level',
        p_value: teachingLevel,
        p_user_id: req.user.id,
      });
    }

    res.json({
      profile: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        age: data.age,
        teachingLevel: data.teaching_level,
        interests: data.interests || [],
        onboardingCompleted: data.onboarding_completed,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile, createProfile, updateProfile };
