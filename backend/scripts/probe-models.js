#!/usr/bin/env node
/**
 * Probe every Gemini model this app can reach and report which are alive.
 *
 * Google decommissions model IDs without warning, and a dead ID sitting in a
 * fallback chain fails silently at the worst moment: the primary model gets rate
 * limited, the chain falls through to a 404, and the request dies after burning
 * its retries. Four such models were found in the chains on 2026-08-22
 * (gemini-2.0-flash-lite, gemini-2.0-flash, gemini-3-pro-preview, gemini-2.5-pro).
 *
 * Run this before editing MODELS / FALLBACK_MODELS in src/config/gemini.js, and
 * whenever generation starts failing for no obvious reason.
 *
 * Usage: node scripts/probe-models.js
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { MODELS, FALLBACK_MODELS } = require('../src/config/gemini');

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
const genAI = new GoogleGenerativeAI(key);

// Every model id referenced anywhere in the config, de-duplicated.
const ids = [...new Set([
  ...Object.values(MODELS).flatMap(v => (Array.isArray(v) ? v : [v])),
  ...Object.values(FALLBACK_MODELS).flat(),
])];

(async () => {
  const dead = [];
  for (const id of ids) {
    try {
      await genAI.getGenerativeModel({ model: id }).generateContent('hi');
      console.log('OK    ', id);
    } catch (err) {
      const msg = err.message || '';
      const gone = msg.includes('404') || msg.includes('no longer available');
      if (gone) dead.push(id);
      console.log(gone ? 'DEAD  ' : 'ERR   ', id, '|', (msg.split('] ')[1] || msg).slice(0, 90));
    }
  }

  console.log();
  if (dead.length) {
    console.log(`${dead.length} decommissioned model(s) still referenced in config:`);
    dead.forEach(d => console.log('  -', d));
    console.log('Remove these from src/config/gemini.js.');
    process.exit(1);
  }
  console.log('All referenced models are reachable.');
})();
