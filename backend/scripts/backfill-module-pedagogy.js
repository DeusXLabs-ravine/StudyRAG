#!/usr/bin/env node
/**
 * Backfill `outcome` and `bloom_level` on modules generated before the pedagogy
 * layer existed.
 *
 * Safe by construction:
 *  - only ever writes the two columns, and only where `outcome` IS NULL
 *  - never touches content, questions, progress, or any other column
 *  - idempotent: re-running only picks up rows still missing an outcome
 *  - `--dry` prints what it would write without touching the database
 *
 * Usage:
 *   node scripts/backfill-module-pedagogy.js [--dry] [--limit N]
 */
const supabase = require('../src/config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../src/config/gemini');
const { extractJSON } = require('../src/utils/jsonHelper');

const DRY = process.argv.includes('--dry');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

// Small enough that one truncated response costs little, large enough that the
// whole backlog is a few dozen calls rather than a thousand.
const BATCH = 15;
// Deliberately modest: this is a bulk background job competing with real user
// traffic for the same per-key quota. Running it hot exhausts the daily limit
// and starves live generation.
const CONCURRENCY = 2;

/** Quota exhaustion is an operational limit, not a failure to debug. */
function isQuotaError(err) {
  const m = err?.message || '';
  return m.includes('429') || m.includes('Too Many Requests') || m.includes('exhausted');
}

const PROMPT = `For each lesson below, state the single outcome it teaches and tag its Bloom level.

An outcome names what the student will be able to DO afterwards, written as
"You will be able to ...". One sentence. Base it only on the lesson given.

Bloom level must be exactly one of:
remember | understand | apply | analyse | evaluate | create

LESSONS:
{lessons}

Return ONLY valid JSON, one entry per lesson, in the same order:
{"results":[{"i":1,"outcome":"You will be able to ...","bloomLevel":"apply"}]}`;

const VALID_BLOOM = new Set(['remember', 'understand', 'apply', 'analyse', 'evaluate', 'create']);

async function processBatch(rows) {
  const lessons = rows.map((r, i) => {
    const objectives = Array.isArray(r.objectives) ? r.objectives.join('; ') : '';
    const snippet = String(r.content || '').slice(0, 700).replace(/\s+/g, ' ');
    return `${i + 1}. TITLE: ${r.title}\n   TOPIC: ${r.topic || ''}\n   OBJECTIVES: ${objectives}\n   EXCERPT: ${snippet}`;
  }).join('\n\n');

  const result = await withRetryOnRateLimit(async () => {
    // thinkingBudget 0 — reasoning tokens count against maxOutputTokens and
    // would truncate the JSON. See moduleGenerator.generateModuleBatch.
    const model = getGenerativeModel('fast_lite');
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: PROMPT.replace('{lessons}', lessons) }] }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
    });
  }, 3, 1);

  const parsed = extractJSON(result.response.text());
  const results = parsed?.results || [];
  let written = 0;

  for (const entry of results) {
    const row = rows[(entry.i || 0) - 1];
    if (!row || !entry.outcome) continue;
    const bloom = VALID_BLOOM.has(String(entry.bloomLevel || '').toLowerCase())
      ? String(entry.bloomLevel).toLowerCase()
      : null;

    if (DRY) {
      console.log(`  [dry] ${row.title.slice(0, 44).padEnd(44)} ${bloom || '-'} | ${entry.outcome.slice(0, 60)}`);
      written++;
      continue;
    }

    const { error } = await supabase
      .from('modules')
      .update({ outcome: entry.outcome, bloom_level: bloom })
      .eq('id', row.id)
      .is('outcome', null); // never overwrite an outcome that already exists
    if (error) console.warn(`  update failed for ${row.id}: ${error.message}`);
    else written++;
  }
  return written;
}

(async () => {
  const { count } = await supabase
    .from('modules').select('*', { count: 'exact', head: true }).is('outcome', null);
  console.log(`Modules missing an outcome: ${count}${DRY ? ' (dry run)' : ''}`);
  if (!count) return;

  const target = Math.min(count, LIMIT);
  let processed = 0;
  let written = 0;
  let page = 0;

  while (processed < target) {
    const pageSize = Math.min(BATCH * CONCURRENCY, target - processed);
    const { data: rows, error } = await supabase
      .from('modules')
      .select('id, title, topic, objectives, content')
      .is('outcome', null)
      .order('created_at')
      .range(0, pageSize - 1); // always re-query from the top: filled rows drop out
    if (error) throw error;
    if (!rows || !rows.length) break;

    const batches = [];
    for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));

    let quotaHit = false;
    const counts = await Promise.all(batches.map(b =>
      processBatch(b).catch(err => {
        if (isQuotaError(err)) quotaHit = true;
        else console.warn(`  batch failed: ${err.message}`);
        return 0;
      })
    ));
    const batchWritten = counts.reduce((a, b) => a + b, 0);

    if (quotaHit && batchWritten === 0) {
      console.log();
      console.log(`Gemini quota exhausted. ${written} written this run; ${target - written} still pending.`);
      console.log('This script is idempotent — re-run it once quota resets and it will resume.');
      break;
    }

    written += batchWritten;
    processed += rows.length;
    page++;
    console.log(`page ${page}: ${batchWritten}/${rows.length} written (${written}/${target} total)`);

    // A dry run doesn't change the query result, so it would loop forever.
    if (DRY) break;
    if (batchWritten === 0) {
      console.warn('No rows written this page — stopping to avoid an infinite loop.');
      break;
    }
  }

  console.log(`Done. ${written} modules backfilled.`);
  process.exit(0);
})().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
