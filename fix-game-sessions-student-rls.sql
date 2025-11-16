-- =========================================================
-- FIX GAME SESSIONS RLS FOR STUDENTS
-- =========================================================
-- Problem: Students cannot insert or update their own game sessions
-- Fix: Add RLS policies for students to manage their own game sessions

-- Step 1: Check if game_sessions table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'game_sessions'
) as table_exists;

-- Step 2: Enable RLS on game_sessions if not already enabled
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (clean slate)
DROP POLICY IF EXISTS "Students can insert own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Students can update own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Students can view own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Teachers can view student sessions in their classes" ON game_sessions;

-- Step 4: Create policies for STUDENTS to manage their own sessions
CREATE POLICY "Students can insert own game sessions"
  ON game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own game sessions"
  ON game_sessions
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own game sessions"
  ON game_sessions
  FOR SELECT
  USING (auth.uid() = student_id);

-- Step 5: Create policy for TEACHERS to view student sessions in their classes
CREATE POLICY "Teachers can view student sessions in their classes"
  ON game_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      JOIN profiles p ON p.id = auth.uid()
      WHERE cs.student_id = game_sessions.student_id
        AND c.teacher_id = auth.uid()
        AND p.role = 'teacher'
        AND cs.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
  );

-- Step 6: Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'game_sessions'
ORDER BY policyname;

-- Step 7: Test that students can insert
-- You can run this as a student to verify:
/*
INSERT INTO game_sessions (student_id, game_type, started_at)
VALUES (auth.uid(), 'typing', NOW())
RETURNING id;
*/

-- Step 8: Verify current user can access game_sessions
SELECT 
  current_user as pg_user,
  auth.uid() as auth_user_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as user_role;

-- =========================================================
-- EXPECTED RESULTS
-- =========================================================
-- After running this script:
-- 1. Students can INSERT their own game sessions ✅
-- 2. Students can UPDATE their own game sessions ✅  
-- 3. Students can VIEW their own game sessions ✅
-- 4. Teachers can VIEW student sessions in their classes ✅
-- 5. Game sessions will appear in teacher dashboard ✅
-- =========================================================


















