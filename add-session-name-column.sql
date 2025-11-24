-- Add session_name column to sessions table
-- This allows teachers to give sessions custom names instead of using word set title

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'session_name'
  ) THEN
    ALTER TABLE sessions 
    ADD COLUMN session_name VARCHAR(255);
  END IF;
END $$;


