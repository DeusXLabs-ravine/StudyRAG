/**
 * Run SQL migrations against Supabase via the JS client's rpc or raw SQL.
 * Usage: node migrations/run.js
 */
const fs = require('fs');
const path = require('path');

// Load env before anything else
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  console.log(`\n── Running migration: ${fileName} ──`);

  // Split by semicolons, filter empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`  Found ${statements.length} statements`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // Extract a short description from the statement
    const firstLine = stmt.split('\n').find(l => !l.trim().startsWith('--') && l.trim().length > 0) || '';
    const desc = firstLine.trim().slice(0, 80);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_string: stmt });
      if (error) {
        // Try alternative: use the REST API directly
        // Supabase doesn't have exec_sql by default, so we'll use the management API
        throw error;
      }
      success++;
      console.log(`  ✓ [${i + 1}/${statements.length}] ${desc}`);
    } catch (err) {
      // For "already exists" errors, count as skipped
      const msg = err?.message || err?.details || String(err);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skipped++;
        console.log(`  ⊘ [${i + 1}/${statements.length}] ${desc} (already exists)`);
      } else {
        failed++;
        console.error(`  ✗ [${i + 1}/${statements.length}] ${desc}`);
        console.error(`    Error: ${msg}`);
      }
    }
  }

  console.log(`\n  Results: ${success} succeeded, ${skipped} skipped, ${failed} failed`);
  return { success, skipped, failed };
}

async function main() {
  console.log('StudyRAG Migration Runner');
  console.log(`Supabase: ${supabaseUrl.slice(0, 40)}...`);

  // First, check if we can run raw SQL via an RPC function
  // If not, we'll need to run statements one by one via the Supabase SQL Editor approach
  console.log('\nChecking exec_sql RPC availability...');
  const { error: rpcCheck } = await supabase.rpc('exec_sql', { sql_string: 'SELECT 1' });

  if (rpcCheck) {
    console.log('exec_sql RPC not available. Running statements individually via REST...\n');
    console.log('⚠  The Supabase JS client cannot execute raw DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX).');
    console.log('   You need to run the migration SQL in the Supabase SQL Editor.\n');
    console.log('   Option 1: Copy the SQL from migrations/001_diagrams_medical_perf.sql');
    console.log('             and paste it into: Dashboard → SQL Editor → New Query → Run\n');
    console.log('   Option 2: Use the Supabase CLI:');
    console.log('             supabase db push --db-url "your-db-url"\n');

    // Print the SQL for easy copy-paste
    const sqlFile = path.join(__dirname, '001_diagrams_medical_perf.sql');
    console.log('── Migration SQL (copy this into Supabase SQL Editor) ──\n');
    console.log(fs.readFileSync(sqlFile, 'utf-8'));

    process.exit(0);
  }

  // If exec_sql works, run migrations
  const migrationFile = path.join(__dirname, '001_diagrams_medical_perf.sql');
  await runMigration(migrationFile);
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
