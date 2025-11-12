-- Add last_active column to profiles table for better activity tracking
-- This will track when users last logged in or were active

-- Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- Create an index for better performance when querying by last_active
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active);

-- Update existing profiles to have a default last_active value
UPDATE profiles 
SET last_active = COALESCE(last_active, created_at, NOW())
WHERE last_active IS NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN profiles.last_active IS 'Tracks when the user was last active (logged in or performed an action)';














