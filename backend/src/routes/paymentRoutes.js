const express = require('express');
const router = express.Router();
const monnifyService = require('../services/monnifyService');
const paystackService = require('../services/paystackService');
const supabase = require('../config/database');
const crypto = require('crypto');
const { appBaseUrl } = require('../config/env');
const { getSubscriptionSnapshotForUser } = require('../services/subscriptionService');

// ── Tier pricing (NGN) ──────────────────────────────────────────────────────
const TIER_PRICING = {
  basic: 5000,
  pro: 20000,
  max: 50000,
};

// ── Valid Paystack channels ─────────────────────────────────────────────────
// See https://paystack.com/docs/payments/payment-channels/
// card | bank | ussd | qr | mobile_money | bank_transfer | apple_pay | eft
const PAYSTACK_CHANNEL_MAP = {
  card: 'card',
  apple_pay: 'apple_pay',
  bank_transfer: 'bank_transfer',
  bank: 'bank',
  ussd: 'ussd',
  qr: 'qr',
  mobile_money: 'mobile_money',
  eft: 'eft',
};
const DEFAULT_PAYSTACK_CHANNELS = ['card', 'bank', 'ussd', 'bank_transfer', 'apple_pay'];

// ── Paystack → Monnify channel mapping ──────────────────────────────────────
// Monnify uses CARD | ACCOUNT_TRANSFER | USSD | PHONE_NUMBER
const PAYSTACK_TO_MONNIFY_MAP = {
  card: 'CARD',
  bank_transfer: 'ACCOUNT_TRANSFER',
  bank: 'ACCOUNT_TRANSFER',
  ussd: 'USSD',
  mobile_money: 'PHONE_NUMBER',
};
const DEFAULT_MONNIFY_CHANNELS = ['CARD', 'ACCOUNT_TRANSFER', 'USSD'];

// ── Subscription ────────────────────────────────────────────────────────────

