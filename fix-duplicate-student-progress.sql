-- Fix Duplicate Global Progress Records
-- This script consolidates duplicate global progress records into a single record per student

-- Step 1: Identify and show duplicate records
SELECT 
  student_id,
  COUNT(*) as record_count,
  MAX(total_points) as max_points,
  MAX(games_played) as max_games,
  MAX(last_played_at) as last_activity
FROM student_progress
WHERE word_set_id IS NULL 
  AND homework_id IS NULL
  AND deleted_at IS NULL
GROUP BY student_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Step 2: For each student with duplicates, keep the record with highest total_points
-- and delete the others

-- Create a temporary table with the IDs to keep
CREATE TEMP TABLE progress_to_keep AS
SELECT DISTINCT ON (student_id)
  id as keep_id,
  student_id,
  total_points,
  games_played
FROM student_progress
WHERE word_set_id IS NULL 
  AND homework_id IS NULL
  AND deleted_at IS NULL
ORDER BY student_id, total_points DESC, games_played DESC, last_played_at DESC NULLS LAST;

-- Show what we're keeping
SELECT 
  ptk.student_id,
  ptk.total_points,
  ptk.games_played,
  p.username,
  p.email
FROM progress_to_keep ptk
JOIN profiles p ON ptk.student_id = p.id
ORDER BY ptk.total_points DESC;

-- Delete duplicate records (keeping the highest points record for each student)
DELETE FROM student_progress
WHERE id IN (
  SELECT sp.id
  FROM student_progress sp
  WHERE sp.word_set_id IS NULL 
    AND sp.homework_id IS NULL
    AND sp.deleted_at IS NULL
    AND sp.id NOT IN (SELECT keep_id FROM progress_to_keep)
);

-- Show results after cleanup
SELECT 
  student_id,
  COUNT(*) as record_count,
  MAX(total_points) as total_points,
  MAX(games_played) as games_played
FROM student_progress
WHERE word_set_id IS NULL 
  AND homework_id IS NULL
  AND deleted_at IS NULL
GROUP BY student_id
ORDER BY MAX(total_points) DESC;

-- Step 3: Add a unique constraint to prevent future duplicates
-- First drop if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_progress_global_unique'
  ) THEN
    ALTER TABLE student_progress DROP CONSTRAINT student_progress_global_unique;
  END IF;
END $$;

-- Create unique constraint for global progress records
-- This ensures only ONE global record per student
CREATE UNIQUE INDEX IF NOT EXISTS student_progress_global_unique
ON student_progress (student_id)
WHERE word_set_id IS NULL AND homework_id IS NULL AND deleted_at IS NULL;

-- Verify the constraint was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'student_progress' 
  AND indexname = 'student_progress_global_unique';

-- Final verification: Each student should have exactly 1 global progress record
SELECT 
  'Total students with global progress:' as description,
  COUNT(DISTINCT student_id) as count
FROM student_progress
WHERE word_set_id IS NULL 
  AND homework_id IS NULL
  AND deleted_at IS NULL
UNION ALL
SELECT 
  'Total global progress records:' as description,
  COUNT(*) as count
FROM student_progress
WHERE word_set_id IS NULL 
  AND homework_id IS NULL
  AND deleted_at IS NULL;

-- These two numbers should be equal!


















