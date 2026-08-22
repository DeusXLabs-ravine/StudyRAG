-- ============================================================
-- Progressive course generation (skeleton-first)
-- ============================================================
-- Modules are now inserted UP FRONT from the outline as "pending" skeletons,
-- giving the student the full course map in ~15s, and each generation batch
-- then UPDATEs its own rows with real content.
--
-- This also eliminates the order_index collision problem that previously made
-- per-batch insert too risky: rows are inserted once, in order, and afterwards
-- only updated — so there are no concurrent inserts to collide.
--
-- STRICTLY ADDITIVE. Every statement is ADD COLUMN IF NOT EXISTS / CREATE INDEX
-- IF NOT EXISTS. No table, column or row is dropped or rewritten, so applying
-- this to the live project cannot destroy existing data.
-- ============================================================

-- Fill state for a module's content.
--   pending  — skeleton exists (title/topic/objectives from the outline), no content yet
--   writing  — a generation worker has claimed this row (claimed atomically by
--              UPDATE ... WHERE content_status = 'pending', so two workers can
--              never write the same module)
--   ready    — content generated
--   failed   — generation failed or the claiming worker died; retryable
-- Deliberately no CHECK constraint: statuses are owned by the application, and a
-- constraint here would turn adding one into a migration.
-- Existing rows default to 'ready', which is correct: they already have content.
ALTER TABLE modules ADD COLUMN IF NOT EXISTS content_status TEXT NOT NULL DEFAULT 'ready';

-- Set when a pending module is promoted to the front of the fill queue because
-- the student actually opened it. Demand becomes the scheduling signal.
ALTER TABLE modules ADD COLUMN IF NOT EXISTS prioritized_at TIMESTAMPTZ;

-- When generation of this module's content began. Used to time out skeletons
-- that were orphaned by a dead batch and flip them to 'failed' for retry.
ALTER TABLE modules ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ;

-- Marks the orientation module (order_index 0). Kept as an explicit flag rather
-- than relying on order_index alone, so the "regenerate Module 0 once the course
-- is finished" pass can find it unambiguously.
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_intro BOOLEAN NOT NULL DEFAULT FALSE;

-- Fill-queue lookups: "pending modules for this document, prioritized first".
CREATE INDEX IF NOT EXISTS idx_modules_fill_queue
  ON modules(document_id, content_status, prioritized_at DESC NULLS LAST, order_index);
