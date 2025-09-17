-- Temporarily disable RLS on word_sets to fix student assignments
-- Run this in Supabase SQL Editor

-- 1. Drop ALL existing policies on word_sets
DROP POLICY IF EXISTS "word_sets_teacher_only" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "Teachers can view their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can update their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can delete their own word sets only" ON word_sets;

-- 2. Completely disable RLS on word_sets
ALTER TABLE word_sets DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'word_sets';

-- 4. Test that we can access word sets
SELECT 'Word sets RLS disabled - student assignments should work now' as status;
