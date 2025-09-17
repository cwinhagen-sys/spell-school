-- GDPR Complete Student Data Deletion Script
-- This script removes ALL student personal data from the database
-- Run this in Supabase SQL Editor for complete GDPR compliance

-- IMPORTANT: This script will permanently delete ALL student data
-- Make sure you have backups if needed for legal/audit purposes

-- Step 1: Delete all student-related data in correct order (respecting foreign keys)

-- Delete game scores (no dependencies)
DELETE FROM game_scores WHERE student_id = $1;

-- Delete student progress (no dependencies)  
DELETE FROM student_progress WHERE student_id = $1;

-- Delete class memberships
DELETE FROM class_students WHERE student_id = $1;

-- Delete assigned word sets for this student
DELETE FROM assigned_word_sets WHERE student_id = $1;

-- Delete the student profile (this will also trigger auth.users deletion)
DELETE FROM profiles WHERE id = $1 AND role = 'student';

-- Step 2: Verify complete deletion
-- Run this query to confirm all data is removed:
SELECT 
  'profiles' as table_name, COUNT(*) as remaining_records 
FROM profiles WHERE id = $1
UNION ALL
SELECT 
  'student_progress', COUNT(*) 
FROM student_progress WHERE student_id = $1
UNION ALL
SELECT 
  'game_scores', COUNT(*) 
FROM game_scores WHERE student_id = $1
UNION ALL
SELECT 
  'class_students', COUNT(*) 
FROM class_students WHERE student_id = $1
UNION ALL
SELECT 
  'assigned_word_sets', COUNT(*) 
FROM assigned_word_sets WHERE student_id = $1;

-- Expected result: All counts should be 0

-- Step 3: Optional - Clean up orphaned data
-- Remove word sets that no longer have any students assigned
DELETE FROM word_sets 
WHERE id NOT IN (
  SELECT DISTINCT word_set_id 
  FROM assigned_word_sets 
  WHERE word_set_id IS NOT NULL
) 
AND teacher_id IS NOT NULL;

-- Remove classes that no longer have any students
DELETE FROM classes 
WHERE id NOT IN (
  SELECT DISTINCT class_id 
  FROM class_students 
  WHERE class_id IS NOT NULL
) 
AND teacher_id IS NOT NULL;

-- Step 4: Log the deletion (for audit purposes)
-- You might want to log this deletion in a separate audit table
-- This is optional but recommended for compliance

-- Example audit log (uncomment if you want to track deletions):
-- INSERT INTO audit_log (action, table_name, record_id, deleted_at, deleted_by)
-- VALUES ('DELETE', 'student_profile', $1, NOW(), current_user);

-- Note: Replace $1 with the actual student UUID when running this script
-- Example: Replace $1 with '123e4567-e89b-12d3-a456-426614174000'