router.get('/subscription', async (req, res, next) => {
  try {
    const snapshot = await getSubscriptionSnapshotForUser(req.user.id, req.user.email);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

// ── Checkout (inline popup preferred) ───────────────────────────────────────

router.post('/checkout', async (req, res, next) => {
  try {
    const { tier, gateway = 'paystack', channel } = req.body;
    const user = req.user;

    if (!tier || !TIER_PRICING[tier.toLowerCase()]) {
      return res.status(400).json({ error: 'Invalid tier specified.' });
    }

    const amount = TIER_PRICING[tier.toLowerCase()];
    const paymentReference = `SRAG_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let checkoutUrl = '';
    let transactionReference = '';
    let accessCode = '';
    let actualGateway = '';

    // Resolve channel → valid Paystack channel(s)
    // When the caller explicitly requests apple_pay, restrict the transaction
    // to ONLY apple_pay so Paystack shows the native Apple Pay sheet instead
    // of the generic card input. For other explicit channels we still include
    // 'card' as a universal fallback.
    const resolvedChannel = channel ? PAYSTACK_CHANNEL_MAP[channel] : null;
    let paystackChannels;
    if (!resolvedChannel) {
      paystackChannels = DEFAULT_PAYSTACK_CHANNELS;
    } else if (resolvedChannel === 'apple_pay') {
      paystackChannels = ['apple_pay'];
    } else {
      paystackChannels = [...new Set([resolvedChannel, 'card'])];
    }
    const monnifyChannel = channel ? PAYSTACK_TO_MONNIFY_MAP[channel] : null;
    const monnifyChannels = monnifyChannel ? [monnifyChannel] : DEFAULT_MONNIFY_CHANNELS;

    if (gateway === 'paystack') {
      try {
        const response = await paystackService.initializeTransaction({
          amount,
          customerEmail: user.email,
          paymentReference,
          callbackUrl: `${appBaseUrl}/payment/verify?reference=${paymentReference}`,
          channels: paystackChannels,
          metadata: {
            tier: tier.toLowerCase(),
            userId: user.id,
            custom_fields: [
              { display_name: 'Plan', variable_name: 'plan', value: `StudyRAG ${tier.toUpperCase()}` },
            ],
          },
        });
        checkoutUrl = response.authorization_url;
        accessCode = response.access_code;           // ← for inline popup
        transactionReference = response.access_code;
        actualGateway = 'paystack';
      } catch (err) {
        console.warn('[PaymentRoutes] Paystack failed, falling back to Monnify', err.message);
        const response = await monnifyService.initializeTransaction({
          amount,
          customerName: user.display_name || 'StudyRAG Student',
          customerEmail: user.email,
          paymentReference,
          paymentDescription: `StudyRAG ${tier.toUpperCase()} Subscription`,
          redirectUrl: `${appBaseUrl}/payment/verify?reference=${paymentReference}`,
          paymentMethods: monnifyChannels,
        });
        checkoutUrl = response.checkoutUrl;
        transactionReference = response.transactionReference;
        actualGateway = 'monnify';
      }
    } else {
      const response = await monnifyService.initializeTransaction({
        amount,
        customerName: user.display_name || 'StudyRAG Student',
        customerEmail: user.email,
        paymentReference,
        paymentDescription: `StudyRAG ${tier.toUpperCase()} Subscription`,
        redirectUrl: `${appBaseUrl}/payment/verify?reference=${paymentReference}`,
        paymentMethods: monnifyChannels,
      });
      checkoutUrl = response.checkoutUrl;
      transactionReference = response.transactionReference;
      actualGateway = 'monnify';
    }

    // Save PENDING transaction (non-fatal)
    const { error: dbError } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        payment_reference: paymentReference,
        transaction_reference: transactionReference,
        amount,
        currency: 'NGN',
        payment_method: actualGateway,
        status: 'PENDING',
        description: `StudyRAG ${tier.toUpperCase()} Subscription`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

    if (dbError) {
      console.warn('[PaymentRoutes] DB insert failed (non-fatal):', dbError.message);
    }

    // Return access_code for inline popup + checkoutUrl as fallback
    res.json({
      accessCode: accessCode || null,      // frontend uses this for inline popup
      checkoutUrl: checkoutUrl || null,     // fallback for redirect / Monnify
      paymentReference,
      transactionReference,
    });

  } catch (error) {
    console.error('[PaymentRoutes] Checkout init error:', error);
    res.status(500).json({ error: 'Failed to initialize payment gateway.' });
  }
});

// ── Verify ──────────────────────────────────────────────────────────────────

/**
 * GET /api/payment/verify/:reference
 * Called by the frontend after Paystack inline popup succeeds, or when the
 * user returns from a hosted redirect page.
 */
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  const user = req.user;

  try {
    // 1. Look up transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_reference', reference)
      .eq('user_id', user.id)
      .single();

    if (txError || !transaction) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // 2. Already paid (webhook beat us here)
    if (transaction.status === 'PAID') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_end_date')
        .eq('id', user.id)
        .single();
      return res.json({ status: 'success', tier: profile?.subscription_tier, transaction });
    }

    // 3. Only Paystack supports on-demand verify
    if (transaction.payment_method !== 'paystack') {
      return res.json({ status: 'pending', transaction });
    }

    // 4. Verify with Paystack API
    const paystackData = await paystackService.verifyTransaction(reference);

    if (paystackData.status !== 'success') {
      return res.json({ status: paystackData.status, transaction });
    }

    // 5. Determine tier from amount, with metadata fallback
    let newTier = 'free';
    if (transaction.amount == 5000) newTier = 'basic';
    if (transaction.amount == 20000) newTier = 'pro';
    if (transaction.amount == 50000) newTier = 'max';

    // Metadata fallback
    if (newTier === 'free' && paystackData.metadata?.tier) {
      const metaTier = String(paystackData.metadata.tier).toLowerCase();
      if (['basic', 'pro', 'max'].includes(metaTier)) newTier = metaTier;
    }

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
        updated_at: new Date(),
      })
      .eq('id', user.id);

    console.log(`[PaymentVerify] Upgraded user ${user.id} to ${newTier.toUpperCase()} via callback verify.`);

    return res.json({ status: 'success', tier: newTier, transaction });
  } catch (error) {
    console.error('[PaymentVerify] Error:', error);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

module.exports = router;
