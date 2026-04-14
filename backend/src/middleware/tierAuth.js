const {
  TIER_LIMITS,
  getSubscriptionSnapshotForUser,
  isFeatureEnabled,
} = require('../services/subscriptionService');

// ── In-memory usage counters (reset monthly via cron or on profile fetch) ────
// Key: `${userId}:${feature}`, Value: count this billing period
const usageCounters = new Map();
const COUNTER_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const counterTimestamps = new Map();

function getUsageKey(userId, feature) {
  return `${userId}:${feature}`;
}

function getUsageCount(userId, feature) {
  const key = getUsageKey(userId, feature);
  const ts = counterTimestamps.get(key);
  // Auto-reset if older than 30 days
  if (ts && Date.now() - ts > COUNTER_TTL) {
    usageCounters.delete(key);
    counterTimestamps.delete(key);
    return 0;
  }
  return usageCounters.get(key) || 0;
}

function incrementUsage(userId, feature) {
  const key = getUsageKey(userId, feature);
  const current = getUsageCount(userId, feature);
  usageCounters.set(key, current + 1);
  if (!counterTimestamps.has(key)) {
    counterTimestamps.set(key, Date.now());
  }
  return current + 1;
}

// ── Document limit enforcement ───────────────────────────────────────────────

async function enforceDocumentLimit(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await getSubscriptionSnapshotForUser(user.id, user.email);
    const { tier, limits } = subscription;

    if (!subscription.isUnlimited && (subscription.documentCount || 0) >= limits.documents) {
      return res.status(403).json({
        error: 'Document limit reached',
        message: `Your ${tier.toUpperCase()} plan allows up to ${limits.documents} documents. Please upgrade to upload more.`,
      });
    }

    req.profile = {
      subscription_tier: tier,
      document_count: subscription.documentCount,
      is_admin_granted: subscription.isAdminGranted,
    };
    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('[TierAuth] Document limit check failed:', err);
    res.status(500).json({ error: 'Server error checking limits.' });
  }
}

// ── Feature gating ───────────────────────────────────────────────────────────

const FEATURE_MAP = {
  allow_teach: 'teach',
  allow_games: 'games',
  allow_simulations: 'simulations',
  allow_podcast: 'podcast',
  allow_live: 'live',
  allow_tts: 'tts',
  allow_pro_models: 'proModels',
};

function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await getSubscriptionSnapshotForUser(user.id, user.email);
      const { tier, limits } = subscription;
      const normalizedFeature = FEATURE_MAP[feature] || feature;

      if (!isFeatureEnabled(limits[normalizedFeature])) {
        const requiredTier = normalizedFeature === 'proModels' ? 'Pro' : 'Pro or Max';
        return res.status(403).json({
          error: 'Feature locked',
          feature: normalizedFeature,
          message: `Your current plan does not support this feature. Upgrade to ${requiredTier} to unlock it.`,
          upgradeRequired: true,
        });
      }

      req.subscription = subscription;
      req.tier = tier;
      req.tierLimits = limits;
      next();
    } catch (err) {
      console.error('[TierAuth] Feature verification failed:', err);
      res.status(500).json({ error: 'Server error verifying feature access.' });
    }
  };
}

// ── Usage cap enforcement ────────────────────────────────────────────────────
// Checks if the user has remaining quota for a capped feature (live, tts, diagrams)

function enforceUsageCap(feature) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await getSubscriptionSnapshotForUser(user.id, user.email);
      const { tier, limits } = subscription;
      const cap = limits[feature];

      // If cap is boolean false or 0, feature is not available
      if (!isFeatureEnabled(cap)) {
        return res.status(403).json({
          error: 'Feature locked',
          feature,
          message: `Your ${tier.toUpperCase()} plan does not include this feature. Please upgrade.`,
          upgradeRequired: true,
        });
      }

      if (subscription.isUnlimited) {
        req.subscription = subscription;
        req.tier = tier;
        req.tierLimits = limits;
        req.usageCount = null;
        req.usageLimit = null;
        return next();
      }

      // If cap is boolean true, no numeric limit — allow
      if (cap === true) {
        req.subscription = subscription;
        req.tier = tier;
        req.tierLimits = limits;
        return next();
      }

      // Numeric cap — check usage count
      const used = getUsageCount(user.id, feature);
      if (used >= cap) {
        return res.status(429).json({
          error: 'Usage limit reached',
          feature,
          used,
          limit: cap,
          message: `You've used ${used}/${cap} ${feature} requests this month. Upgrade for higher limits.`,
          upgradeRequired: true,
        });
      }

      // Increment and continue
      const newCount = incrementUsage(user.id, feature);
      req.subscription = subscription;
      req.tier = tier;
      req.tierLimits = limits;
      req.usageCount = newCount;
      req.usageLimit = cap;
      next();
    } catch (err) {
      console.error(`[TierAuth] Usage cap check failed for ${feature}:`, err);
      res.status(500).json({ error: 'Server error checking usage limits.' });
    }
  };
}

module.exports = {
  enforceDocumentLimit,
  requireFeature,
  enforceUsageCap,
  getUsageCount,
  incrementUsage,
  TIER_LIMITS,
};
