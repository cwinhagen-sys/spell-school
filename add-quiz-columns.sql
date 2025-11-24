-- Add quiz columns to sessions table if they don't exist
-- Run this in Supabase SQL Editor

-- Add quiz_enabled column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'quiz_enabled'
  ) THEN
    ALTER TABLE sessions 
    ADD COLUMN quiz_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add quiz_grading_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'quiz_grading_type'
  ) THEN
    ALTER TABLE sessions 
    ADD COLUMN quiz_grading_type VARCHAR(20) DEFAULT 'ai';
  END IF;
END $$;


