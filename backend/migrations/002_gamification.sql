-- ============================================================
-- GAMIFICATION TABLES
-- Migration 002: XP, Streaks, Achievements, Game Stats
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
