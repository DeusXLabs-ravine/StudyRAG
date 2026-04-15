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
    // Always include 'card' as a fallback so there's at least one universally
    // supported channel even when the requested channel (e.g. apple_pay) hasn't
    // been activated on the Paystack dashboard yet.
    const resolvedChannel = channel ? PAYSTACK_CHANNEL_MAP[channel] : null;
    const paystackChannels = resolvedChannel
      ? [...new Set([resolvedChannel, 'card'])]
      : DEFAULT_PAYSTACK_CHANNELS;
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

// ── Stripe — Apple Pay / Google Pay ─────────────────────────────────────────
// Initialized lazily so the server starts fine even when STRIPE_SECRET_KEY
// isn't set yet (Paystack / Monnify still work as normal).

let _stripe = null;
const getStripe = () => {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
};

// Tier amounts in smallest currency unit (kobo for NGN, cents for USD)
const STRIPE_AMOUNTS = {
  basic: { ngn: 500_000,   usd: 1_000 },
  pro:   { ngn: 2_000_000, usd: 2_500 },
  max:   { ngn: 5_000_000, usd: 5_000 },
};

/**
 * POST /api/payment/stripe/intent
 * Creates a Stripe PaymentIntent and returns clientSecret + paymentIntentId.
 * The frontend uses these to confirm the Apple Pay / Google Pay payment.
 */
router.post('/stripe/intent', async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Apple/Google Pay not configured on this server.' });
    }

    const { tier, currency = 'usd' } = req.body;
    const user = req.user;

    const amounts = STRIPE_AMOUNTS[tier?.toLowerCase()];
    if (!amounts) {
      return res.status(400).json({ error: 'Invalid tier.' });
    }

    const curr = currency === 'ngn' ? 'ngn' : 'usd';
    const amount = curr === 'ngn' ? amounts.ngn : amounts.usd;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: curr,
      metadata: { userId: user.id, tier: tier.toLowerCase(), platform: 'studyrag' },
      // allow_redirects: 'never' keeps payment in-page (no 3DS redirect popups)
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('[Stripe] PaymentIntent error:', error.message);
    next(error);
  }
});

/**
 * POST /api/payment/stripe/confirm
 * Called after Apple Pay / Google Pay succeeds on the client.
 * Verifies the PaymentIntent against Stripe, then upgrades the subscription.
 */
router.post('/stripe/confirm', async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Apple/Google Pay not configured on this server.' });
    }

    const { paymentIntentId, tier } = req.body;
    const user = req.user;

    if (!paymentIntentId || !tier) {
      return res.status(400).json({ error: 'Missing paymentIntentId or tier.' });
    }

    // 1. Fetch from Stripe and verify status
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return res.status(400).json({ error: `Payment status: ${pi.status}. Not completed.` });
    }

    // 2. Guard against metadata mismatches (prevents tier-upgrade fraud)
    if (pi.metadata?.userId !== user.id || pi.metadata?.tier !== tier.toLowerCase()) {
      return res.status(403).json({ error: 'Payment metadata mismatch.' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // 3. Upgrade subscription
    await supabase
      .from('profiles')
      .update({
        subscription_tier: tier.toLowerCase(),
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // 4. Record transaction
    await supabase.from('transactions').insert([{
      user_id: user.id,
      payment_reference: paymentIntentId,
      transaction_reference: paymentIntentId,
      amount: pi.amount,
      currency: pi.currency.toUpperCase(),
      payment_method: 'stripe',
      status: 'PAID',
      description: `StudyRAG ${tier.toUpperCase()} via Apple/Google Pay`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

    console.log(`[Stripe] Upgraded user ${user.id} → ${tier.toUpperCase()}`);
    res.json({ success: true, tier: tier.toLowerCase() });
  } catch (error) {
    console.error('[Stripe] Confirm error:', error.message);
    next(error);
  }
});

module.exports = router;
