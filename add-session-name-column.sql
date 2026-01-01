-- Add session_name column to sessions table if it doesn't exist
-- Run this in Supabase SQL Editor

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS session_name TEXT;
