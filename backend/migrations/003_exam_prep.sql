-- ============================================================
-- Migration 003: Exam Prep Mode
-- Adds exam_prep_sessions, exam_prep_materials tables
-- Alters quiz_sessions to link to exam prep
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_prep_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'configuring',  -- configuring|generating|ready|failed
  document_ids TEXT[] NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  analysis_json JSONB,
  study_guide_json JSONB,
  revision_questions_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_prep_materials (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES exam_prep_sessions(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL,    -- past_exam|current_test|assignment
  source_type TEXT NOT NULL DEFAULT 'file',
  original_name TEXT,
  extracted_text TEXT,
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_prep_materials_session ON exam_prep_materials(session_id);

ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS exam_prep_session_id TEXT
  REFERENCES exam_prep_sessions(id) ON DELETE SET NULL;
