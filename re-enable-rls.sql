-- Re-enable RLS for student_progress after testing
-- Run this after you've confirmed quiz functionality works

-- Re-enable RLS
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Create proper policies
DROP POLICY IF EXISTS "students_can_view_own_progress" ON student_progress;
DROP POLICY IF EXISTS "students_can_update_own_progress" ON student_progress;
DROP POLICY IF EXISTS "students_can_insert_own_progress" ON student_progress;
DROP POLICY IF EXISTS "students_and_teachers_can_insert_progress" ON student_progress;
DROP POLICY IF EXISTS "teachers_can_view_student_progress" ON student_progress;

-- Students can view their own progress
CREATE POLICY "students_can_view_own_progress" ON student_progress
  FOR SELECT USING (auth.uid() = student_id);

-- Students can update their own progress
CREATE POLICY "students_can_update_own_progress" ON student_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Students and teachers can insert progress
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
COMMENT ON POLICY "students_and_teachers_can_insert_progress" ON student_progress IS 'Students can create their own progress, teachers can create progress for students in their classes';
COMMENT ON POLICY "teachers_can_view_student_progress" ON student_progress IS 'Teachers can see progress of students in their classes';














