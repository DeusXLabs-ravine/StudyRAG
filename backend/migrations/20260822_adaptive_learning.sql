-- ============================================================
-- Adaptive Learning: dynamic course regeneration
-- ============================================================
-- Purpose: let a course rewrite itself for the individual learner.
-- Failing a comprehension check, redoing a module, or repeatedly stalling
-- causes the affected module to be regenerated with the student's specific
-- misconceptions, pace, and preferred analogies — instead of serving the same
-- explanation that already failed them once.
--
-- STRICTLY ADDITIVE. Every statement is IF NOT EXISTS / ADD COLUMN IF NOT
-- EXISTS. No table, column, or row is dropped or rewritten, so applying this to
-- the live project cannot destroy existing data.
-- ============================================================

-- ── modules: pedagogy + versioning metadata ─────────────────
ALTER TABLE modules ADD COLUMN IF NOT EXISTS outcome TEXT;            -- "You will be able to ..."
ALTER TABLE modules ADD COLUMN IF NOT EXISTS bloom_level TEXT;         -- remember|understand|apply|analyse|evaluate|create
ALTER TABLE modules ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS regen_reason TEXT;        -- why the current version was (re)generated
ALTER TABLE modules ADD COLUMN IF NOT EXISTS regenerated_at TIMESTAMPTZ;

-- ── questions: the misconception each distractor encodes ─────
-- Lets a wrong answer name the specific false belief the student holds, which
-- becomes the input to a targeted rewrite.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS misconception TEXT;

-- ── module_versions: archive of superseded module content ───
-- Every regeneration snapshots the outgoing version here, so a rewrite is
-- reversible and the UI can show "rewritten for you" with the prior text.
CREATE TABLE IF NOT EXISTS module_versions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT,
  topic TEXT,
  outcome TEXT,
  bloom_level TEXT,
  objectives JSONB,
  content TEXT,
  takeaways JSONB,
  questions JSONB,            -- snapshot of the question rows at archive time
  reason TEXT,                -- human-readable reason for the change
  trigger_type TEXT,          -- failed_comprehension | manual_redo | tutor_confusion | manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_module_versions_module ON module_versions(module_id);

-- ── learning_records: ADR-style, decision-grade insights ────
-- The durable memory that steers what to teach next. Not a click log: each row
-- is a non-obvious fact about this learner (a corrected misconception, a
-- demonstrated mastery, disclosed prior knowledge) that changes future content.
-- Supersession keeps the history of how understanding evolved.
CREATE TABLE IF NOT EXISTS learning_records (
  id TEXT PRIMARY KEY,
  user_id UUID,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  topic TEXT,
  record_type TEXT NOT NULL,      -- misconception | struggle | mastery | prior_knowledge | preference | pace_change
  content TEXT NOT NULL,          -- the insight, in plain language
  evidence JSONB,                 -- how it was demonstrated (wrong answers, score, message)
  status TEXT NOT NULL DEFAULT 'active',   -- active | superseded | resolved
  superseded_by TEXT,             -- id of the record that replaced this one
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_doc ON learning_records(document_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_active ON learning_records(user_id, status);

-- ── module_regenerations: rate-limit + audit ────────────────
-- One row per regeneration attempt. Backs the "don't rewrite the same module
-- twice in five minutes" guard and gives an auditable trail of what changed and why.
CREATE TABLE IF NOT EXISTS module_regenerations (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID,
  trigger_type TEXT NOT NULL,     -- failed_comprehension | manual_redo | tutor_confusion | manual
  reason TEXT,
  from_version INTEGER,
  to_version INTEGER,
  score INTEGER,                  -- the score that triggered it, when relevant
  status TEXT NOT NULL DEFAULT 'started',  -- started | completed | failed | skipped
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_module_regens_module ON module_regenerations(module_id, created_at DESC);
