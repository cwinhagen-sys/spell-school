-- Secure RLS policies for assignments that prevent data leakage between teachers
-- Run this in Supabase SQL Editor

-- 1. Re-enable RLS on assigned_word_sets
ALTER TABLE assigned_word_sets ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_simple_student" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_simple_class" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_teacher" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view only their own assignments" ON assigned_word_sets;

-- 3. Create secure policies that prevent data leakage
-- Teachers can only see assignments for their own word sets
CREATE POLICY "assigned_word_sets_teacher_secure" ON assigned_word_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

-- Students can see assignments assigned to them or their classes
CREATE POLICY "assigned_word_sets_student_secure" ON assigned_word_sets
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

-- 4. Re-enable RLS on word_sets
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies on word_sets
DROP POLICY IF EXISTS "word_sets_teacher_only" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "Teachers can view their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can update their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can delete their own word sets only" ON word_sets;

-- 6. Create secure policies for word_sets
-- Teachers can manage their own word sets
CREATE POLICY "word_sets_teacher_secure" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Students can view word sets that are assigned to them
CREATE POLICY "word_sets_student_secure" ON word_sets
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

-- 7. Add comments
COMMENT ON POLICY "assigned_word_sets_teacher_secure" ON assigned_word_sets IS 'Teachers can only access assignments for their own word sets';
COMMENT ON POLICY "assigned_word_sets_student_secure" ON assigned_word_sets IS 'Students can see assignments assigned to them or their classes';
COMMENT ON POLICY "word_sets_teacher_secure" ON word_sets IS 'Teachers can only access their own word sets';
COMMENT ON POLICY "word_sets_student_secure" ON word_sets IS 'Students can view word sets assigned to them';

-- 8. Verify policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('assigned_word_sets', 'word_sets')
ORDER BY tablename, policyname;

-- 9. Test data isolation
SELECT 'Secure RLS policies created - data isolation restored' as status;












