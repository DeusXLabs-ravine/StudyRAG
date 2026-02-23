-- ============================================================
-- StudyRAG - Supabase PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension for embedding storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLES
-- ============================================================

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  cloudinary_public_id TEXT,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  upload_date TIMESTAMPTZ NOT NULL,
  processed_date TIMESTAMPTZ,
  chunk_count INTEGER DEFAULT 0,
  extracted_metadata JSONB
);

-- Chunks with pgvector embeddings (3072-dim for gemini-embedding-001)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  heading TEXT,
  embedding vector(3072) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);

-- Modules (learning units generated from documents)
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  topic TEXT,
  objectives JSONB NOT NULL,
  content TEXT NOT NULL,
  takeaways JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_modules_doc_id ON modules(document_id);

-- Questions (comprehension checks within modules)
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB,
  correct TEXT NOT NULL,
  explanation TEXT,
  topic TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_module_id ON questions(module_id);

-- Module Progress
CREATE TABLE IF NOT EXISTS module_progress (
  module_id TEXT PRIMARY KEY REFERENCES modules(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  best_score INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ
);

-- Quiz Sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  num_questions INTEGER NOT NULL,
  questions_json JSONB NOT NULL,
  is_exam BOOLEAN NOT NULL DEFAULT FALSE,
  time_limit_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz Results
CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  quiz_session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  results_json JSONB NOT NULL,
  time_spent_seconds INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flashcard Decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flashcard Cards (with spaced repetition fields)
CREATE TABLE IF NOT EXISTS flashcard_cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TIMESTAMPTZ,
  last_reviewed TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON flashcard_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON flashcard_cards(next_review_date);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources_json JSONB,
  document_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Topic Performance
CREATE TABLE IF NOT EXISTS topic_performance (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic TEXT NOT NULL,
  source_mode TEXT NOT NULL,
  source_id TEXT NOT NULL,
  score REAL NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_topic_perf_topic ON topic_performance(topic);
CREATE INDEX IF NOT EXISTS idx_topic_perf_mode ON topic_performance(source_mode);

-- Study Sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mode TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  details_json JSONB
);

-- User Settings (key-value store)
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aptitude Results
CREATE TABLE IF NOT EXISTS aptitude_results (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject TEXT,
  knowledge_level TEXT NOT NULL,
  learning_pace TEXT NOT NULL,
  score INTEGER NOT NULL,
  details_json JSONB,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- 1. pgvector similarity search for RAG
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

-- 2. Upsert module progress with MAX logic
CREATE OR REPLACE FUNCTION upsert_module_progress(
  p_module_id TEXT,
  p_completed BOOLEAN,
  p_best_score INTEGER,
  p_attempts INTEGER,
  p_last_attempt TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO module_progress (module_id, completed, best_score, attempts, last_attempt)
  VALUES (p_module_id, p_completed, p_best_score, p_attempts, p_last_attempt)
  ON CONFLICT(module_id) DO UPDATE SET
    completed = GREATEST(module_progress.completed::int, p_completed::int)::boolean,
    best_score = GREATEST(COALESCE(module_progress.best_score, 0), p_best_score),
    attempts = module_progress.attempts + 1,
    last_attempt = p_last_attempt;
END;
$$;

-- 3. Upsert user setting
CREATE OR REPLACE FUNCTION upsert_user_setting(
  p_key TEXT,
  p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT(key) DO UPDATE SET value = p_value, updated_at = now();
END;
$$;

-- 4. Get weak topics (GROUP BY / HAVING)
CREATE OR REPLACE FUNCTION get_weak_topics(
  threshold FLOAT DEFAULT 0.6,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (topic TEXT, avg_score FLOAT, attempts BIGINT)
LANGUAGE sql
AS $$
  SELECT tp.topic, AVG(tp.score)::float AS avg_score, COUNT(*) AS attempts
  FROM topic_performance tp
  GROUP BY tp.topic
  HAVING AVG(tp.score) < threshold
  ORDER BY AVG(tp.score) ASC
  LIMIT result_limit;
$$;

-- 5. Get topic mastery (all topics with performance stats)
CREATE OR REPLACE FUNCTION get_topic_mastery()
RETURNS TABLE (
  topic TEXT,
  avg_score FLOAT,
  attempts BIGINT,
  last_attempt TIMESTAMPTZ,
  min_score FLOAT,
  max_score FLOAT
)
LANGUAGE sql
AS $$
  SELECT
    tp.topic,
    AVG(tp.score)::float,
    COUNT(*),
    MAX(tp.recorded_at),
    MIN(tp.score)::float,
    MAX(tp.score)::float
  FROM topic_performance tp
  GROUP BY tp.topic
  ORDER BY AVG(tp.score) ASC;
$$;

-- 6. Get overall mastery
CREATE OR REPLACE FUNCTION get_overall_mastery()
RETURNS TABLE (avg_score FLOAT, topic_count BIGINT, total_attempts BIGINT)
LANGUAGE sql
AS $$
  SELECT
    AVG(score)::float,
    COUNT(DISTINCT topic),
    COUNT(*)
  FROM topic_performance;
$$;

-- 7. Get distinct study dates for streak calculation
CREATE OR REPLACE FUNCTION get_study_dates()
RETURNS TABLE (study_date DATE)
LANGUAGE sql
AS $$
  SELECT DISTINCT DATE(started_at) AS study_date
  FROM study_sessions
  ORDER BY study_date DESC;
$$;

-- 8. Get quiz score trend
CREATE OR REPLACE FUNCTION get_quiz_score_trend(result_limit INT DEFAULT 20)
RETURNS TABLE (
  score INTEGER,
  correct_count INTEGER,
  total_count INTEGER,
  submitted_at TIMESTAMPTZ,
  difficulty TEXT,
  is_exam BOOLEAN
)
LANGUAGE sql
AS $$
  SELECT
    qr.score,
    qr.correct_count,
    qr.total_count,
    qr.submitted_at,
    qs.difficulty,
    qs.is_exam
  FROM quiz_results qr
  JOIN quiz_sessions qs ON qs.id = qr.quiz_session_id
  ORDER BY qr.submitted_at DESC
  LIMIT result_limit;
$$;

-- 9. Get activity timeline
CREATE OR REPLACE FUNCTION get_activity_timeline(p_days INT DEFAULT 30)
RETURNS TABLE (date DATE, mode TEXT, count BIGINT)
LANGUAGE sql
AS $$
  SELECT
    DATE(started_at) AS date,
    ss.mode,
    COUNT(*)
  FROM study_sessions ss
  WHERE started_at >= now() - (p_days || ' days')::interval
  GROUP BY DATE(started_at), ss.mode
  ORDER BY DATE(started_at) ASC;
$$;

-- 10. Get flashcard stats
CREATE OR REPLACE FUNCTION get_flashcard_stats()
RETURNS TABLE (
  total BIGINT,
  new_count BIGINT,
  learning_count BIGINT,
  mastered_count BIGINT,
  due_count BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    COUNT(*),
    SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END),
    SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END),
    SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END),
    SUM(CASE WHEN next_review_date IS NOT NULL AND next_review_date <= now() THEN 1 ELSE 0 END)
  FROM flashcard_cards;
$$;

-- 11. Get due flashcard count (for recommendations)
CREATE OR REPLACE FUNCTION get_due_flashcard_count()
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT COUNT(*)::integer FROM flashcard_cards
  WHERE next_review_date IS NOT NULL AND next_review_date <= now();
$$;

-- 12. Get first incomplete module (for recommendations)
CREATE OR REPLACE FUNCTION get_first_incomplete_module()
RETURNS TABLE (id TEXT, title TEXT)
LANGUAGE sql
AS $$
  SELECT m.id, m.title FROM modules m
  LEFT JOIN module_progress mp ON mp.module_id = m.id
  WHERE mp.completed IS NULL OR mp.completed = false
  ORDER BY m.order_index
  LIMIT 1;
$$;

-- 13. Get study queue for flashcard deck (complex CASE ordering)
CREATE OR REPLACE FUNCTION get_study_queue(p_deck_id TEXT)
RETURNS SETOF flashcard_cards
LANGUAGE sql
AS $$
  SELECT * FROM flashcard_cards
  WHERE deck_id = p_deck_id
  ORDER BY
    CASE
      WHEN next_review_date IS NOT NULL AND next_review_date <= now() THEN 0
      WHEN status = 'new' THEN 1
      WHEN status = 'learning' THEN 2
      ELSE 3
    END,
    next_review_date ASC;
$$;

-- 14. Get due count for a specific deck
CREATE OR REPLACE FUNCTION get_due_count(p_deck_id TEXT)
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT COUNT(*)::integer FROM flashcard_cards
  WHERE deck_id = p_deck_id AND (
    (next_review_date IS NOT NULL AND next_review_date <= now())
    OR status = 'new'
  );
$$;

-- 15. Get quiz history with session details (JOIN query)
CREATE OR REPLACE FUNCTION get_quiz_history()
RETURNS TABLE (
  id TEXT,
  quiz_session_id TEXT,
  score INTEGER,
  correct_count INTEGER,
  total_count INTEGER,
  results_json JSONB,
  time_spent_seconds INTEGER,
  submitted_at TIMESTAMPTZ,
  difficulty TEXT,
  document_id TEXT,
  is_exam BOOLEAN
)
LANGUAGE sql
AS $$
  SELECT
    qr.id,
    qr.quiz_session_id,
    qr.score,
    qr.correct_count,
    qr.total_count,
    qr.results_json,
    qr.time_spent_seconds,
    qr.submitted_at,
    qs.difficulty,
    qs.document_id,
    qs.is_exam
  FROM quiz_results qr
  JOIN quiz_sessions qs ON qs.id = qr.quiz_session_id
  ORDER BY qr.submitted_at DESC;
$$;

-- ============================================================
-- PAGE INDEX (vectorless, reasoning-based RAG)
-- ============================================================

-- Hierarchical tree index per document (PageIndex approach)
CREATE TABLE IF NOT EXISTS page_index (
  doc_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  tree_json JSONB NOT NULL,
  page_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual page texts for retrieval
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

-- ============================================================
-- ADDITIONAL TABLES: Web Research & Solver
-- ============================================================

-- Web Research Resources (discovered via Google Search grounding on upload)
CREATE TABLE IF NOT EXISTS document_resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  snippet TEXT,
  topic TEXT,
  resource_type TEXT NOT NULL DEFAULT 'article',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_resources_doc_id ON document_resources(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_resources_topic ON document_resources(topic);

-- STEM Solver Sessions
CREATE TABLE IF NOT EXISTS solver_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  problem TEXT NOT NULL,
  subject TEXT,
  solution TEXT NOT NULL,
  steps_json JSONB,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  sources_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solver_sessions_doc_id ON solver_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_solver_sessions_created ON solver_sessions(created_at DESC);

-- ============================================================
-- MIGRATIONS (safe to re-run)
-- ============================================================

-- Add Cloudinary support to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

-- ============================================================
-- EXAM PREP MODE
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

-- ============================================================
-- DIAGRAM DETECTION & ANALYSIS
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

-- ============================================================
-- USER ACCOUNTS & PROFILES
-- ============================================================

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

-- user_id columns on all user-scoped tables (nullable for migration)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE topic_performance ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE aptitude_results ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE solver_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE exam_prep_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE module_progress ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
