-- =========================================================
-- FIX XP_EVENTS RLS POLICIES
-- =========================================================
-- Problem: Server (via API route) kan inte INSERT till xp_events
-- Lösning: Tillåt INSERT för authenticated users (via auth.uid())
-- =========================================================

-- Drop restrictive policies
DROP POLICY IF EXISTS xp_events_insert_own ON xp_events;
DROP POLICY IF EXISTS xp_events_insert_via_rpc ON xp_events;

-- Allow authenticated users to insert their own events
CREATE POLICY xp_events_insert_own ON xp_events
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Test: Try to insert an event as yourself
DO $$
DECLARE
  test_student_id UUID;
BEGIN
  -- Get current user (this will be the authenticated user when run from API)
  test_student_id := auth.uid();
  
  IF test_student_id IS NOT NULL THEN
    RAISE NOTICE 'Testing INSERT with student ID: %', test_student_id;
    
    INSERT INTO xp_events(id, student_id, kind, delta, created_at)
    VALUES (
      gen_random_uuid(),
      test_student_id,
      'rls_test',
      77,
      NOW()
    );
    
    RAISE NOTICE 'SUCCESS: INSERT test passed!';
  ELSE
    RAISE NOTICE 'No authenticated user (run this from API context)';
  END IF;
END $$;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'xp_events'
ORDER BY policyname;















