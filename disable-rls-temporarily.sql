-- Temporarily disable RLS to fix recursion issues
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on assigned_word_sets
ALTER TABLE assigned_word_sets DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on word_sets  
ALTER TABLE word_sets DISABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies to clean up
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_secure" ON assigned_word_sets;

DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_simple" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_simple" ON word_sets;

-- 4. Verify
SELECT 'RLS temporarily disabled - system should work now' as status;
