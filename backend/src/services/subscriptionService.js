const supabase = require('../config/database');
const { adminMaxEmails } = require('../config/env');

const TIER_ORDER = ['free', 'basic', 'pro', 'max'];
const ADMIN_UNLIMITED_LIMITS = Object.freeze({
  documents: Number.MAX_SAFE_INTEGER,
  chats: Number.MAX_SAFE_INTEGER,
  teach: true,
  games: true,
  simulations: true,
  podcast: true,
  live: true,
  tts: true,
  diagrams: Number.MAX_SAFE_INTEGER,
  proModels: true,
  buddy: true,
  buddyMinutesSoft: Number.MAX_SAFE_INTEGER,
  buddyMinutesHard: Number.MAX_SAFE_INTEGER,
});

const TIER_LIMITS = {
  free:  { documents: 2,   chats: 50,   teach: false, games: false, simulations: false, podcast: false, live: 0,   tts: 0,   diagrams: 5,   proModels: false, buddy: false, buddyMinutesSoft: 0,   buddyMinutesHard: 0   },
  basic: { documents: 10,  chats: 200,  teach: false, games: false, simulations: false, podcast: false, live: 0,   tts: 0,   diagrams: 20,  proModels: false, buddy: false, buddyMinutesSoft: 0,   buddyMinutesHard: 0   },
  pro:   { documents: 50,  chats: 1500, teach: true,  games: true,  simulations: true,  podcast: true,  live: 20,  tts: 30,  diagrams: 100, proModels: true,  buddy: false, buddyMinutesSoft: 0,   buddyMinutesHard: 0   },
  max:   { documents: 200, chats: 5000, teach: true,  games: true,  simulations: true,  podcast: true,  live: 60,  tts: 100, diagrams: 500, proModels: true,  buddy: true,  buddyMinutesSoft: 120, buddyMinutesHard: 300 },
};

function normalizeTier(tier) {
  return TIER_ORDER.includes(tier) ? tier : 'free';
}

function isAdminMaxEmail(email) {
  if (!email) return false;
  return adminMaxEmails.includes(email.toLowerCase().trim());
}

function getTierLimits(tier) {
  return TIER_LIMITS[normalizeTier(tier)] || TIER_LIMITS.free;
}

function isFeatureEnabled(limitValue) {
  if (limitValue === true) return true;
  if (typeof limitValue === 'number') return limitValue > 0;
  return Boolean(limitValue);
}

function getFeatureAccessFromLimits(limits) {
  return {
    canTeach: isFeatureEnabled(limits.teach),
    canGame: isFeatureEnabled(limits.games),
    canUseSimulations: isFeatureEnabled(limits.simulations),
    canPodcast: isFeatureEnabled(limits.podcast),
    canUseLive: isFeatureEnabled(limits.live),
    canUseTts: isFeatureEnabled(limits.tts),
    canUseProModels: isFeatureEnabled(limits.proModels),
    canUseBuddy: isFeatureEnabled(limits.buddy),
  };
}

function getFeatureAccess(tier) {
  return getFeatureAccessFromLimits(getTierLimits(tier));
}

function buildSubscriptionSnapshot(profile = {}, email = null) {
  const adminGranted = isAdminMaxEmail(email);
  const billingTier = normalizeTier(profile.subscription_tier);
  const tier = adminGranted ? 'max' : billingTier;
  const limits = adminGranted ? ADMIN_UNLIMITED_LIMITS : getTierLimits(tier);
  const status = adminGranted ? 'active' : (profile.subscription_status || (tier === 'free' ? 'inactive' : 'active'));

  return {
    tier,
    billingTier,
    planLabel: adminGranted ? 'Admin Unlimited' : tier.toUpperCase(),
    status,
    endDate: profile.subscription_end_date || null,
    limits,
    featureAccess: getFeatureAccessFromLimits(limits),
    isAdminGranted: adminGranted,
    isUnlimited: adminGranted,
  };
}

async function getSubscriptionSnapshotForUser(userId, email = null) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, subscription_tier, subscription_status, subscription_end_date, document_count')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  const snapshot = buildSubscriptionSnapshot(data || {}, email || data?.email || null);
  return {
    ...snapshot,
    documentCount: data?.document_count || 0,
  };
}

function inferTierFromString(value) {
  const source = String(value || '').toLowerCase();
  if (!source) return null;
  if (source.includes('max')) return 'max';
  if (source.includes('pro') || source.includes('premium')) return 'pro';
  if (source.includes('basic') || source.includes('plus')) return 'basic';
  return null;
}

function mapRevenueCatTier({ entitlementIds = [], productId = '' }) {
  const candidates = [...entitlementIds, productId].filter(Boolean);
  for (const candidate of candidates) {
    const inferred = inferTierFromString(candidate);
    if (inferred) return inferred;
  }
  return 'free';
}

function normalizeRevenueCatEvent(body) {
  const event = body?.event || body || {};
  const appUserId = event.app_user_id || event.original_app_user_id || body?.app_user_id || null;
  const entitlementIds = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids
    : event.entitlement_id
      ? [event.entitlement_id]
      : [];
  const productId = event.product_id || body?.product_id || '';
  const type = String(event.type || body?.type || '').toUpperCase();
  const expirationAt =
    event.expiration_at_ms ||
    event.expiration_at ||
    event.expires_date_ms ||
    event.expires_date ||
    null;
  const normalizedEndDate = expirationAt
    ? new Date(typeof expirationAt === 'number' ? expirationAt : expirationAt).toISOString()
    : null;
  const hasFutureEndDate = normalizedEndDate ? new Date(normalizedEndDate).getTime() > Date.now() : false;
  const derivedTier = mapRevenueCatTier({ entitlementIds, productId });
  const shouldDeactivate =
    derivedTier === 'free' &&
    !hasFutureEndDate &&
    ['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED', 'BILLING_ISSUE'].includes(type);

  return {
    type,
    appUserId,
    entitlementIds,
    productId,
    tier: hasFutureEndDate && derivedTier === 'free' ? inferTierFromString(productId) || 'free' : derivedTier,
    status: shouldDeactivate ? 'inactive' : (derivedTier === 'free' && !hasFutureEndDate ? 'inactive' : 'active'),
    endDate: normalizedEndDate,
  };
}

async function applySubscriptionState({
  userId,
  tier,
  status,
  endDate = null,
}) {
  const normalizedTier = normalizeTier(tier);
  const normalizedStatus = normalizedTier === 'free' ? 'inactive' : (status || 'active');

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: normalizedTier,
      subscription_status: normalizedStatus,
      subscription_end_date: normalizedTier === 'free' ? null : endDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

module.exports = {
  ADMIN_UNLIMITED_LIMITS,
  TIER_LIMITS,
  TIER_ORDER,
  normalizeTier,
  getTierLimits,
  getFeatureAccess,
  getFeatureAccessFromLimits,
  isFeatureEnabled,
  buildSubscriptionSnapshot,
  getSubscriptionSnapshotForUser,
  normalizeRevenueCatEvent,
  applySubscriptionState,
};
