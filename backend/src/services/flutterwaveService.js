const { flutterwaveSecretKey } = require('../config/env');
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

class FlutterwaveService {
  async verifyTransaction(transactionId) {
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`, {
      headers: { 'Authorization': `Bearer ${flutterwaveSecretKey}` }
    });
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message || 'Flutterwave verify failed');
    return data.data; // { status: 'successful', amount, currency, tx_ref, meta... }
  }
}

module.exports = new FlutterwaveService();
