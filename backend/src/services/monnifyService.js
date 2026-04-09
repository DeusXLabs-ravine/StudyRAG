const crypto = require('crypto');
const { monnifyKey, monnifySecret, monnifyContractCode } = require('../config/env');

const MONNIFY_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.monnify.com' 
  : 'https://sandbox.monnify.com';

class MonnifyService {
  /**
   * Encodes API Key and Secret for Basic Auth
   */
  getBasicAuthToken() {
    const encoded = Buffer.from(`${monnifyKey}:${monnifySecret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Generates a Monnify Access Token
   */
  async getAccessToken() {
    try {
      const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': this.getBasicAuthToken(),
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.requestSuccessful) {
        return data.responseBody.accessToken;
      }
      throw new Error(`Failed to get Monnify token: ${data.responseMessage}`);
    } catch (error) {
      console.error('[MonnifyService] Error getting access token:', error.message);
      throw error;
    }
  }

  /**
   * Initialize a new transaction
   */
  async initializeTransaction({ amount, customerName, customerEmail, paymentReference, paymentDescription, paymentMethods }) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/merchant/transactions/init-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          customerName: customerName || 'StudyRAG Student',
          customerEmail,
          paymentReference,
          paymentDescription,
          currencyCode: 'NGN',
          contractCode: monnifyContractCode,
          paymentMethods: paymentMethods || ['CARD', 'ACCOUNT_TRANSFER', 'USSD']
        })
      });

      const data = await response.json();
      if (data.requestSuccessful) {
        return data.responseBody; // Contains checkoutUrl and transactionReference
      }
      throw new Error(`Failed to init transaction: ${data.responseMessage}`);
    } catch (error) {
      console.error('[MonnifyService] Error initializing transaction:', error.message);
      throw error;
    }
  }

  /**
   * Verifies the Monnify Webhook Signature
   */
  verifyWebhookSignature(rawBody, signature) {
    const hash = crypto.createHmac('sha512', monnifySecret)
                       .update(rawBody)
                       .digest('hex');
    return hash === signature;
  }
}

module.exports = new MonnifyService();
