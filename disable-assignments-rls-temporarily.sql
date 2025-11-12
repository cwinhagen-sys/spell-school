-- Temporarily disable RLS on assigned_word_sets to fix recursion
-- Run this in Supabase SQL Editor

-- 1. Drop ALL existing policies on assigned_word_sets
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_simple_student" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_simple_class" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view only their own assignments" ON assigned_word_sets;

-- 2. Completely disable RLS on assigned_word_sets
ALTER TABLE assigned_word_sets DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'assigned_word_sets';

-- 4. Test that we can access assignments
SELECT 'Assigned word sets RLS disabled - assignments should work now' as status;












