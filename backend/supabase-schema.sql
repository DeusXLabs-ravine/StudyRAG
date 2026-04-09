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
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  subscription_end_date TIMESTAMPTZ,
  document_count INTEGER NOT NULL DEFAULT 0,
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

-- ============================================================
-- TRANSACTIONS / PAYMENTS
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(payment_reference);

-- ============================================================
-- LEARNING STYLE & PACE DETECTION
-- ============================================================

-- Learning interactions — tracks user engagement signals for VARK auto-detection
CREATE TABLE IF NOT EXISTS learning_interactions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_type TEXT NOT NULL,     -- diagram|image|chart|text_explanation|reading|notes|example_analogy|video|audio|step_by_step|quiz|practice|interactive
  engagement TEXT NOT NULL DEFAULT 'view',  -- view|click|request|dwell
  user_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_user ON learning_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_type ON learning_interactions(content_type);

-- ============================================================
-- MULTI-SOURCE DOCUMENTS (URL, Notes, Primary Source)
-- ============================================================

-- source_type: 'file' (default) | 'url' | 'note'
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'file';
-- Original URL for url-type documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;
-- Raw text content for note-type documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_content TEXT;
-- User-toggleable flag to mark key/authoritative sources
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_primary_source BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_primary_source ON documents(user_id, is_primary_source) WHERE is_primary_source = TRUE;

-- ============================================================
-- SMART COURSES: Topic Study, Syllabus Detection, Cross-Doc Merging
-- ============================================================

-- Courses: groups of documents forming a unified learning experience
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'syllabus' | 'topic'
  syllabus_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing',   -- 'processing' | 'ready' | 'failed'
  error_message TEXT,
  user_id UUID,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction: which documents belong to which course
CREATE TABLE IF NOT EXISTS course_documents (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'source', -- 'syllabus' | 'source' | 'reference' | 'practice'
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_course_docs_course ON course_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_course_docs_doc ON course_documents(document_id);

-- Modules can optionally belong to a course (for unified cross-doc modules)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS source_documents JSONB;
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);

-- Documents can have a subtype for content intelligence
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_subtype TEXT;
-- Values: 'syllabus' | 'textbook' | 'lecture_notes' | 'problem_set' | 'exam' | 'reference_doc' | null

-- ============================================================
-- GENERATED DIAGRAMS (on-demand Mermaid/D2/AI-image per module)
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_diagrams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  diagram_type TEXT NOT NULL,           -- 'mermaid' | 'd2' | 'image'
  title TEXT,
  description TEXT,
  teaching_level TEXT NOT NULL DEFAULT 'intermediate',
  diagram_code TEXT,                    -- Mermaid or D2 source code
  rendered_svg TEXT,                    -- Pre-rendered SVG (D2)
  image_storage_path TEXT,              -- Supabase Storage path (AI images)
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

-- ============================================================
-- PERFORMANCE INDEXES FOR 5K CONCURRENT STUDENTS
-- ============================================================

-- User-scoped queries (most frequent at scale)
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_doc_order ON modules(document_id, order_index);
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

-- NOTE: pgvector vector indexes (HNSW, IVFFlat) have a 2000-dim limit.
-- gemini-embedding-001 produces 3072-dim vectors, so vector indexing is skipped.
-- Sequential scan still works; embedding cache compensates at scale.

-- ============================================================
-- MEDICAL RESOURCES (PubMed, ICD-10, WikiDoc, Open Textbooks)
-- ============================================================

CREATE TABLE IF NOT EXISTS medical_resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  source_type TEXT NOT NULL,              -- 'pubmed' | 'icd10' | 'wikidoc' | 'msd_manual' | 'open_textbook' | 'med_dataset'
  title TEXT NOT NULL,
  url TEXT,
  snippet TEXT,
  extra_data JSONB DEFAULT '{}',          -- source-specific data (PMID, ICD code, authors, etc.)
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_resources_doc ON medical_resources(document_id);
CREATE INDEX IF NOT EXISTS idx_med_resources_module ON medical_resources(module_id);
CREATE INDEX IF NOT EXISTS idx_med_resources_source ON medical_resources(source_type);

-- ============================================================
-- GAMIFICATION: XP, Streaks, Achievements, Game Stats
-- ============================================================

-- XP event ledger
CREATE TABLE IF NOT EXISTS user_xp (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_xp_user ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_created ON user_xp(user_id, created_at DESC);

-- Daily streak tracker
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_freezes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Multi-tier achievement badges
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,
  tier INTEGER DEFAULT 1,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key, tier)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Aggregate game stats + daily progress
CREATE TABLE IF NOT EXISTS user_game_stats (
  user_id UUID PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  best_combo INTEGER DEFAULT 0,
  daily_xp_goal INTEGER DEFAULT 20,
  daily_xp_earned INTEGER DEFAULT 0,
  daily_xp_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SHARED RESEARCH CACHE
-- ============================================================

-- 1. Shared topic research results (cross-user cache)
--    Stores the full curriculum text generated for a topic so any user
--    researching the same topic (exact or semantically similar) skips
--    the expensive AI pipeline and gets the cached result instantly.
CREATE TABLE IF NOT EXISTS shared_topic_research (
  id TEXT PRIMARY KEY,
  topic_normalised TEXT NOT NULL UNIQUE,      -- normalised for exact match
  topic_original TEXT NOT NULL,               -- original casing/punctuation
  topic_embedding vector(3072),               -- for cosine similarity lookup
  text TEXT NOT NULL,                         -- full curriculum markdown
  sources JSONB NOT NULL DEFAULT '[]',        -- verified source URLs
  method TEXT,                                -- deep-research|doc-grounded|search-grounded|…
  domain TEXT,                                -- medical|mathematics|law|…
  hit_count INTEGER NOT NULL DEFAULT 0,       -- how many times this was served from cache
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_topic_norm ON shared_topic_research(topic_normalised);
-- NOTE: pgvector ivfflat/HNSW indexes cap at 2000 dims; Gemini embeddings are 3072-dim.
-- Vector index skipped — similarity search uses a full scan (table stays small).

-- 2. Content hash on documents — enables duplicate-doc detection across users
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash)
  WHERE content_hash IS NOT NULL;

-- Helper: atomic integer increment used by hit_count updates
CREATE OR REPLACE FUNCTION increment(x INTEGER)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
AS $$
  SELECT x + 1;
$$;

-- ============================================================
-- SECTION PODCASTS
-- ============================================================

-- Stores auto-generated section-level podcast episodes.
-- One row per document section (derived from page index tree structure).
-- Audio WAV files are stored in Supabase Storage under podcasts/{doc_id}/{section_index}.wav
-- and audio_path holds only the storage path (signed URLs are generated on-demand).
CREATE TABLE IF NOT EXISTS section_podcasts (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_index INTEGER NOT NULL,
  section_heading TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | generating | ready | failed
  transcript TEXT,
  audio_path TEXT,          -- Supabase Storage path, not a full URL
  duration_secs INTEGER,
  char_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, section_index)
);
CREATE INDEX IF NOT EXISTS idx_section_podcasts_doc ON section_podcasts(document_id);
