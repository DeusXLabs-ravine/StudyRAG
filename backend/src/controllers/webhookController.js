const crypto = require('crypto');
const supabase = require('../config/database');
const { webhookSecret } = require('../config/env');
const { replyToEmail } = require('../services/emailService');

/**
 * Handle inbound email webhook from Cloudflare Worker.
 * The Worker parses the full email (via postal-mime) and POSTs:
 * {
 *   type: 'email.received',
 *   data: { from, from_name, to, subject, text, html, attachments, message_id, reply_to, ... }
 * }
 *
 * POST /webhooks/email
 */
async function handleEmailWebhook(req, res) {
  // Verify shared secret
  if (webhookSecret) {
    const sig = req.headers['x-webhook-secret'];
    if (!sig || !timingSafeCompare(sig, webhookSecret)) {
      console.warn('[Webhook] Rejected — invalid or missing secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { type, data } = req.body;
  if (!type || !data) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Respond 200 immediately
  res.status(200).json({ received: true });

  // Process async
  try {
    console.log(`[Webhook] ${type} — ${data.from} → ${data.to}: "${data.subject}"`);

    if (type === 'email.received') {
      await routeInboundEmail(data);
    }
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
  }
}

/**
 * Route by recipient address. Cloudflare is a catch-all so anything@studyrag.co arrives here.
 */
async function routeInboundEmail(data) {
  const { from, from_name, to, subject, text, html, message_id, reply_to, attachments } = data;
  const addr = (to || '').toLowerCase();
  const sender = from || 'unknown';
  const body = text || html || '';

  const emailData = { sender, from_name, subject, body, html, message_id, reply_to, attachments, addr };

  // Personal mailboxes
  if (addr.startsWith('daniel@')) {
    await storeEmail('daniel', emailData);
  } else if (addr.startsWith('dearie@')) {
    await storeEmail('dearie', emailData);
  } else if (addr.startsWith('titilola@')) {
    await storeEmail('titilola', emailData);

  // Functional mailboxes
  } else if (addr.startsWith('support@')) {
    await storeEmail('support', emailData);
  } else if (addr.startsWith('feedback@')) {
    await storeEmail('feedback', emailData);
  } else if (addr.startsWith('admin@')) {
    await storeEmail('admin', emailData);
  } else if (addr.startsWith('billing@')) {
    await storeEmail('billing', emailData);
  } else if (addr.startsWith('security@')) {
    await storeEmail('security', emailData);
  } else if (addr.startsWith('partnerships@') || addr.startsWith('partner@')) {
    await storeEmail('partnerships', emailData);

  // Ignored
  } else if (addr.startsWith('noreply@') || addr.startsWith('no-reply@')) {
    console.log(`[Webhook] Ignoring reply to noreply from ${sender}`);

  // Catch-all
  } else {
    await storeEmail('general', emailData);
  }
}

/**
 * Store inbound email in the database.
 */
async function storeEmail(category, { sender, from_name, subject, body, html, message_id, reply_to, attachments, addr }) {
  console.log(`[${category}] From ${from_name || sender}: "${subject}"`);

  const { error } = await supabase.from('inbound_emails').insert({
    category,
    sender_email: sender,
    sender_name: from_name || null,
    recipient: addr || `${category}@studyrag.co`,
    subject,
    body_text: body?.slice(0, 100000) || null,
    body_html: html?.slice(0, 100000) || null,
    message_id: message_id || null,
    reply_to: reply_to || null,
    attachments: attachments?.length > 0 ? JSON.stringify(attachments) : null,
    status: 'new',
  });

  if (error) {
    if (error.code === '42P01') {
      console.warn('[Webhook] Table "inbound_emails" does not exist — run the migration');
    } else {
      console.error(`[Webhook] DB error: ${error.message}`);
    }
  }
}

/**
 * Timing-safe comparison for webhook secrets.
 */
function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = { handleEmailWebhook };
