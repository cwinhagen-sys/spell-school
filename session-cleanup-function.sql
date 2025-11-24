-- Cleanup function for expired sessions
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Session Mode is completely separate from Spell School's permanent data.
-- All session data (progress, quiz responses, participants) is TEMPORARY and will be
-- permanently deleted when sessions expire. This data does NOT affect:
-- - Student's permanent progress in Spell School
-- - Teacher's word sets or homeworks
-- - Any other permanent Spell School data

-- Function to delete sessions that expired more than 1 day ago
-- CASCADE DELETE will automatically remove all related data:
-- - session_participants (via ON DELETE CASCADE)
-- - session_progress (via ON DELETE CASCADE)  
-- - session_quiz_responses (via ON DELETE CASCADE)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions where due_date + 1 day has passed
  -- All related data will be automatically deleted via CASCADE
  DELETE FROM sessions
  WHERE due_date + INTERVAL '1 day' < NOW()
  AND is_active = true;
END;
$$;

-- Create a scheduled job (requires pg_cron extension)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- You may need to enable it via Supabase dashboard or contact support

-- Schedule cleanup to run daily at 2 AM UTC
-- SELECT cron.schedule(
--   'cleanup-expired-sessions',
--   '0 2 * * *',
--   $$SELECT cleanup_expired_sessions()$$
-- );

-- Alternative: Manual cleanup can be triggered via API route
-- We'll create an API route that calls this function

