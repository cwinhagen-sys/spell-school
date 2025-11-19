-- Remove Orphaned Students (students without any active class)
-- This is useful when you've deleted all classes and want to clean up
-- Run this in Supabase SQL Editor

-- OPTION 1: Soft delete students without any active class_students relation
-- (Recommended - reversible)

UPDATE profiles
SET deleted_at = NOW()
WHERE role = 'student'
  AND id NOT IN (
    SELECT DISTINCT student_id 
    FROM class_students 
    WHERE deleted_at IS NULL
  )
  AND deleted_at IS NULL;

-- Verify what will be deleted (run this first to see who will be affected):
-- SELECT id, email, username, created_at
-- FROM profiles
-- WHERE role = 'student'
--   AND id NOT IN (
--     SELECT DISTINCT student_id 
--     FROM class_students 
--     WHERE deleted_at IS NULL
--   )
--   AND deleted_at IS NULL;

-- OPTION 2: Completely remove orphaned students
-- (Destructive - only use if you're sure!)
-- UNCOMMENT to use:

-- DELETE FROM user_badges WHERE user_id IN (
--   SELECT id FROM profiles
--   WHERE role = 'student'
--     AND id NOT IN (
--       SELECT DISTINCT student_id 
--       FROM class_students 
--       WHERE deleted_at IS NULL
--     )
-- );

-- DELETE FROM student_progress WHERE student_id IN (
--   SELECT id FROM profiles
--   WHERE role = 'student'
--     AND id NOT IN (
--       SELECT DISTINCT student_id 
--       FROM class_students 
--       WHERE deleted_at IS NULL
--     )
-- );

-- DELETE FROM student_streaks WHERE user_id IN (
--   SELECT id FROM profiles
--   WHERE role = 'student'
--     AND id NOT IN (
--       SELECT DISTINCT student_id 
--       FROM class_students 
--       WHERE deleted_at IS NULL
--     )
-- );

-- DELETE FROM daily_quest_progress WHERE user_id IN (
--   SELECT id FROM profiles
--   WHERE role = 'student'
--     AND id NOT IN (
--       SELECT DISTINCT student_id 
--       FROM class_students 
--       WHERE deleted_at IS NULL
--     )
-- );

-- DELETE FROM profiles
-- WHERE role = 'student'
--   AND id NOT IN (
--     SELECT DISTINCT student_id 
--     FROM class_students 
--     WHERE deleted_at IS NULL
--   );

-- OPTION 3: Remove specific students by email
-- (Use this if you know which students to remove)

-- Soft delete by email:
-- UPDATE profiles
-- SET deleted_at = NOW()
-- WHERE email IN ('student1@example.com', 'student2@example.com');

-- Hard delete by email (destructive):
-- DELETE FROM user_badges WHERE user_id IN (SELECT id FROM profiles WHERE email = 'student@example.com');
-- DELETE FROM student_progress WHERE student_id IN (SELECT id FROM profiles WHERE email = 'student@example.com');
-- DELETE FROM student_streaks WHERE user_id IN (SELECT id FROM profiles WHERE email = 'student@example.com');
-- DELETE FROM daily_quest_progress WHERE user_id IN (SELECT id FROM profiles WHERE email = 'student@example.com');
-- DELETE FROM class_students WHERE student_id IN (SELECT id FROM profiles WHERE email = 'student@example.com');
-- DELETE FROM profiles WHERE email = 'student@example.com';

-- Display summary of what was done
SELECT 
  'Soft-deleted students' as action,
  COUNT(*) as count
FROM profiles
WHERE role = 'student' AND deleted_at IS NOT NULL;





















