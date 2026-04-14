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

/**
 * Handle Monnify Webhooks
 */
async function handleMonnifyWebhook(req, res) {
  try {
    const signature = req.headers['monnify-signature'];
    if (!signature) {
      console.warn('[Monnify Webhook] Rejected — Missing signature.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    const rawBody = req.rawBody || JSON.stringify(payload);
    const monnifyService = require('../services/monnifyService');

    // Verify signature against raw request body
    if (!monnifyService.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Monnify Webhook] Rejected — Invalid signature.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Acknowledge receipt
    res.status(200).json({ received: true });

    const eventType = payload.eventType;

    // ── Successful payment ──────────────────────────────────────────
    if (eventType === 'SUCCESSFUL_TRANSACTION') {
      const paymentReference = payload.eventData?.paymentReference;
      console.log(`[Monnify Webhook] Successful Payment: ${paymentReference}`);

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_reference', paymentReference)
        .single();

      if (txError || !transaction) {
        console.error(`[Monnify Webhook] Transaction not found for ref: ${paymentReference}`);
        return;
      }

      if (transaction.status === 'PAID') {
        console.log(`[Monnify Webhook] Already processed: ${paymentReference}`);
        return;
      }

      // Use Monnify-confirmed amount if available, fall back to DB amount
      const confirmedAmount = payload.eventData?.amountPaid || payload.eventData?.amount || transaction.amount;
      let newTier = 'free';
      if (confirmedAmount == 5000)  newTier = 'basic';
      if (confirmedAmount == 20000) newTier = 'pro';
      if (confirmedAmount == 50000) newTier = 'max';

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await supabase
        .from('transactions')
        .update({ status: 'PAID', updated_at: new Date() })
        .eq('id', transaction.id);

      await supabase
        .from('profiles')
        .update({
          subscription_tier: newTier,
          subscription_status: 'active',
          subscription_end_date: endDate,
          updated_at: new Date()
        })
        .eq('id', transaction.user_id);

      console.log(`[Monnify Webhook] Upgraded user ${transaction.user_id} to ${newTier.toUpperCase()}.`);
    }

    // ── Refund completed ────────────────────────────────────────────
    else if (eventType === 'SUCCESSFUL_REFUND') {
      const { transactionReference, refundStatus, customerNote } = payload.eventData || {};
      console.log(`[Monnify Webhook] Refund completed for txn: ${transactionReference}`);

      if (refundStatus !== 'COMPLETED') return;

      // Look up by transaction_reference (the Monnify-side ref stored at checkout)
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_reference', transactionReference)
        .single();

      if (!transaction) {
        console.warn(`[Monnify Webhook] No transaction found for txn ref: ${transactionReference}`);
        return;
      }

      // Mark transaction refunded
      await supabase
        .from('transactions')
        .update({ status: 'REFUNDED', updated_at: new Date() })
        .eq('id', transaction.id);

      // Downgrade user back to free
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_end_date: null,
          updated_at: new Date()
        })
        .eq('id', transaction.user_id);

      console.log(`[Monnify Webhook] Refund processed — user ${transaction.user_id} downgraded to free.`);
    }

    else {
      console.log(`[Monnify Webhook] Unhandled event type: ${eventType}`);
    }

  } catch (error) {
    console.error('[Monnify Webhook] Processing error:', error);
  }
}

/**
 * Handle Paystack Webhooks
 */
