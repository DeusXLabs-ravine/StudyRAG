-- Bridge Module System: adaptive review modules for struggled quizzes
ALTER TABLE modules ADD COLUMN IF NOT EXISTS module_type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS parent_module_id TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS bridge_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_modules_parent_bridge ON modules(parent_module_id) WHERE module_type = 'bridge';

CREATE OR REPLACE FUNCTION shift_module_order_indices(p_document_id TEXT, p_after_index INTEGER)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE modules SET order_index = order_index + 1
  WHERE document_id = p_document_id AND order_index > p_after_index;
END;
$$;
