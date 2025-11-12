-- Fix Security Issues - RLS Policies
-- This script fixes the security vulnerabilities
-- Run this in Supabase SQL Editor

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view their own word sets" ON word_sets;
DROP POLICY IF EXISTS "Users can view relevant assignments" ON assigned_word_sets;

-- Create correct policies that restrict access to own data only

-- Fix classes policy - teachers can only see THEIR OWN classes
CREATE POLICY "Teachers can view their own classes only" ON classes FOR SELECT USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Fix word_sets policy - teachers can only see THEIR OWN word sets
CREATE POLICY "Teachers can view their own word sets only" ON word_sets FOR SELECT USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Fix assigned_word_sets policy - only show assignments for own classes/students
CREATE POLICY "Users can view only their own assignments" ON assigned_word_sets FOR SELECT USING (
  -- Students can see their own assignments
  student_id = auth.uid() OR
  -- Teachers can see assignments for their own classes
  EXISTS (
    SELECT 1 FROM classes c 
    WHERE c.id = assigned_word_sets.class_id 
    AND c.teacher_id = auth.uid()
  ) OR
  -- Teachers can see assignments for their own word sets
  EXISTS (
    SELECT 1 FROM word_sets ws 
    WHERE ws.id = assigned_word_sets.word_set_id 
    AND ws.teacher_id = auth.uid()
  )
);

-- Add policy for teachers to update their own classes only
CREATE POLICY "Teachers can update their own classes only" ON classes FOR UPDATE USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Add policy for teachers to delete their own classes only
CREATE POLICY "Teachers can delete their own classes only" ON classes FOR DELETE USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Add policy for teachers to update their own word sets only
CREATE POLICY "Teachers can update their own word sets only" ON word_sets FOR UPDATE USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Add policy for teachers to delete their own word sets only
CREATE POLICY "Teachers can delete their own word sets only" ON word_sets FOR DELETE USING (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Verify policies are working
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('classes', 'word_sets', 'assigned_word_sets')
ORDER BY tablename, policyname;













