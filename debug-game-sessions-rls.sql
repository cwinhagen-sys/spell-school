-- =========================================================
-- DEBUG GAME SESSIONS RLS ISSUES
-- =========================================================

-- Step 1: Check if game_sessions table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'game_sessions'
) as table_exists;

-- Step 2: Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'game_sessions'
ORDER BY ordinal_position;

-- Step 3: Check current RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'game_sessions'
ORDER BY policyname;

-- Step 4: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'game_sessions';

-- Step 5: Test student INSERT permission (as logged-in student)
-- This will show if a student can actually insert
SELECT 
  has_table_privilege('game_sessions', 'INSERT') as can_insert,
  has_table_privilege('game_sessions', 'UPDATE') as can_update,
  has_table_privilege('game_sessions', 'SELECT') as can_select,
  auth.uid() as current_user_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as current_user_role;

-- Step 6: Count game sessions per student
SELECT 
  student_id,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN finished_at IS NOT NULL THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN finished_at IS NULL THEN 1 END) as incomplete_sessions,
  MAX(started_at) as last_session_start
FROM game_sessions
GROUP BY student_id
ORDER BY total_sessions DESC
LIMIT 10;

-- Step 7: Check for any error logs or constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'game_sessions'::regclass;

-- Step 8: Try a test insert (run this as a logged-in student!)
-- COMMENT THIS OUT if running as admin/postgres
/*
DO $$
DECLARE
  test_user_id UUID;
  new_session_id UUID;
BEGIN
  -- Get current user
  test_user_id := auth.uid();
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'Not logged in as a user (running as postgres)';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing insert for user: %', test_user_id;
  
  -- Try to insert a test session
  INSERT INTO game_sessions (student_id, game_type, started_at)
  VALUES (test_user_id, 'typing', NOW())
  RETURNING id INTO new_session_id;
  
  RAISE NOTICE 'Test session created successfully: %', new_session_id;
  
  -- Clean up test session
  DELETE FROM game_sessions WHERE id = new_session_id;
  
  RAISE NOTICE 'Test session cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert FAILED: % %', SQLERRM, SQLSTATE;
END $$;
*/

-- =========================================================
-- EXPECTED RESULTS
-- =========================================================
-- If everything is working:
-- 1. Table exists: true
-- 2. RLS enabled: true
-- 3. 4 policies visible (student insert/update/select, teacher select)
-- 4. Student has INSERT/UPDATE/SELECT permissions: true
-- 5. Sessions are being created (count > 0)
--
-- If there's a problem:
-- - RLS enabled but no policies → Students blocked
-- - Policies exist but student permissions = false → Policy logic wrong
-- - High incomplete_sessions count → endGameSession failing
-- =========================================================






















