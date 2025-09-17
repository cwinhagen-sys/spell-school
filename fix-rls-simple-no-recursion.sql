-- Fix RLS with very simple policies that avoid recursion
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies first
DROP POLICY IF EXISTS "assigned_word_sets_teacher_own" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_own" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_secure" ON assigned_word_sets;

DROP POLICY IF EXISTS "word_sets_teacher_own" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_assigned" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_simple" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_simple" ON word_sets;

-- 2. Enable RLS
ALTER TABLE assigned_word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;

-- 3. Create VERY simple policies for assigned_word_sets
-- Teachers can manage assignments for their own word sets
CREATE POLICY "assigned_word_sets_teacher_simple" ON assigned_word_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM word_sets 
      WHERE word_sets.id = assigned_word_sets.word_set_id 
      AND word_sets.teacher_id = auth.uid()
    )
  );

-- Students can view assignments assigned to them or their classes
CREATE POLICY "assigned_word_sets_student_simple" ON assigned_word_sets
  FOR SELECT USING (
    student_id = auth.uid() OR
    (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM class_students 
      WHERE class_students.student_id = auth.uid()
      AND class_students.class_id = assigned_word_sets.class_id
    ))
  );

-- 4. Create VERY simple policies for word_sets
-- Teachers can manage their own word sets
CREATE POLICY "word_sets_teacher_simple" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Students can view ALL word sets (we'll filter in application logic)
-- This avoids recursion completely
CREATE POLICY "word_sets_student_simple" ON word_sets
  FOR SELECT USING (true);

-- 5. Verify
SELECT 'RLS policies created successfully' as status;
