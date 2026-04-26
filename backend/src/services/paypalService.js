const { paypalClientId, paypalClientSecret, paypalEnvironment } = require('../config/env');

const PAYPAL_API_BASE =
  paypalEnvironment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

class PaypalService {
  /**
   * Generates an access token using Client ID and Secret
   */
  async generateAccessToken() {
    if (!paypalClientId || !paypalClientSecret) {
      throw new Error('MISSING_API_CREDENTIALS');
    }
    const auth = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64');
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to generate Access Token: ${data.error_description || data.error || 'Unknown error'}`);
    }
    return data.access_token;
  }

  /**
   * Creates a PayPal order (intent: CAPTURE)
   */
  async createOrder({ amount, currency, paymentReference, callbackUrl, cancelUrl, tier, userEmail, userId }) {
    const accessToken = await this.generateAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: paymentReference,
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            description: `StudyRAG ${tier.toUpperCase()} Subscription`,
            custom_id: JSON.stringify({ tier, userId, email: userEmail }),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'StudyRAG',
              locale: 'en-US',
              landing_page: 'LOGIN',
              user_action: 'PAY_NOW',
              return_url: callbackUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to create order: ${JSON.stringify(data)}`);
    }

    // Return the specific approval link inside the links array
    const approvalLink = data.links.find((link) => link.rel === 'payer-action');
    
    return {
      id: data.id,
      status: data.status,
      checkoutUrl: approvalLink ? approvalLink.href : null,
    };
  }

  /**
   * Captures the payment for an approved order
   */
  async captureOrder(orderId) {
    const accessToken = await this.generateAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    // According to PayPal API, a non-2xx status code or a status other than 'COMPLETED' indicates failure
    if (!response.ok || data.status !== 'COMPLETED') {
      throw new Error(`Failed to capture PayPal order: ${JSON.stringify(data)}`);
    }

    // Extract reference info
    const purchaseUnit = data.purchase_units && data.purchase_units[0];
    const capture = purchaseUnit && purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0];
    
    let customData = {};
    if (purchaseUnit && purchaseUnit.custom_id) {
      try {
        customData = JSON.parse(purchaseUnit.custom_id);
      } catch (e) {
        console.warn('[PayPal] Failed to parse custom_id', e);
      }
    }

    return {
      status: data.status, // "COMPLETED"
      orderId: data.id,
      paymentReference: purchaseUnit ? purchaseUnit.reference_id : null,
      captureId: capture ? capture.id : null,
      amount: capture ? capture.amount.value : null,
      currency: capture ? capture.amount.currency_code : null,
      tier: customData.tier,
      userId: customData.userId,
    };
  }
}

module.exports = new PaypalService();
