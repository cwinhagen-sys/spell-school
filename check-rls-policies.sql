-- Check current RLS policies on assigned_word_sets and word_sets
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('assigned_word_sets', 'word_sets')
ORDER BY tablename;

-- 2. Check policies on assigned_word_sets
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'assigned_word_sets'
ORDER BY policyname;

-- 3. Check policies on word_sets
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'word_sets'
ORDER BY policyname;

-- 4. Check if auth.uid() works
SELECT auth.uid() as current_user_id;

-- 5. Test query for student assignments (replace with actual student ID)
-- SELECT 
--   aws.id,
--   aws.student_id,
--   aws.class_id,
--   aws.word_set_id,
--   ws.title as word_set_title,
--   ws.color as word_set_color
-- FROM assigned_word_sets aws
-- LEFT JOIN word_sets ws ON ws.id = aws.word_set_id
-- WHERE aws.student_id = 'REPLACE_WITH_STUDENT_ID'
--    OR aws.class_id IN (
--      SELECT class_id 
--      FROM class_students 
--      WHERE student_id = 'REPLACE_WITH_STUDENT_ID'
--    );
