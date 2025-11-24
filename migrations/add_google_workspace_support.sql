-- Migration: Add Google Workspace support for students
-- This migration adds columns to support Google sign-in and Google Classroom import
-- Run this in Supabase SQL Editor

-- Add Google-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_email TEXT,
ADD COLUMN IF NOT EXISTS google_user_id TEXT,
ADD COLUMN IF NOT EXISTS google_name TEXT,
ADD COLUMN IF NOT EXISTS google_profile_picture TEXT,
ADD COLUMN IF NOT EXISTS email_source TEXT CHECK (email_source IN ('synthetic', 'google', 'manual')) DEFAULT 'synthetic',
ADD COLUMN IF NOT EXISTS workspace_domain TEXT;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_user_id ON profiles(google_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email_source ON profiles(email_source);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_domain ON profiles(workspace_domain);

-- Update existing profiles to have email_source = 'synthetic' if they have @local.local emails
UPDATE profiles 
SET email_source = 'synthetic' 
WHERE email LIKE '%@local.local' AND email_source IS NULL;

-- Update existing profiles to have email_source = 'manual' if they have real emails and are teachers
UPDATE profiles 
SET email_source = 'manual' 
WHERE email NOT LIKE '%@local.local' 
  AND role = 'teacher' 
  AND email_source IS NULL;

-- Add comment to explain email_source
COMMENT ON COLUMN profiles.email_source IS 'Source of email: synthetic (for students with @local.local), google (from Google OAuth), or manual (teacher-entered)';
COMMENT ON COLUMN profiles.workspace_domain IS 'Google Workspace domain if user signed in with Workspace account (e.g., school.se)';
COMMENT ON COLUMN profiles.google_user_id IS 'Google User ID (sub claim from OAuth) for identifying Google accounts';
COMMENT ON COLUMN profiles.google_email IS 'Email from Google account (may differ from primary email)';





