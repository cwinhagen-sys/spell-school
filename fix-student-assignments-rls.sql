-- Fix RLS policies for student assignments
-- Run this in Supabase SQL Editor

-- 1. Check current policies on assigned_word_sets
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'assigned_word_sets';

-- 2. Drop existing policies
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view only their own assignments" ON assigned_word_sets;

-- 3. Create new policies that allow students to see both individual and class assignments
CREATE POLICY "assigned_word_sets_student_view" ON assigned_word_sets
  FOR SELECT USING (
    -- Students can see their own individual assignments
    student_id = auth.uid() OR
    -- Students can see class assignments for classes they belong to
    EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.student_id = auth.uid()
      AND cs.class_id = assigned_word_sets.class_id
    )
  );

-- 4. Create policy for teachers to manage assignments
CREATE POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets
  FOR ALL USING (
    -- Teachers can manage assignments for their own word sets
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

-- 5. Add comments
COMMENT ON POLICY "assigned_word_sets_student_view" ON assigned_word_sets IS 'Students can view their own assignments and class assignments for classes they belong to';
COMMENT ON POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets IS 'Teachers can manage assignments for their own word sets';

-- 6. Verify policies
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'assigned_word_sets'
ORDER BY policyname;

-- 7. Test query that students should be able to run
SELECT 'Student assignments RLS policies updated' as status;












