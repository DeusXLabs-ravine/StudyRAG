-- ============================================================
-- Migration: Diagram Generation + Medical Resources + Performance
-- All statements are idempotent (safe to re-run)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. PREREQUISITE TABLES (may not exist on older deployments)
-- ────────────────────────────────────────────────────────────

-- Learning interactions (VARK auto-detection signals)
CREATE TABLE IF NOT EXISTS learning_interactions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_type TEXT NOT NULL,
  engagement TEXT NOT NULL DEFAULT 'view',
  user_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_user ON learning_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_type ON learning_interactions(content_type);

-- Courses (cross-document learning)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  syllabus_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  user_id UUID,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_documents (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'source',
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_course_docs_course ON course_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_course_docs_doc ON course_documents(document_id);

-- Profiles (user accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  age INTEGER,
  teaching_level TEXT NOT NULL DEFAULT 'intermediate',
  interests TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Diagram detection tables
CREATE TABLE IF NOT EXISTS document_diagrams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  diagram_type TEXT NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  labels JSONB,
  mermaid_code JSONB NOT NULL DEFAULT '{}',
  simplified_descriptions JSONB NOT NULL DEFAULT '{}',
  original_image_path TEXT,
  analysis_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_diagrams_doc_id ON document_diagrams(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_diagrams_doc_page ON document_diagrams(document_id, page_number);

-- Ensure user_id columns exist on all user-scoped tables
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE topic_performance ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE aptitude_results ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE solver_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE module_progress ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID;

-- Modules: optional course linkage
ALTER TABLE modules ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS source_documents JSONB;

-- Documents: multi-source support
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'file';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_content TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_primary_source BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_subtype TEXT;

-- ────────────────────────────────────────────────────────────
-- 1. GENERATED DIAGRAMS (on-demand Mermaid/D2/AI-image per module)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generated_diagrams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  diagram_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  teaching_level TEXT NOT NULL DEFAULT 'intermediate',
  diagram_code TEXT,
  rendered_svg TEXT,
  image_storage_path TEXT,
  image_prompt TEXT,
  interests_used TEXT[],
  generation_model TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_diagrams_module ON generated_diagrams(module_id);
CREATE INDEX IF NOT EXISTS idx_gen_diagrams_doc ON generated_diagrams(document_id);

-- Link existing document_diagrams to modules
ALTER TABLE document_diagrams ADD COLUMN IF NOT EXISTS module_id TEXT REFERENCES modules(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 2. MEDICAL RESOURCES (PubMed, ICD-10, WikiDoc, Open Textbooks)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medical_resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  snippet TEXT,
  extra_data JSONB DEFAULT '{}',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_resources_doc ON medical_resources(document_id);
CREATE INDEX IF NOT EXISTS idx_med_resources_module ON medical_resources(module_id);
CREATE INDEX IF NOT EXISTS idx_med_resources_source ON medical_resources(source_type);

-- ────────────────────────────────────────────────────────────
-- 3. PERFORMANCE INDEXES FOR 5K CONCURRENT STUDENTS
-- ────────────────────────────────────────────────────────────

-- User-scoped queries (most frequent at scale)
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_doc_order ON modules(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_perf_user ON topic_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_solver_sessions_user ON solver_sessions(user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_topic_perf_user_topic ON topic_performance(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_user_recent ON learning_interactions(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_completed ON module_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_documents_primary_source ON documents(user_id, is_primary_source) WHERE is_primary_source = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);

-- NOTE: pgvector vector indexes (HNSW, IVFFlat) have a 2000-dim limit on this
-- Supabase instance. gemini-embedding-001 produces 3072-dim vectors, so vector
-- indexing is skipped. Sequential scan still works; the embedding cache and
-- query-level caching compensate for the lack of a vector index at scale.
