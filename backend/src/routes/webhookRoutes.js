const express = require('express');
const { handleEmailWebhook } = require('../controllers/webhookController');

const router = express.Router();

// POST /webhooks/email — handles Supabase auth email events (confirmations, magic links, password resets)
router.post('/email', handleEmailWebhook);

module.exports = router;
