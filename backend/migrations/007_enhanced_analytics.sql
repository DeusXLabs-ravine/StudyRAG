-- ============================================================
-- Migration 007: Enhanced Analytics Functions
-- ============================================================

-- 1. Get study time by mode
CREATE OR REPLACE FUNCTION get_study_time_by_mode(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (mode TEXT, total_seconds BIGINT)
LANGUAGE sql
AS $$
  SELECT mode, SUM(COALESCE(duration_seconds, 0))::bigint
  FROM study_sessions
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
  GROUP BY mode;
$$;

-- 2. Get study time trend (last 14 days)
CREATE OR REPLACE FUNCTION get_study_time_trend(p_days INT DEFAULT 14, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (study_date DATE, total_seconds BIGINT)
LANGUAGE sql
AS $$
  SELECT DATE(started_at) AS study_date, SUM(COALESCE(duration_seconds, 0))::bigint
  FROM study_sessions
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND started_at >= now() - (p_days || ' days')::interval
  GROUP BY DATE(started_at)
  ORDER BY study_date ASC;
$$;

-- 3. Get document mastery
CREATE OR REPLACE FUNCTION get_document_mastery(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  document_id TEXT, 
  original_name TEXT, 
  avg_score FLOAT, 
  completion_rate FLOAT,
  total_modules BIGINT,
  completed_modules BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    d.id,
    d.original_name,
    AVG(qr.score)::float as avg_score,
    (COUNT(DISTINCT m.id) FILTER (WHERE mp.completed = true))::float / NULLIF(COUNT(DISTINCT m.id), 0) as completion_rate,
    COUNT(DISTINCT m.id) as total_modules,
    COUNT(DISTINCT m.id) FILTER (WHERE mp.completed = true) as completed_modules
  FROM documents d
  LEFT JOIN modules m ON m.document_id = d.id
  LEFT JOIN module_progress mp ON mp.module_id = m.id
  LEFT JOIN quiz_sessions qs ON qs.document_id = d.id
  LEFT JOIN quiz_results qr ON qr.quiz_session_id = qs.id
  WHERE (p_user_id IS NULL OR d.user_id = p_user_id)
  GROUP BY d.id, d.original_name;
$$;

-- 4. Get total XP and Level from game stats
CREATE OR REPLACE FUNCTION get_user_performance_summary(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_xp INTEGER,
  current_level INTEGER,
  games_played INTEGER,
  total_documents BIGINT,
  total_sessions BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    COALESCE(ugs.total_xp, 0),
    COALESCE(ugs.level, 1),
    COALESCE(ugs.games_played, 0),
    (SELECT COUNT(*) FROM documents WHERE (p_user_id IS NULL OR user_id = p_user_id)),
    (SELECT COUNT(*) FROM study_sessions WHERE (p_user_id IS NULL OR user_id = p_user_id))
  FROM user_game_stats ugs
  WHERE (p_user_id IS NULL OR ugs.user_id = p_user_id)
  LIMIT 1;
$$;
