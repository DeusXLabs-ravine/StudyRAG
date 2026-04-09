const supabase = require('../config/database');
const { TIER_LIMITS, normalizeTier } = require('../services/subscriptionService');

async function enforceDocumentLimit(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, document_count')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return res.status(500).json({ error: 'Failed to access user profile.' });
    }

    const tier = normalizeTier(profile.subscription_tier);
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    if ((profile.document_count || 0) >= limits.documents) {
      return res.status(403).json({
        error: 'Document limit reached',
        message: `Your ${tier.toUpperCase()} plan allows up to ${limits.documents} documents. Please upgrade to upload more.`,
      });
    }

    req.profile = profile;
    next();
  } catch (err) {
    console.error('[TierAuth] Document limit check failed:', err);
    res.status(500).json({ error: 'Server error checking limits.' });
  }
}

function requireFeature(feature) {
  const featureMap = {
    allow_teach: 'teach',
    allow_games: 'games',
    allow_simulations: 'simulations',
    allow_podcast: 'podcast',
  };

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (error) {
        return res.status(500).json({ error: 'Server error verifying feature access.' });
      }

      const tier = normalizeTier(profile?.subscription_tier);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      const normalizedFeature = featureMap[feature] || feature;

      if (!limits[normalizedFeature]) {
        return res.status(403).json({
          error: 'Feature locked',
          message: 'Your current plan does not support this feature. Upgrade to Pro or Max to unlock it.',
        });
      }

      next();
    } catch (err) {
      console.error('[TierAuth] Feature verification failed:', err);
      res.status(500).json({ error: 'Server error verifying feature access.' });
    }
  };
}

module.exports = { enforceDocumentLimit, requireFeature, TIER_LIMITS };
