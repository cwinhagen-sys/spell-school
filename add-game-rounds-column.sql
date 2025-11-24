-- Add game_rounds column to sessions table
-- This stores how many rounds each game must be completed before unlocking the next game
-- Format: JSONB object like {"flashcards": 1, "multiple_choice": 2, ...}

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'game_rounds'
  ) THEN
    ALTER TABLE sessions 
    ADD COLUMN game_rounds JSONB DEFAULT '{}';
  END IF;
END $$;


