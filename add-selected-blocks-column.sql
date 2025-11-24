-- Add selected_blocks column to session_participants if it doesn't exist
-- Run this in Supabase SQL Editor

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_participants' 
    AND column_name = 'selected_blocks'
  ) THEN
    ALTER TABLE session_participants 
    ADD COLUMN selected_blocks JSONB;
  END IF;
END $$;

-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "participants_update_own" ON session_participants;

CREATE POLICY "participants_update_own" ON session_participants
  FOR UPDATE USING (true);

