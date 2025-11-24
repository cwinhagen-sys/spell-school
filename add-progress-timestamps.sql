-- Add created_at and updated_at columns to session_progress if they don't exist
-- Run this in Supabase SQL Editor

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_progress' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE session_progress 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_progress' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE session_progress 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add trigger to update updated_at on row update
CREATE OR REPLACE FUNCTION update_session_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_session_progress_updated_at ON session_progress;

CREATE TRIGGER update_session_progress_updated_at
  BEFORE UPDATE ON session_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_session_progress_updated_at();


