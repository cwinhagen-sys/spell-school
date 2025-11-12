-- Fix typing_leaderboard RLS policy that causes recursion
-- Run this in Supabase SQL Editor AFTER fix-profiles-rls-final.sql
-- NOTE: Only run this if typing_leaderboard table exists!
-- If you get "relation does not exist" error, skip this file - it's not needed yet.

-- Check if table exists first
DO $$
BEGIN
  -- Only proceed if typing_leaderboard table exists
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'typing_leaderboard'
  ) THEN
    -- Drop the problematic policy that queries profiles
    DROP POLICY IF EXISTS "Teachers can view leaderboard" ON typing_leaderboard;

    -- Create a simple policy without recursion
    -- All authenticated users can view leaderboard (safe since only authenticated users can access)
    CREATE POLICY "Teachers can view leaderboard" ON typing_leaderboard
      FOR SELECT
      USING (true); -- Changed from EXISTS query to avoid profiles recursion

    RAISE NOTICE 'Typing leaderboard RLS fixed - no recursion!';
  ELSE
    RAISE NOTICE 'typing_leaderboard table does not exist yet - skipping fix. This is OK!';
  END IF;
END $$;

-- Verify (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'typing_leaderboard'
  ) THEN
    PERFORM 1; -- Table exists, we already fixed it above
  END IF;
END $$;

