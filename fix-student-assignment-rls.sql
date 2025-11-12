-- Fix RLS policies for student assignment visibility
-- Run this in Supabase SQL Editor

-- 1. Drop existing policies on assigned_word_sets
DROP POLICY IF EXISTS "assigned_word_sets_teacher_secure" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_secure" ON assigned_word_sets;

-- 2. Create new policies for assigned_word_sets
-- Teachers can manage their own assignments
CREATE POLICY "assigned_word_sets_teacher_manage" ON assigned_word_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

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

-- 3. Drop existing policies on word_sets
DROP POLICY IF EXISTS "word_sets_teacher_simple" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_simple" ON word_sets;

-- 4. Create new policies for word_sets
-- Teachers can manage their own word sets
CREATE POLICY "word_sets_teacher_manage" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Students can view word sets that are assigned to them
CREATE POLICY "word_sets_student_view" ON word_sets
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

-- 5. Verify RLS is enabled
ALTER TABLE assigned_word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;

-- 6. Test query
SELECT 'RLS policies updated successfully' as status;












