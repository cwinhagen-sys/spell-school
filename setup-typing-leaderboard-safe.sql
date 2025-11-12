-- Safe Typing Leaderboard Setup
-- Run this in Supabase SQL Editor
-- This script checks if table exists and sets up with proper RLS

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS typing_leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  kpm INTEGER NOT NULL, -- Keys per minute
  duration_sec INTEGER NOT NULL, -- Time taken in seconds
  accuracy_pct INTEGER NOT NULL, -- Must be 100% to be on leaderboard
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create unique constraint (handle NULLs properly)
-- Drop old constraint if it exists
ALTER TABLE typing_leaderboard DROP CONSTRAINT IF EXISTS typing_leaderboard_word_set_id_student_id_key;
DROP INDEX IF EXISTS typing_leaderboard_word_set_id_student_id_idx;

-- Create unique index (NULLs are treated as distinct by default in PostgreSQL < 15)
-- For PostgreSQL 15+, we can use NULLS NOT DISTINCT
-- For older versions, we'll use a partial unique index
DO $$ 
BEGIN
  -- Try PostgreSQL 15+ syntax first
  BEGIN
    CREATE UNIQUE INDEX typing_leaderboard_word_set_id_student_id_idx 
    ON typing_leaderboard (word_set_id, student_id) NULLS NOT DISTINCT;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback for older PostgreSQL: use partial unique index
    -- This allows multiple NULL word_set_id entries per student
    CREATE UNIQUE INDEX typing_leaderboard_word_set_id_student_id_idx 
    ON typing_leaderboard (word_set_id, student_id) 
    WHERE word_set_id IS NOT NULL;
    
    -- For NULL word_set_id, allow only one per student
    CREATE UNIQUE INDEX IF NOT EXISTS typing_leaderboard_null_word_set_student_idx 
    ON typing_leaderboard (student_id) 
    WHERE word_set_id IS NULL;
  END;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_word_set_id ON typing_leaderboard(word_set_id);
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_student_id ON typing_leaderboard(student_id);
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_kpm ON typing_leaderboard(word_set_id, kpm DESC);
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_created ON typing_leaderboard(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE typing_leaderboard ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Students can view leaderboard" ON typing_leaderboard;
DROP POLICY IF EXISTS "Students can insert own leaderboard" ON typing_leaderboard;
DROP POLICY IF EXISTS "Students can update own leaderboard" ON typing_leaderboard;
DROP POLICY IF EXISTS "Teachers can view leaderboard" ON typing_leaderboard;

-- Step 6: Create RLS Policies
-- Students can view all leaderboard entries (for ranking)
CREATE POLICY "Students can view leaderboard" ON typing_leaderboard
  FOR SELECT
  USING (true);

-- Students can insert their own records
CREATE POLICY "Students can insert own leaderboard" ON typing_leaderboard
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own records (to improve their best)
CREATE POLICY "Students can update own leaderboard" ON typing_leaderboard
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Teachers can view all leaderboard entries
CREATE POLICY "Teachers can view leaderboard" ON typing_leaderboard
  FOR SELECT
  USING (true);

-- Step 7: Verify setup
SELECT 
  'public' as schemaname, 
  relname as tablename, 
  CASE WHEN relrowsecurity THEN 'true' ELSE 'false' END as rls_enabled
FROM pg_class
WHERE relname = 'typing_leaderboard' 
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'typing_leaderboard'
ORDER BY policyname;

SELECT 'Typing leaderboard setup complete!' as status;

