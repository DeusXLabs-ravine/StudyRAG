/**
 * Run migrations via Supabase's /pg endpoint (PostgREST raw SQL).
 * Uses fetch to call the database/query REST API with service key.
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

/**
 * Try multiple Supabase SQL execution approaches.
 */
async function trySqlEndpoints(sql) {
  const endpoints = [
    // Approach 1: Supabase SQL API (newer)
    {
      url: `${SUPABASE_URL}/pg/query`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    },
    // Approach 2: PostgREST RPC (if exec_sql exists)
    {
      url: `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ sql_string: sql }),
    },
  ];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep.url, {
        method: 'POST',
        headers: ep.headers,
        body: ep.body,
      });

      if (resp.ok || resp.status === 200 || resp.status === 204) {
        return { ok: true, status: resp.status };
      }

      const text = await resp.text();
      // 404 = endpoint doesn't exist, try next
      if (resp.status === 404) continue;
      // 400 with "already exists" = success (idempotent)
      if (text.includes('already exists')) {
        return { ok: true, status: resp.status, skipped: true };
      }
      return { ok: false, status: resp.status, error: text.slice(0, 300) };
    } catch (err) {
      continue;
    }
  }

  return { ok: false, error: 'No SQL endpoint available' };
}

async function main() {
  console.log('StudyRAG Migration Runner');
  console.log(`Project: ${projectRef}\n`);

  const sqlFile = path.join(__dirname, '001_diagrams_medical_perf.sql');
  const fullSql = fs.readFileSync(sqlFile, 'utf-8');

  // First try running the whole file as one statement
  console.log('Attempting to run full migration as single batch...');
  const batchResult = await trySqlEndpoints(fullSql);

  if (batchResult.ok) {
    console.log('✓ Full migration executed successfully!');
    process.exit(0);
  }

  console.log(`Batch execution failed (${batchResult.error?.slice(0, 100)})`);
  console.log('Falling back to statement-by-statement execution...\n');

  // Split into individual statements
  const statements = fullSql
    .split(';')
    .map(s => {
      // Remove comment-only lines but preserve inline comments
      return s.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
    })
    .filter(s => s.length > 5);

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const desc = stmt.split('\n')[0].trim().slice(0, 70);

    const result = await trySqlEndpoints(stmt);

    if (result.ok) {
      if (result.skipped) {
        skipped++;
        console.log(`  ⊘ [${i + 1}/${statements.length}] ${desc} (exists)`);
      } else {
        success++;
        console.log(`  ✓ [${i + 1}/${statements.length}] ${desc}`);
      }
    } else if (result.error === 'No SQL endpoint available') {
      // No endpoint works — print manual instructions
      console.log(`\n⚠  No SQL execution endpoint available.`);
      console.log(`   Run the migration manually in Supabase SQL Editor:\n`);
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
      console.log(`   File: migrations/001_diagrams_medical_perf.sql`);
      process.exit(0);
    } else {
      const errText = result.error || '';
      if (errText.includes('already exists')) {
        skipped++;
        console.log(`  ⊘ [${i + 1}/${statements.length}] ${desc} (exists)`);
      } else {
        failed++;
        console.error(`  ✗ [${i + 1}/${statements.length}] ${desc}`);
        console.error(`    ${errText.slice(0, 150)}`);
      }
    }
  }

  console.log(`\nDone: ${success} ok, ${skipped} exist, ${failed} failed`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
