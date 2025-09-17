-- GDPR Complete Auth Cleanup
-- This script completely removes ALL authentication data
-- Run this in Supabase SQL Editor

-- Step 1: Delete all user data (same as before)
DELETE FROM game_scores;
DELETE FROM student_progress;
DELETE FROM class_students;
DELETE FROM assigned_word_sets;
DELETE FROM word_sets;
DELETE FROM homeworks;
DELETE FROM classes;
DELETE FROM profiles;

-- Step 2: Clear all auth sessions and refresh tokens
-- This removes all active sessions
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;

-- Step 3: Clear any remaining auth data
-- This removes all user identities and factors
DELETE FROM auth.identities;
DELETE FROM auth.factors;

-- Step 4: Finally delete all users from auth.users
-- This should be empty after deleting profiles, but let's be sure
DELETE FROM auth.users;

-- Step 5: Verify complete cleanup
SELECT 
  'profiles' as table_name, COUNT(*) as remaining_records FROM profiles
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'auth.factors', COUNT(*) FROM auth.factors;

-- All counts should be 0

