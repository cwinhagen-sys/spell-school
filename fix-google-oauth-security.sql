-- Fix Google OAuth Security Issue
-- This script ensures that users without proper roles cannot access data

-- First, let's check current profiles without roles
SELECT id, email, role, created_at 
FROM profiles 
WHERE role IS NULL OR role = ''
ORDER BY created_at DESC;

-- Update any existing profiles without roles to have a default role
-- This prevents them from accessing teacher/student data
UPDATE profiles 
SET role = 'pending' 
WHERE role IS NULL OR role = '';

-- Add a policy to prevent access to classes/word_sets for users without proper roles
DROP POLICY IF EXISTS "Only teachers with proper role can access classes" ON classes;
DROP POLICY IF EXISTS "Only teachers with proper role can access word_sets" ON word_sets;

-- Create stricter policies that require specific roles
CREATE POLICY "Only teachers with proper role can access classes" ON classes FOR ALL USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'teacher'
  )
);

CREATE POLICY "Only teachers with proper role can access word_sets" ON word_sets FOR ALL USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'teacher'
  )
);

-- Add policy to prevent users with 'pending' role from accessing anything
CREATE POLICY "Pending users cannot access classes" ON classes FOR ALL USING (
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'pending'
  )
);

CREATE POLICY "Pending users cannot access word_sets" ON word_sets FOR ALL USING (
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'pending'
  )
);

-- Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('classes', 'word_sets')
ORDER BY tablename, policyname;

