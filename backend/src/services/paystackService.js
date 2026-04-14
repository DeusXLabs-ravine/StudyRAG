const crypto = require('crypto');
const { paystackSecret } = require('../config/env');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

class PaystackService {
  /**
   * Initialize a new transaction
   */
  async initializeTransaction({ amount, customerEmail, paymentReference, callbackUrl, channels, metadata }) {
    try {
      // Paystack expects amount in Kobo (amount * 100)
      const amountInKobo = amount * 100;

      const body = {
        amount: amountInKobo,
        email: customerEmail,
        reference: paymentReference,
        callback_url: callbackUrl,
        channels: channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      };
      if (metadata) body.metadata = metadata;

      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.status) {
        return data.data; // Contains authorization_url and access_code
      }
      throw new Error(`Failed to init Paystack transaction: ${data.message}`);
    } catch (error) {
      console.error('[PaystackService] Error initializing transaction:', error.message);
      throw error;
    }
  }

  /**
   * Verifies a transaction by reference via Paystack API
   */
  async verifyTransaction(reference) {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${paystackSecret}` }
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || 'Paystack verify failed');
    return data.data; // { status: 'success'|'failed', amount, reference, ... }
  }

  /**
   * Verifies the Paystack Webhook Signature
   */
  verifyWebhookSignature(payloadString, signature) {
    const hash = crypto.createHmac('sha512', paystackSecret)
                       .update(payloadString)
                       .digest('hex');
    return hash === signature;
  }
}

module.exports = new PaystackService();
