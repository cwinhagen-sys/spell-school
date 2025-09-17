-- Update RLS Policies for student_progress table
-- Run this after the migration to ensure proper access control

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own progress" ON student_progress;
DROP POLICY IF EXISTS "Students can manage own progress" ON student_progress;
DROP POLICY IF EXISTS "Teachers can view class progress" ON student_progress;

-- Create updated policies for the new structure

-- Students can view their own progress
CREATE POLICY "students_can_view_own_progress" ON student_progress
  FOR SELECT USING (auth.uid() = student_id);

-- Students can update their own progress
CREATE POLICY "students_can_update_own_progress" ON student_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Students can insert their own progress
CREATE POLICY "students_can_insert_own_progress" ON student_progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can view progress of students in their classes
CREATE POLICY "teachers_can_view_student_progress" ON student_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.student_id = student_progress.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON POLICY "students_can_view_own_progress" ON student_progress IS 'Students can see their own progress records';
COMMENT ON POLICY "students_can_update_own_progress" ON student_progress IS 'Students can update their own progress records';
COMMENT ON POLICY "students_can_insert_own_progress" ON student_progress IS 'Students can create their own progress records';
COMMENT ON POLICY "teachers_can_view_student_progress" ON student_progress IS 'Teachers can see progress of students in their classes';


