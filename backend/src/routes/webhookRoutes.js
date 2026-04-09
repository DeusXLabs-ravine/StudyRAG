const express = require('express');
const { handleEmailWebhook, handleMonnifyWebhook, handlePaystackWebhook } = require('../controllers/webhookController');
const { handleRevenueCatWebhook } = require('../controllers/revenueCatWebhookController');

const router = express.Router();

// POST /webhooks/email — handles Supabase auth email events (confirmations, magic links, password resets)
router.post('/email', handleEmailWebhook);
router.post('/monnify', express.json(), handleMonnifyWebhook);
router.post('/paystack', express.json(), handlePaystackWebhook);
router.post('/revenuecat', express.json(), handleRevenueCatWebhook);

module.exports = router;
