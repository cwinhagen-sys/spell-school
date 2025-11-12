-- Fix RLS policies for word_sets so students can see word sets from assignments
-- Run this in Supabase SQL Editor

-- 1. Check current policies on word_sets
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'word_sets';

-- 2. Drop ALL existing policies on word_sets
DROP POLICY IF EXISTS "word_sets_teacher_only" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "Teachers can view their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can update their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can delete their own word sets only" ON word_sets;

-- 3. Create new policies that allow both teachers and students to see word sets
CREATE POLICY "word_sets_teacher_manage" ON word_sets
  FOR ALL USING (
    -- Teachers can manage their own word sets
    teacher_id = auth.uid()
  );

CREATE POLICY "word_sets_student_view" ON word_sets
  FOR SELECT USING (
    -- Students can view word sets that are assigned to them
    EXISTS (
      SELECT 1 FROM assigned_word_sets aws
      WHERE aws.word_set_id = word_sets.id
      AND (
        -- Individual assignment
        aws.student_id = auth.uid() OR
        -- Class assignment for classes they belong to
        EXISTS (
          SELECT 1 FROM class_students cs
          WHERE cs.student_id = auth.uid()
          AND cs.class_id = aws.class_id
        )
      )
    )
  );

-- 4. Add comments
COMMENT ON POLICY "word_sets_teacher_manage" ON word_sets IS 'Teachers can manage their own word sets';
COMMENT ON POLICY "word_sets_student_view" ON word_sets IS 'Students can view word sets that are assigned to them';

-- 5. Verify policies
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'word_sets'
ORDER BY policyname;

-- 6. Test query that students should be able to run
SELECT 'Word sets RLS policies updated for students' as status;












