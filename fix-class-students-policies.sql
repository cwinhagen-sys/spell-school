-- Fix class_students RLS policies
-- Run this in Supabase SQL Editor if students can't see their assignments
-- This ensures students can view their class memberships

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their class memberships" ON class_students;
DROP POLICY IF EXISTS "class_students_teacher_only" ON class_students;
DROP POLICY IF EXISTS "class_students_student_view" ON class_students;
DROP POLICY IF EXISTS "class_students_teacher_manage" ON class_students;

-- Students can view their own class memberships
CREATE POLICY "class_students_student_view" ON class_students
  FOR SELECT USING (student_id = auth.uid());

-- Teachers can view/manage class_students for their own classes
CREATE POLICY "class_students_teacher_manage" ON class_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_students.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Verify
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'class_students'
ORDER BY policyname;

SELECT 'class_students policies fixed!' as status;



