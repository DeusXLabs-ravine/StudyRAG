const express = require('express');
const router = express.Router();
const monnifyService = require('../services/monnifyService');
const paystackService = require('../services/paystackService');
const supabase = require('../config/database');
const crypto = require('crypto');
const { appBaseUrl } = require('../config/env');
const { getSubscriptionSnapshotForUser } = require('../services/subscriptionService');

// Map frontend tier names to prices
const TIER_PRICING = {
  basic: 5000,
  pro: 20000,
  max: 30000
};

router.get('/subscription', async (req, res, next) => {
  try {
    const snapshot = await getSubscriptionSnapshotForUser(req.user.id, req.user.email);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const { tier, gateway = 'paystack', channel } = req.body;
    const user = req.user; // Appended by requireAuth middleware
    
    if (!tier || !TIER_PRICING[tier.toLowerCase()]) {
      return res.status(400).json({ error: 'Invalid tier specified.' });
    }

    const amount = TIER_PRICING[tier.toLowerCase()];
    const paymentReference = `SRAG_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    let checkoutUrl = '';
    let transactionReference = '';
    let actualGateway = '';

    const paystackChannels = channel ? [channel] : ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];
    const monnifyChannels = channel ? [channel.toUpperCase()] : ['CARD', 'ACCOUNT_TRANSFER', 'USSD'];

    if (gateway === 'paystack') {
      try {
        const response = await paystackService.initializeTransaction({
          amount,
          customerEmail: user.email,
          paymentReference,
          callbackUrl: `${appBaseUrl}/payment/verify?reference=${paymentReference}`,
          channels: paystackChannels
        });
        checkoutUrl = response.authorization_url;
        transactionReference = response.access_code;
        actualGateway = 'paystack';
      } catch (err) {
        console.warn('[PaymentRoutes] Paystack failed, falling back to Monnify', err.message);
        // Fallback to Monnify
        const response = await monnifyService.initializeTransaction({
          amount,
          customerName: user.display_name || 'StudyRAG Student',
          customerEmail: user.email,
          paymentReference,
          paymentDescription: `StudyRAG ${tier.toUpperCase()} Subscription`,
          paymentMethods: monnifyChannels
        });
        checkoutUrl = response.checkoutUrl;
        transactionReference = response.transactionReference;
        actualGateway = 'monnify';
      }
    } else {
      // Monnify forced
      const response = await monnifyService.initializeTransaction({
        amount,
        customerName: user.display_name || 'StudyRAG Student',
        customerEmail: user.email,
        paymentReference,
        paymentDescription: `StudyRAG ${tier.toUpperCase()} Subscription`,
        paymentMethods: monnifyChannels
      });
      checkoutUrl = response.checkoutUrl;
      transactionReference = response.transactionReference;
      actualGateway = 'monnify';
    }

    // Save transaction to database as PENDING (non-fatal — don't block checkout if table missing)
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
      // Log but don't block — user can still pay, webhook will handle upgrade
      console.warn('[PaymentRoutes] Could not record transaction in DB (non-fatal):', dbError.message);
    }

    res.json({
      checkoutUrl,
      paymentReference,
      transactionReference,
    });

  } catch (error) {
    console.error('[PaymentRoutes] Checkout init error:', error);
    res.status(500).json({ error: 'Failed to initialize payment gateway.' });
  }
});

/**
 * GET /api/payment/verify/:reference
 * Called by the frontend when the user returns from Paystack's hosted checkout page.
 * Checks DB first (webhook may have already processed it), then falls back to
 * calling Paystack's verify API and processing the upgrade if confirmed.
 */
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  const user = req.user;

  try {
    // 1. Look up transaction in DB
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

    // 3. Still pending — only Paystack supports on-demand verify
    if (transaction.payment_method !== 'paystack') {
      return res.json({ status: 'pending', transaction });
    }

    // 4. Call Paystack verify API
    const paystackData = await paystackService.verifyTransaction(reference);

    if (paystackData.status !== 'success') {
      return res.json({ status: paystackData.status, transaction });
    }

    // 5. Confirmed paid — determine tier and upgrade
    let newTier = 'free';
    if (transaction.amount == 5000)  newTier = 'basic';
    if (transaction.amount == 20000) newTier = 'pro';
    if (transaction.amount == 30000) newTier = 'max';

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
      .eq('id', user.id);

    console.log(`[PaymentVerify] Upgraded user ${user.id} to ${newTier.toUpperCase()} via callback verify.`);

    return res.json({ status: 'success', tier: newTier, transaction });

  } catch (error) {
    console.error('[PaymentVerify] Error:', error);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

module.exports = router;
