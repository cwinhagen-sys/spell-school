-- Check current RLS policies to debug assignment issue
-- Run this in Supabase SQL Editor

-- 1. Check assigned_word_sets policies
SELECT 
  'assigned_word_sets' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'assigned_word_sets'
ORDER BY policyname;

-- 2. Check word_sets policies
SELECT 
  'word_sets' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'word_sets'
ORDER BY policyname;

-- 3. Check class_students policies
SELECT 
  'class_students' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'class_students'
ORDER BY policyname;

-- 4. Check if RLS is enabled on these tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('assigned_word_sets', 'word_sets', 'class_students')
ORDER BY tablename;



