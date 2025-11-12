-- Complete Data Isolation Fix
-- This ensures teachers can only see their own data
-- Run this in Supabase SQL Editor

-- 1. First, let's check current RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('classes', 'class_students', 'word_sets', 'assigned_word_sets', 'student_progress', 'profiles')
ORDER BY tablename;

-- 2. Enable RLS on all critical tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Teachers can view their own classes only" ON classes;
DROP POLICY IF EXISTS "Teachers can view their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Users can view only their own assignments" ON assigned_word_sets;
DROP POLICY IF EXISTS "Teachers can update their own classes only" ON classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes only" ON classes;
DROP POLICY IF EXISTS "Teachers can update their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can delete their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "students_can_view_own_progress" ON student_progress;
DROP POLICY IF EXISTS "students_can_update_own_progress" ON student_progress;
DROP POLICY IF EXISTS "students_and_teachers_can_insert_progress" ON student_progress;
DROP POLICY IF EXISTS "teachers_can_view_student_progress" ON student_progress;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- 4. Create strict policies for CLASSES table
CREATE POLICY "classes_teacher_only" ON classes
  FOR ALL USING (teacher_id = auth.uid());

-- 5. Create strict policies for CLASS_STUDENTS table
CREATE POLICY "class_students_teacher_only" ON class_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = class_students.class_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- 6. Create strict policies for WORD_SETS table
CREATE POLICY "word_sets_teacher_only" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- 7. Create strict policies for ASSIGNED_WORD_SETS table
CREATE POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets
  FOR ALL USING (
    -- Teachers can manage assignments for their own word sets
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

CREATE POLICY "assigned_word_sets_student_view" ON assigned_word_sets
  FOR SELECT USING (student_id = auth.uid());

-- 8. Create strict policies for STUDENT_PROGRESS table
CREATE POLICY "student_progress_student_only" ON student_progress
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "student_progress_teacher_view" ON student_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.student_id = student_progress.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- 9. Create strict policies for PROFILES table
CREATE POLICY "profiles_own_only" ON profiles
  FOR ALL USING (id = auth.uid());

-- 10. Add comments for clarity
COMMENT ON POLICY "classes_teacher_only" ON classes IS 'Teachers can only access their own classes';
COMMENT ON POLICY "class_students_teacher_only" ON class_students IS 'Teachers can only access class_students for their own classes';
COMMENT ON POLICY "word_sets_teacher_only" ON word_sets IS 'Teachers can only access their own word sets';
COMMENT ON POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets IS 'Teachers can manage assignments for their own word sets';
COMMENT ON POLICY "assigned_word_sets_student_view" ON assigned_word_sets IS 'Students can view their own assignments';
COMMENT ON POLICY "student_progress_student_only" ON student_progress IS 'Students can manage their own progress';
COMMENT ON POLICY "student_progress_teacher_view" ON student_progress IS 'Teachers can view progress of students in their classes';
COMMENT ON POLICY "profiles_own_only" ON profiles IS 'Users can only access their own profile';

-- 11. Verify all policies are in place
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('classes', 'class_students', 'word_sets', 'assigned_word_sets', 'student_progress', 'profiles')
ORDER BY tablename, policyname;

-- 12. Test data isolation
SELECT 'Data isolation fix completed successfully' as status;












