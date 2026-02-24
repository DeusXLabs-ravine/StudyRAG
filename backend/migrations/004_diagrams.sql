-- ============================================================
-- Migration 004: Document Diagrams
-- Stores detected diagrams from document pages with Mermaid
-- code at multiple teaching levels.
-- ============================================================

CREATE TABLE IF NOT EXISTS document_diagrams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  diagram_type TEXT NOT NULL,       -- flowchart|hierarchy|sequence|mindmap|cycle|comparison|anatomy|circuit|graph|chart|photo|other
  title TEXT,
  description TEXT NOT NULL,
  labels JSONB,                     -- ["Label A", "Label B"]
  mermaid_code JSONB NOT NULL DEFAULT '{}',              -- { "dummy": "...", "beginner": "...", ... }
  simplified_descriptions JSONB NOT NULL DEFAULT '{}',   -- { "dummy": "...", "beginner": "...", ... }
  original_image_path TEXT,         -- path in 'diagram-images' storage bucket
  analysis_json JSONB,              -- full Gemini analysis for reference
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|analyzing|ready|failed
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_diagrams_doc_id ON document_diagrams(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_diagrams_doc_page ON document_diagrams(document_id, page_number);
