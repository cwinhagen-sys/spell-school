-- Fix RLS Policy for Teachers to Create Student Progress
-- This allows teachers to create quiz results for their students
-- Run this in Supabase SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "students_can_insert_own_progress" ON student_progress;

-- Create new policy that allows both students and teachers
CREATE POLICY "students_and_teachers_can_insert_progress" ON student_progress
  FOR INSERT WITH CHECK (
    -- Students can insert their own progress
    auth.uid() = student_id OR
    -- Teachers can insert progress for students in their classes
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.student_id = student_progress.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON POLICY "students_and_teachers_can_insert_progress" ON student_progress 
IS 'Students can create their own progress, teachers can create progress for students in their classes';

