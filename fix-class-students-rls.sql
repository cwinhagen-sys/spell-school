-- Fix RLS on class_students table to allow service role access

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'class_students';

-- Show current policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'class_students';

-- OPTION 1: Add explicit policy for service role
-- (Service role should bypass RLS, but let's be explicit)

DROP POLICY IF EXISTS "Service role can view all class_students" ON class_students;

CREATE POLICY "Service role can view all class_students"
  ON class_students
  FOR SELECT
  TO service_role
  USING (true);

-- OPTION 2: Ensure anon and authenticated roles have proper access
DROP POLICY IF EXISTS "Teachers can view students in their classes via class_students" ON class_students;

CREATE POLICY "Teachers can view students in their classes via class_students"
  ON class_students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_students.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Verify the policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'class_students'
ORDER BY policyname;

-- Test query as if we were the service role
-- (This should work now)
SELECT COUNT(*) as student_count
FROM class_students cs
WHERE cs.deleted_at IS NULL;























