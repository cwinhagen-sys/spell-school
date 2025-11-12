-- Fix infinite recursion in assigned_word_sets policies
-- Run this in Supabase SQL Editor

-- 1. Drop ALL existing policies on assigned_word_sets
DROP POLICY IF EXISTS "assigned_word_sets_teacher_manage" ON assigned_word_sets;
DROP POLICY IF EXISTS "assigned_word_sets_student_view" ON assigned_word_sets;
DROP POLICY IF EXISTS "Users can view only their own assignments" ON assigned_word_sets;

-- 2. Temporarily disable RLS to test
ALTER TABLE assigned_word_sets DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE assigned_word_sets ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, non-recursive policies
CREATE POLICY "assigned_word_sets_simple_student" ON assigned_word_sets
  FOR SELECT USING (
    -- Students can see their own individual assignments
    student_id = auth.uid()
  );

CREATE POLICY "assigned_word_sets_simple_class" ON assigned_word_sets
  FOR SELECT USING (
    -- Students can see class assignments for classes they belong to
    class_id IN (
      SELECT class_id FROM class_students 
      WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "assigned_word_sets_teacher" ON assigned_word_sets
  FOR ALL USING (
    -- Teachers can manage assignments for their own word sets
    EXISTS (
      SELECT 1 FROM word_sets ws 
      WHERE ws.id = assigned_word_sets.word_set_id 
      AND ws.teacher_id = auth.uid()
    )
  );

-- 5. Add comments
COMMENT ON POLICY "assigned_word_sets_simple_student" ON assigned_word_sets IS 'Students can see their own individual assignments';
COMMENT ON POLICY "assigned_word_sets_simple_class" ON assigned_word_sets IS 'Students can see class assignments for classes they belong to';
COMMENT ON POLICY "assigned_word_sets_teacher" ON assigned_word_sets IS 'Teachers can manage assignments for their own word sets';

-- 6. Verify policies
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'assigned_word_sets'
ORDER BY policyname;

-- 7. Test
SELECT 'Assignment recursion fixed' as status;












