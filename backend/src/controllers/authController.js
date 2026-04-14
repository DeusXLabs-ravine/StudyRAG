const supabase = require('../config/database');
const { getSubscriptionSnapshotForUser } = require('../services/subscriptionService');

async function serializeProfile(data, authUser) {
  if (!data) return null;

  const subscription = await getSubscriptionSnapshotForUser(data.id, authUser?.email || data.email || null);

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    age: data.age,
    teachingLevel: data.teaching_level,
    interests: data.interests || [],
    onboardingCompleted: data.onboarding_completed,
    createdAt: data.created_at,
    subscription_tier: subscription.tier,
    subscription_status: subscription.status,
    subscription_end_date: subscription.endDate,
    document_count: data.document_count || 0,
    isAdminGranted: subscription.isAdminGranted,
    isUnlimited: subscription.isUnlimited,
    planLabel: subscription.planLabel,
    billing_tier: subscription.billingTier,
    feature_access: subscription.featureAccess,
  };
}

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
      profile: await serializeProfile(data, req.user),
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

    res.json({
      profile: await serializeProfile(data, req.user),
    });

    syncTeachingLevel(teachingLevel || 'intermediate');

    try {
      const { sendWelcomeEmail } = require('../services/emailService');
      sendWelcomeEmail(req.user.email, displayName).catch((err) =>
        console.warn('[Email] Welcome email failed (non-critical):', err.message)
      );
    } catch {
      // Email service is optional in local/dev environments.
    }
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

    res.json({
      profile: await serializeProfile(data, req.user),
    });

    if (teachingLevel !== undefined) {
      syncTeachingLevel(teachingLevel);
    }
  } catch (error) {
    next(error);
  }
}

function syncTeachingLevel(level) {
  supabase
    .rpc('upsert_user_setting', {
      p_key: 'teaching_level',
      p_value: level,
    })
    .then(({ error }) => {
      if (error) {
        console.warn('Non-critical: failed to sync teaching_level:', error.message);
      }
    });
}

async function adminGrantTier(req, res, next) {
  try {
    const { email, tier } = req.body;
    const validTiers = ['free', 'basic', 'pro', 'max'];

    if (!email || !tier || !validTiers.includes(tier)) {
      return res.status(400).json({ error: 'email and tier (free/basic/pro/max) are required' });
    }

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserByEmail(email);
    if (userErr || !userData?.user) {
      return res.status(404).json({ error: `No user found with email: ${email}` });
    }

    const userId = userData.user.id;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: tier === 'free' ? 'inactive' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileErr) throw profileErr;

    console.log(`[Admin] Granted tier '${tier}' to ${email} by ${req.user.email}`);
    res.json({ success: true, message: `Granted '${tier}' tier to ${email}` });
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile, createProfile, updateProfile, adminGrantTier };
