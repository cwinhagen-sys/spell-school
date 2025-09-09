-- Add new fields to profiles table for student signup
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS class_code TEXT,
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Create index on class_code for student lookups
CREATE INDEX IF NOT EXISTS idx_profiles_class_code ON profiles(class_code);

-- Update existing profiles to have name field if it doesn't exist
UPDATE profiles 
SET name = COALESCE(full_name, email) 
WHERE name IS NULL;

