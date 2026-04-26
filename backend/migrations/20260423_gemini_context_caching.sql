-- Add Gemini Context Caching support to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gemini_cache_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gemini_cache_expiry TIMESTAMPTZ;
