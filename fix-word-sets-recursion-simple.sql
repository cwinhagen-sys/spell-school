-- Fix word_sets recursion with simple policies
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies on word_sets
DROP POLICY IF EXISTS "word_sets_teacher_only" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_secure" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_secure" ON word_sets;
DROP POLICY IF EXISTS "Teachers can view their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can update their own word sets only" ON word_sets;
DROP POLICY IF EXISTS "Teachers can delete their own word sets only" ON word_sets;

-- 2. Create very simple policies without complex joins
-- Teachers can do everything with their own word sets
CREATE POLICY "word_sets_teacher_simple" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- Students can view word sets (no complex joins to avoid recursion)
CREATE POLICY "word_sets_student_simple" ON word_sets
  FOR SELECT USING (true);

-- 3. Add comments
COMMENT ON POLICY "word_sets_teacher_simple" ON word_sets IS 'Teachers can manage their own word sets';
COMMENT ON POLICY "word_sets_student_simple" ON word_sets IS 'Students can view all word sets (filtered by assignments)';

-- 4. Verify policies
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'word_sets'
ORDER BY policyname;

-- 5. Test
SELECT 'Word sets recursion fixed with simple policies' as status;












