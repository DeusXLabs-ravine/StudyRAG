-- ============================================================
-- Migration 002: Add PageIndex tables (vectorless, reasoning-based RAG)
-- Safe to re-run (uses IF NOT EXISTS)
-- ============================================================

-- Store the hierarchical tree index per document
CREATE TABLE IF NOT EXISTS page_index (
  doc_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  tree_json JSONB NOT NULL,
  page_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store individual page texts for retrieval
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  heading TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pages_doc_id ON pages(doc_id);
CREATE INDEX IF NOT EXISTS idx_pages_doc_page ON pages(doc_id, page_number);
