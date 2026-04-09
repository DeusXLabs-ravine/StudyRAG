const { revenueCatWebhookAuth } = require('../config/env');
const {
  applySubscriptionState,
  normalizeRevenueCatEvent,
} = require('../services/subscriptionService');

function isAuthorized(headerValue) {
  if (!revenueCatWebhookAuth) return true;
  if (!headerValue) return false;

  const raw = String(headerValue).trim();
  const withoutBearer = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
  return withoutBearer === revenueCatWebhookAuth;
}

async function handleRevenueCatWebhook(req, res) {
  try {
    if (!isAuthorized(req.headers.authorization || req.headers.Authorization || req.headers['x-revenuecat-auth'])) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = normalizeRevenueCatEvent(req.body);
    if (!event.appUserId) {
      return res.status(400).json({ error: 'Missing app_user_id in RevenueCat webhook payload' });
    }

    await applySubscriptionState({
      userId: event.appUserId,
      tier: event.tier,
      status: event.status,
      endDate: event.endDate,
    });

    console.log(`[RevenueCat] Synced ${event.appUserId} -> ${event.tier.toUpperCase()} (${event.type || 'UNKNOWN'})`);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[RevenueCat] Webhook processing failed:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = { handleRevenueCatWebhook };