async function handlePaystackWebhook(req, res) {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!signature) {
      console.warn('[Paystack Webhook] Rejected — Missing signature.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    const rawBody = req.rawBody || JSON.stringify(payload);
    const paystackService = require('../services/paystackService');

    // Verify signature against raw request body (Paystack requirement)
    if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Paystack Webhook] Rejected — Invalid signature.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Acknowledge receipt immediately (Paystack requirement)
    res.status(200).json({ received: true });

    // Process payment success
    if (payload.event === 'charge.success') {
      const paymentData = payload.data;
      const paymentReference = paymentData.reference;

      console.log(`[Paystack Webhook] Successful Payment: ${paymentReference}`);

      // 1. Get the transaction from DB
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_reference', paymentReference)
        .single();

      // Check if already processed
      if (transaction?.status === 'PAID') {
        console.log(`[Paystack Webhook] Transaction ${paymentReference} already processed.`);
        return;
      }

      // 2. Determine tier from Paystack-confirmed amount (in kobo → NGN)
      const amountNaira = (paymentData.amount || 0) / 100;
      let newTier = 'free';
      if (amountNaira == 5000)  newTier = 'basic';
      if (amountNaira == 20000) newTier = 'pro';
      if (amountNaira == 50000) newTier = 'max';

      // Fallback: read tier from metadata if amount mapping gave 'free'
      if (newTier === 'free' && paymentData.metadata?.tier) {
        const metaTier = String(paymentData.metadata.tier).toLowerCase();
        if (['basic', 'pro', 'max'].includes(metaTier)) newTier = metaTier;
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      if (txError || !transaction) {
        // Transaction not in DB — recover using user_id from Paystack metadata
        console.warn(`[Paystack Webhook] Transaction not found for ref: ${paymentReference} — attempting recovery`);

        const userId = paymentData.metadata?.user_id;
        if (!userId) {
          console.error(`[Paystack Webhook] Cannot recover — no user_id in metadata for ref: ${paymentReference}`);
          return;
        }

        // Create the missing transaction record
        await supabase.from('transactions').insert({
          user_id: userId,
          payment_reference: paymentReference,
          transaction_reference: paymentData.access_code || paymentReference,
          amount: amountNaira,
          currency: 'NGN',
          payment_method: 'paystack',
          status: 'PAID',
          description: `StudyRAG ${newTier.toUpperCase()} Subscription`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        await supabase.from('profiles').update({
          subscription_tier: newTier,
          subscription_status: 'active',
          subscription_end_date: endDate,
          updated_at: new Date(),
        }).eq('id', userId);

        console.log(`[Paystack Webhook] RECOVERED: upgraded user ${userId} to ${newTier.toUpperCase()}`);
        return;
      }

      // 3. Update Transaction Status
      await supabase
        .from('transactions')
        .update({ status: 'PAID', updated_at: new Date() })
        .eq('id', transaction.id);

      // 4. Update User Profile
      await supabase
        .from('profiles')
        .update({
          subscription_tier: newTier,
          subscription_status: 'active',
          subscription_end_date: endDate,
          updated_at: new Date()
        })
        .eq('id', transaction.user_id);

      console.log(`[Paystack Webhook] Upgraded user ${transaction.user_id} to ${newTier.toUpperCase()} tier.`);
    }

    // ── Refund completed ────────────────────────────────────────────
    else if (payload.event === 'refund.processed') {
      const paymentReference = payload.data?.transaction_reference;
      console.log(`[Paystack Webhook] Refund processed for ref: ${paymentReference}`);

      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_reference', paymentReference)
        .single();

      if (!transaction) {
        console.warn(`[Paystack Webhook] No transaction found for refund ref: ${paymentReference}`);
        return;
      }

      await supabase
        .from('transactions')
        .update({ status: 'REFUNDED', updated_at: new Date() })
        .eq('id', transaction.id);

      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_end_date: null,
          updated_at: new Date()
        })
        .eq('id', transaction.user_id);

      console.log(`[Paystack Webhook] Refund — user ${transaction.user_id} downgraded to free.`);
    }

    else {
      console.log(`[Paystack Webhook] Unhandled event: ${payload.event}`);
    }

  } catch (error) {
    console.error('[Paystack Webhook] Processing error:', error);
  }
}

module.exports = { handleEmailWebhook, handleMonnifyWebhook, handlePaystackWebhook };
