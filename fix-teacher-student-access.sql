-- Fix Teacher Access to Student Data
-- This script fixes RLS policies to allow teachers to view student progress in their classes

-- 1. Add RLS policy for teachers to view student progress in their classes
DROP POLICY IF EXISTS "Teachers can view student progress in their classes" ON student_progress;

CREATE POLICY "Teachers can view student progress in their classes"
  ON student_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = student_progress.student_id
        AND c.teacher_id = auth.uid()
        AND cs.deleted_at IS NULL
    )
  );

-- 2. Add RLS policy for teachers to view student streaks in their classes
DROP POLICY IF EXISTS "Teachers can view student streaks in their classes" ON student_streaks;

CREATE POLICY "Teachers can view student streaks in their classes"
  ON student_streaks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = student_streaks.user_id
        AND c.teacher_id = auth.uid()
        AND cs.deleted_at IS NULL
    )
  );

-- 3. Add RLS policy for teachers to view user badges in their classes
DROP POLICY IF EXISTS "Teachers can view student badges in their classes" ON user_badges;

CREATE POLICY "Teachers can view student badges in their classes"
  ON user_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = user_badges.user_id
        AND c.teacher_id = auth.uid()
        AND cs.deleted_at IS NULL
    )
  );

-- 4. Add RLS policy for teachers to view game scores in their classes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_scores') THEN
    DROP POLICY IF EXISTS "Teachers can view game scores in their classes" ON game_scores;
    
    CREATE POLICY "Teachers can view game scores in their classes"
      ON game_scores
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM class_students cs
          JOIN classes c ON cs.class_id = c.id
          WHERE cs.student_id = game_scores.student_id
            AND c.teacher_id = auth.uid()
            AND cs.deleted_at IS NULL
        )
      );
    
    RAISE NOTICE 'Created policy for game_scores';
  ELSE
    RAISE NOTICE 'Skipped game_scores - table does not exist';
  END IF;
END $$;

-- 5. Add RLS policy for teachers to view profiles of students in their classes
DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON profiles;

CREATE POLICY "Teachers can view student profiles in their classes"
  ON profiles
  FOR SELECT
  USING (
    role = 'student' AND
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = profiles.id
        AND c.teacher_id = auth.uid()
        AND cs.deleted_at IS NULL
    )
  );

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('student_progress', 'student_streaks', 'user_badges', 'game_scores', 'profiles')
  AND policyname LIKE '%Teachers%'
ORDER BY tablename, policyname;

