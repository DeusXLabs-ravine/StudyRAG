/**
 * Run migrations directly via Supabase Management API (SQL endpoint).
 * Uses the service role key to execute DDL statements.
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Extract project ref from URL (e.g., https://abcdef.supabase.co → abcdef)
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

async function executeSql(sql) {
  // Use the Supabase REST SQL endpoint (available with service role key)
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({}),
  });
  return resp;
}

async function runViaSqlApi(sql, label) {
  // The simplest approach: use the /rest/v1/ endpoint with a raw query
  // Actually, Supabase doesn't expose raw SQL via REST. We need to create
  // a temporary RPC function to execute SQL, or run each statement as a query.

  // Alternative: Use the Supabase Management API
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const resp = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  return await resp.json();
}

async function main() {
  console.log('StudyRAG Migration Runner (Direct SQL)');
  console.log(`Project: ${projectRef}`);

  const sqlFile = path.join(__dirname, '001_diagrams_medical_perf.sql');
  const fullSql = fs.readFileSync(sqlFile, 'utf-8');

  // Split into individual statements
  const statements = fullSql
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 10);

  console.log(`\nRunning ${statements.length} statements...\n`);

  let success = 0, skipped = 0, failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split('\n').find(l => l.trim().length > 0) || '';
    const desc = firstLine.trim().slice(0, 70);

    try {
      await runViaSqlApi(stmt, desc);
      success++;
      console.log(`  ✓ [${i + 1}/${statements.length}] ${desc}`);
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skipped++;
        console.log(`  ⊘ [${i + 1}/${statements.length}] ${desc} (already exists)`);
      } else if (msg.includes('401') || msg.includes('403') || msg.includes('not found')) {
        // Management API not available — fall back to printing instructions
        console.log(`\n⚠  Supabase Management API not accessible with service role key.`);
        console.log(`   The service role key can only access the REST/data API, not the management API.\n`);
        console.log(`   Please run the migration manually:\n`);
        console.log(`   1. Go to: ${SUPABASE_URL.replace('.co', '.co')}/project/${projectRef}/sql`);
        console.log(`      Or: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        console.log(`   2. Paste the contents of: migrations/001_diagrams_medical_perf.sql`);
        console.log(`   3. Click "Run"\n`);
        process.exit(0);
      } else {
        failed++;
        console.error(`  ✗ [${i + 1}/${statements.length}] ${desc}`);
        console.error(`    ${msg.slice(0, 200)}`);
      }
    }
  }

  console.log(`\nDone: ${success} succeeded, ${skipped} skipped, ${failed} failed`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
