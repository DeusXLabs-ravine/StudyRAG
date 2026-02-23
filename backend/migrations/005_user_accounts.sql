-- ============================================================
-- Migration 005: User Accounts & Per-User Data Isolation
-- ============================================================

-- Profiles table (id matches Supabase Auth user.id)
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

-- Add user_id to all user-scoped tables (nullable for backward compat)
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

-- user_settings: add user_id and change PK to composite
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id, key);

-- Indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_perf_user_id ON topic_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_solver_sessions_user_id ON solver_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_prep_sessions_user_id ON exam_prep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_id ON module_progress(user_id);

-- ============================================================
-- Updated RPC functions to accept p_user_id
-- ============================================================

-- Upsert user setting (now keyed by user_id + key)
CREATE OR REPLACE FUNCTION upsert_user_setting(
  p_key TEXT,
  p_value TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_settings (user_id, key, value, updated_at)
  VALUES (p_user_id, p_key, p_value, now())
  ON CONFLICT(user_id, key) DO UPDATE SET value = p_value, updated_at = now();
END;
$$;

-- Upsert module progress (now with user_id)
CREATE OR REPLACE FUNCTION upsert_module_progress(
  p_module_id TEXT,
  p_completed BOOLEAN,
  p_best_score INTEGER,
  p_attempts INTEGER DEFAULT 1,
  p_last_attempt TIMESTAMPTZ DEFAULT now(),
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO module_progress (module_id, completed, best_score, attempts, last_attempt, user_id)
  VALUES (p_module_id, p_completed, p_best_score, p_attempts, p_last_attempt, p_user_id)
  ON CONFLICT(module_id) DO UPDATE SET
    completed = GREATEST(module_progress.completed::int, p_completed::int)::boolean,
    best_score = GREATEST(COALESCE(module_progress.best_score, 0), p_best_score),
    attempts = module_progress.attempts + 1,
    last_attempt = p_last_attempt;
END;
$$;

-- Weak topics filtered by user_id
CREATE OR REPLACE FUNCTION get_weak_topics(
  threshold FLOAT DEFAULT 0.6,
  result_limit INT DEFAULT 10,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (topic TEXT, avg_score FLOAT, attempts BIGINT)
LANGUAGE sql
AS $$
  SELECT tp.topic, AVG(tp.score)::float AS avg_score, COUNT(*) AS attempts
  FROM topic_performance tp
  WHERE (p_user_id IS NULL OR tp.user_id = p_user_id)
  GROUP BY tp.topic
  HAVING AVG(tp.score) < threshold
  ORDER BY AVG(tp.score) ASC
  LIMIT result_limit;
$$;

-- Topic mastery filtered by user_id
CREATE OR REPLACE FUNCTION get_topic_mastery(p_user_id UUID DEFAULT NULL)
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
  WHERE (p_user_id IS NULL OR tp.user_id = p_user_id)
  GROUP BY tp.topic
  ORDER BY AVG(tp.score) ASC;
$$;

-- Overall mastery filtered by user_id
CREATE OR REPLACE FUNCTION get_overall_mastery(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (avg_score FLOAT, topic_count BIGINT, total_attempts BIGINT)
LANGUAGE sql
AS $$
  SELECT
    AVG(score)::float,
    COUNT(DISTINCT topic),
    COUNT(*)
  FROM topic_performance
  WHERE (p_user_id IS NULL OR user_id = p_user_id);
$$;

-- Study dates filtered by user_id
CREATE OR REPLACE FUNCTION get_study_dates(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (study_date DATE)
LANGUAGE sql
AS $$
  SELECT DISTINCT DATE(started_at) AS study_date
  FROM study_sessions
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
  ORDER BY study_date DESC;
$$;

-- Quiz score trend filtered by user_id
CREATE OR REPLACE FUNCTION get_quiz_score_trend(
  result_limit INT DEFAULT 20,
  p_user_id UUID DEFAULT NULL
)
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
  WHERE (p_user_id IS NULL OR qs.user_id = p_user_id)
  ORDER BY qr.submitted_at DESC
  LIMIT result_limit;
$$;

-- Activity timeline filtered by user_id
CREATE OR REPLACE FUNCTION get_activity_timeline(
  p_days INT DEFAULT 30,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (date DATE, mode TEXT, count BIGINT)
LANGUAGE sql
AS $$
  SELECT
    DATE(started_at) AS date,
    ss.mode,
    COUNT(*)
  FROM study_sessions ss
  WHERE started_at >= now() - (p_days || ' days')::interval
    AND (p_user_id IS NULL OR ss.user_id = p_user_id)
  GROUP BY DATE(started_at), ss.mode
  ORDER BY DATE(started_at) ASC;
$$;

-- Flashcard stats filtered by user_id (via deck ownership)
CREATE OR REPLACE FUNCTION get_flashcard_stats(p_user_id UUID DEFAULT NULL)
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
    SUM(CASE WHEN fc.status = 'new' THEN 1 ELSE 0 END),
    SUM(CASE WHEN fc.status = 'learning' THEN 1 ELSE 0 END),
    SUM(CASE WHEN fc.status = 'mastered' THEN 1 ELSE 0 END),
    SUM(CASE WHEN fc.next_review_date IS NOT NULL AND fc.next_review_date <= now() THEN 1 ELSE 0 END)
  FROM flashcard_cards fc
  JOIN flashcard_decks fd ON fd.id = fc.deck_id
  WHERE (p_user_id IS NULL OR fd.user_id = p_user_id);
$$;

-- Due flashcard count filtered by user_id
CREATE OR REPLACE FUNCTION get_due_flashcard_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT COUNT(*)::integer FROM flashcard_cards fc
  JOIN flashcard_decks fd ON fd.id = fc.deck_id
  WHERE fc.next_review_date IS NOT NULL AND fc.next_review_date <= now()
    AND (p_user_id IS NULL OR fd.user_id = p_user_id);
$$;

-- First incomplete module filtered by user_id
CREATE OR REPLACE FUNCTION get_first_incomplete_module(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (id TEXT, title TEXT)
LANGUAGE sql
AS $$
  SELECT m.id, m.title FROM modules m
  JOIN documents d ON d.id = m.document_id
  LEFT JOIN module_progress mp ON mp.module_id = m.id
  WHERE (mp.completed IS NULL OR mp.completed = false)
    AND (p_user_id IS NULL OR d.user_id = p_user_id)
  ORDER BY m.order_index
  LIMIT 1;
$$;

-- Quiz history filtered by user_id
CREATE OR REPLACE FUNCTION get_quiz_history(p_user_id UUID DEFAULT NULL)
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
  WHERE (p_user_id IS NULL OR qs.user_id = p_user_id)
  ORDER BY qr.submitted_at DESC;
$$;
