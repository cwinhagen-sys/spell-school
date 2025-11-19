-- ============================================
-- Google Classroom Integration - Database Schema
-- ============================================
-- Run ONLY the SQL commands below in Supabase SQL Editor
-- Do NOT copy any TypeScript/JavaScript code
-- ============================================

-- Add columns for Google Classroom OAuth tokens to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_classroom_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_classroom_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_classroom_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_classroom_connected_at TIMESTAMP WITH TIME ZONE;

-- Add comments to explain the columns
COMMENT ON COLUMN profiles.google_classroom_access_token IS 'Google Classroom API access token';
COMMENT ON COLUMN profiles.google_classroom_refresh_token IS 'Google Classroom API refresh token for token renewal';
COMMENT ON COLUMN profiles.google_classroom_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN profiles.google_classroom_connected_at IS 'When Google Classroom was first connected';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE 'google_classroom%'
ORDER BY column_name;
