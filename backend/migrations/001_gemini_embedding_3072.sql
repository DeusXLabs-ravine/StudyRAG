-- ============================================================
-- Migration: Switch to gemini-embedding-001 (3072 dimensions)
-- Date: 2026-02-16
-- ============================================================
-- This migration updates the vector storage from 768-dim (text-embedding-004)
-- to 3072-dim (gemini-embedding-001). Existing chunks must be deleted
-- because the old embeddings are incompatible with the new model.
--
-- After running this migration, reprocess all existing documents
-- so their chunks get re-embedded with the new model.
-- ============================================================

-- 1. Delete all existing chunks (old 768-dim embeddings are incompatible)
DELETE FROM chunks;

-- 2. Alter the embedding column from vector(768) to vector(3072)
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector (3072);

-- 3. Recreate the similarity search function with the new dimension
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(3072),
  match_count INT DEFAULT 5,
  filter_doc_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  doc_id TEXT,
  text TEXT,
  heading TEXT,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.doc_id,
    c.text,
    c.heading,
    1 - (c.embedding <=> query_embedding) AS score
  FROM chunks c
  WHERE (filter_doc_id IS NULL OR c.doc_id = filter_doc_id)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Reset all documents to 'processing' so they get reprocessed
--    (Optional: uncomment if you want automatic reprocessing triggers)
-- UPDATE documents SET status = 'processing', chunk_count = 0 WHERE status = 'ready';