#!/usr/bin/env node
/*
 * Paystack Apple Pay domain management.
 *
 * Usage:
 *   node scripts/applePayDomain.js list
 *   node scripts/applePayDomain.js register studyrag.co
 *   node scripts/applePayDomain.js unregister studyrag.co
 *
 * Requires PAYSTACK_SECRET_KEY in the environment (reads backend/.env).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE = 'https://api.paystack.co/apple-pay/domain';
const SECRET = process.env.PAYSTACK_SECRET_KEY;

if (!SECRET) {
  console.error('ERROR: PAYSTACK_SECRET_KEY is not set. Add it to backend/.env or export it.');
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(BASE, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  const [, , action, domain] = process.argv;

  if (!action || !['list', 'register', 'unregister'].includes(action)) {
    console.log('Usage:');
    console.log('  node scripts/applePayDomain.js list');
    console.log('  node scripts/applePayDomain.js register <domain>');
    console.log('  node scripts/applePayDomain.js unregister <domain>');
    process.exit(1);
  }

  if ((action === 'register' || action === 'unregister') && !domain) {
    console.error(`ERROR: ${action} requires a domain argument (e.g. studyrag.co)`);
    process.exit(1);
  }

  let result;
  if (action === 'list') {
    result = await fetch(`${BASE}?use_cursor=false`, {
      headers: { Authorization: `Bearer ${SECRET}` },
    }).then(async (r) => ({ status: r.status, ok: r.ok, json: await r.json().catch(() => ({})) }));
  } else if (action === 'register') {
    result = await call('POST', { domainName: domain });
  } else if (action === 'unregister') {
    result = await call('DELETE', { domainName: domain });
  }

  console.log(`HTTP ${result.status}`);
  console.log(JSON.stringify(result.json, null, 2));
  process.exit(result.ok ? 0 : 2);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
