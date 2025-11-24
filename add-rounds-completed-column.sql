-- Add rounds_completed column to session_progress table
-- This tracks how many rounds have been completed for each game

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_progress' 
    AND column_name = 'rounds_completed'
  ) THEN
    ALTER TABLE session_progress 
    ADD COLUMN rounds_completed INTEGER DEFAULT 0;
  END IF;
END $$;


