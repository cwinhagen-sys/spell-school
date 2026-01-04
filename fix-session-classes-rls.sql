-- Fix RLS policy for session_classes to exclude deleted class_students
-- Run this in Supabase SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "students_view_session_classes" ON session_classes;

-- Create updated policy that checks for active (non-deleted) class_students
CREATE POLICY "students_view_session_classes" ON session_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.class_id = session_classes.class_id
      AND cs.student_id = auth.uid()
      AND cs.deleted_at IS NULL
    )
  );



