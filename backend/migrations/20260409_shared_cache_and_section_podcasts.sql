-- ============================================================
-- Migration: Payments + Shared Research Cache + Section Podcasts
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- All statements are idempotent — safe to re-run.
-- ============================================================

-- ── 1. Subscription columns on profiles ──────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS document_count INTEGER NOT NULL DEFAULT 0;

-- ── 2. Transactions / Payments ────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_reference TEXT NOT NULL UNIQUE,
  transaction_reference TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_method TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ref  ON transactions(payment_reference);

-- ── 3. Shared topic research cache ───────────────────────────

CREATE TABLE IF NOT EXISTS shared_topic_research (
  id TEXT PRIMARY KEY,
  topic_normalised TEXT NOT NULL UNIQUE,
  topic_original TEXT NOT NULL,
  topic_embedding vector(3072),
  text TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  method TEXT,
  domain TEXT,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_topic_norm
  ON shared_topic_research(topic_normalised);

-- NOTE: pgvector ivfflat/HNSW indexes cap at 2000 dims; Gemini embeddings are 3072.
-- Vector index is intentionally skipped — similarity search does a full scan instead.
-- The table stays small (hundreds of rows), so sequential scan is fast enough.

-- ── 4. Document content hash (duplicate-doc detection) ───────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_content_hash
  ON documents(content_hash)
  WHERE content_hash IS NOT NULL;

-- ── 5. Atomic hit-count increment helper ─────────────────────

CREATE OR REPLACE FUNCTION increment(x INTEGER)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
AS $$
  SELECT x + 1;
$$;

-- ── 6. Section podcasts ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS section_podcasts (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_index INTEGER NOT NULL,
  section_heading TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | generating | ready | failed
  transcript TEXT,
  audio_path TEXT,
  duration_secs INTEGER,
  char_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, section_index)
);

CREATE INDEX IF NOT EXISTS idx_section_podcasts_doc
  ON section_podcasts(document_id);
