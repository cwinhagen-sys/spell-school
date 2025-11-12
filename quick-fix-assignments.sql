-- Quick fix for student assignments
-- Run this in Supabase SQL Editor
-- This fixes the missing policies that prevent students from seeing assignments

-- 1. Fix class_students policies
DROP POLICY IF EXISTS "Students can view their class memberships" ON class_students;
DROP POLICY IF EXISTS "class_students_teacher_only" ON class_students;
DROP POLICY IF EXISTS "class_students_student_view" ON class_students;
DROP POLICY IF EXISTS "class_students_teacher_manage" ON class_students;

CREATE POLICY "class_students_student_view" ON class_students
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "class_students_teacher_manage" ON class_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_students.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- 2. Fix assigned_word_sets policies
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view relevant assignments" ON assigned_word_sets;

CREATE POLICY "assigned_word_sets_student_view" ON assigned_word_sets
  FOR SELECT USING (
    student_id = auth.uid() OR
    (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.student_id = auth.uid()
      AND cs.class_id = assigned_word_sets.class_id
    ))
  );

CREATE POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

-- 3. Fix word_sets policies - IMPORTANT: Drop ALL existing policies first
DROP POLICY IF EXISTS "word_sets_teacher_own" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_assigned" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "Teachers can view their own word sets" ON word_sets;
DROP POLICY IF EXISTS "Teachers can create word sets" ON word_sets;

-- Teachers can manage their own word sets
CREATE POLICY "word_sets_teacher_own" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Create security definer function to avoid recursion when checking assignments
CREATE OR REPLACE FUNCTION can_student_access_word_set(ws_id UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM assigned_word_sets 
    WHERE word_set_id = ws_id 
    AND (student_id = student_uuid 
         OR class_id IN (
           SELECT class_id FROM class_students 
           WHERE student_id = student_uuid
         ))
  );
END;
$$;

-- Students can view word sets assigned to them
-- Use SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "word_sets_student_assigned" ON word_sets
  FOR SELECT USING (
    can_student_access_word_set(id, auth.uid())
  );

-- 4. Verify
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('class_students', 'assigned_word_sets', 'word_sets')
ORDER BY tablename, policyname;

SELECT 'Student assignments should work now!' as status;

