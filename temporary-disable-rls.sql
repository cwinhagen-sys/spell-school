-- Temporarily disable RLS for student_progress to test quiz functionality
-- WARNING: This is for testing only - re-enable RLS after testing!

-- Disable RLS temporarily
ALTER TABLE student_progress DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE student_progress IS 'RLS temporarily disabled for testing - RE-ENABLE AFTER TESTING!';














