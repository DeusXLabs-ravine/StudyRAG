const crypto = require('crypto');
const supabase = require('../config/database');
const { webhookSecret } = require('../config/env');

/**
 * Handle Supabase auth email webhook events.
 * Supabase sends these when users sign up, confirm email, reset password, etc.
 *
 * POST /webhooks/email
 * Headers: x-webhook-secret (optional, for verification)
 * Body: { type, record, table, schema, old_record }
 */
async function handleEmailWebhook(req, res) {
  // Verify webhook secret if configured
  if (webhookSecret) {
    const incomingSecret = req.headers['x-webhook-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!incomingSecret || !timingSafeCompare(incomingSecret, webhookSecret)) {
      console.warn('[Webhook] Email webhook rejected — invalid secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { type, record, table } = req.body;

  console.log(`[Webhook] Email event: ${type} on ${table}`, record?.id ? `(user: ${record.id.slice(0, 8)})` : '');

  try {
    switch (type) {
      case 'INSERT':
        // New user signed up — create profile row if needed
        if (table === 'users' && record?.id) {
          const { error } = await supabase.from('profiles').upsert({
            id: record.id,
            email: record.email,
            created_at: record.created_at,
          }, { onConflict: 'id' });
          if (error) console.error('[Webhook] Profile upsert error:', error.message);
          else console.log(`[Webhook] Profile created for ${record.email}`);
        }
        break;

      case 'UPDATE':
        // User confirmed email or updated profile
        if (table === 'users' && record?.id) {
          const updates = {};
          if (record.email_confirmed_at) updates.email_confirmed = true;
          if (record.email) updates.email = record.email;

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('profiles').update(updates).eq('id', record.id);
            if (error) console.error('[Webhook] Profile update error:', error.message);
          }
        }
        break;

      case 'DELETE':
        // User deleted — clean up profile
        if (table === 'users' && record?.id) {
          const { error } = await supabase.from('profiles').delete().eq('id', record.id);
          if (error) console.error('[Webhook] Profile delete error:', error.message);
          else console.log(`[Webhook] Profile deleted for user ${record.id.slice(0, 8)}`);
        }
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook] Processing error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks on webhook secrets.
 */
function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = { handleEmailWebhook };
