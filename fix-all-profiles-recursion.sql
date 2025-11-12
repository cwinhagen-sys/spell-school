-- Fix ALL profiles recursion issues
-- Run this in Supabase SQL Editor
-- This fixes recursion caused by policies on OTHER tables that query profiles

-- 1. First fix profiles table itself (same as fix-profiles-rls-final.sql)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_teacher_only" ON profiles;
DROP POLICY IF EXISTS "profiles_student_only" ON profiles;

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 2. Fix policies on OTHER tables that query profiles (these cause recursion!)
-- Classes table
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Only teachers with proper role can access classes" ON classes;
DROP POLICY IF EXISTS "Pending users cannot access classes" ON classes;

-- Create simple non-recursive policies for classes
CREATE POLICY "classes_teacher_own" ON classes
  FOR ALL USING (teacher_id = auth.uid());

-- Fix class_students policies (needed for students to find their classes)
DROP POLICY IF EXISTS "Students can view their class memberships" ON class_students;
DROP POLICY IF EXISTS "class_students_teacher_only" ON class_students;

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

-- Word sets table  
DROP POLICY IF EXISTS "Teachers can view their own word sets" ON word_sets;
DROP POLICY IF EXISTS "Teachers can create word sets" ON word_sets;
DROP POLICY IF EXISTS "Only teachers with proper role can access word_sets" ON word_sets;
DROP POLICY IF EXISTS "Pending users cannot access word_sets" ON word_sets;

-- Create simple non-recursive policies for word_sets
CREATE POLICY "word_sets_teacher_own" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Students can view word sets assigned to them (via assigned_word_sets, not profiles)
CREATE POLICY "word_sets_student_assigned" ON word_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assigned_word_sets aws
      WHERE aws.word_set_id = word_sets.id
      AND (aws.student_id = auth.uid() OR 
           aws.class_id IN (
             SELECT class_id FROM class_students 
             WHERE student_id = auth.uid()
           ))
    )
  );

-- 3. Fix assigned_word_sets policies (needed for students to see assignments)
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view relevant assignments" ON assigned_word_sets;
DROP POLICY IF EXISTS "Teachers can assign word sets" ON assigned_word_sets;

-- Students can view assignments assigned to them or their classes
CREATE POLICY "assigned_word_sets_student_view" ON assigned_word_sets
  FOR SELECT USING (
    student_id = auth.uid() OR
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

-- 5. Verify all policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'classes', 'word_sets', 'assigned_word_sets', 'class_students')
ORDER BY tablename, policyname;

SELECT 'All profiles recursion issues fixed! Student assignments should work now.' as status;

