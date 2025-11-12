-- Fix RLS policies for student assignments (assigned_word_sets and word_sets)
-- Run this AFTER fix-all-profiles-recursion.sql
-- This ensures students can see their assignments

-- 1. Drop existing policies on assigned_word_sets
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view relevant assignments" ON assigned_word_sets;
DROP POLICY IF EXISTS "Teachers can assign word sets" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_simple_student" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_simple_class" ON assigned_word_sets;

-- 2. Create policies for assigned_word_sets
-- Students can view assignments assigned to them or their classes
CREATE POLICY "assigned_word_sets_student_view" ON assigned_word_sets
  FOR SELECT USING (
    -- Individual assignments
    student_id = auth.uid() OR
    -- Class assignments for classes they belong to
    (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.student_id = auth.uid()
      AND cs.class_id = assigned_word_sets.class_id
    ))
  );

-- Teachers can manage assignments for their own word sets
CREATE POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

-- 3. Update word_sets policies to allow students to see assigned word sets
DROP POLICY IF EXISTS "word_sets_teacher_own" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_assigned" ON word_sets;

-- Teachers can manage their own word sets
CREATE POLICY "word_sets_teacher_own" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Students can view word sets that are assigned to them
CREATE POLICY "word_sets_student_assigned" ON word_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assigned_word_sets aws
      WHERE aws.word_set_id = word_sets.id
      AND (
        aws.student_id = auth.uid() OR
        (aws.class_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM class_students cs
          WHERE cs.student_id = auth.uid()
          AND cs.class_id = aws.class_id
        ))
      )
    )
  );

-- 4. Verify policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('assigned_word_sets', 'word_sets')
ORDER BY tablename, policyname;

SELECT 'Student assignments RLS policies fixed!' as status;



