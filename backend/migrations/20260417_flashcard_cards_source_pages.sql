-- Add source_pages column to flashcard_cards
ALTER TABLE flashcard_cards
  ADD COLUMN IF NOT EXISTS source_pages INTEGER[];
