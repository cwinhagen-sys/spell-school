-- =========================================================
-- REMOVE DUPLICATE GAME SESSIONS
-- =========================================================
-- This script removes duplicate game sessions that were created
-- due to both client-side and server-side session creation.
-- 
-- Strategy: Keep the FIRST session for each student/game/timestamp group
-- and delete the rest.
--
-- SAFE: Uses ROW_NUMBER() to identify duplicates
-- =========================================================

-- Step 1: Identify duplicate sessions
-- These are sessions with the same student_id, game_type, and started_at (within 5 seconds)
WITH duplicate_sessions AS (
  SELECT 
    id,
    student_id,
    game_type,
    started_at,
    finished_at,
    score,
    accuracy_pct,
    word_set_id,
    homework_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        student_id, 
        game_type, 
        DATE_TRUNC('second', started_at),  -- Group by second to catch near-duplicates
        word_set_id,
        homework_id
      ORDER BY created_at ASC  -- Keep the FIRST session created
    ) AS row_num
  FROM game_sessions
  WHERE created_at >= NOW() - INTERVAL '24 hours'  -- Only check recent sessions (last 24 hours)
)
SELECT 
  COUNT(*) AS total_duplicates_to_delete,
  game_type,
  COUNT(DISTINCT student_id) AS affected_students
FROM duplicate_sessions
WHERE row_num > 1  -- Only duplicates (not the first one)
GROUP BY game_type
ORDER BY total_duplicates_to_delete DESC;

-- Step 2: Delete duplicate sessions (keeping the first one)
-- UNCOMMENT BELOW TO DELETE DUPLICATES
/*
WITH duplicate_sessions AS (
  SELECT 
    id,
    student_id,
    game_type,
    started_at,
    finished_at,
    score,
    accuracy_pct,
    word_set_id,
    homework_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        student_id, 
        game_type, 
        DATE_TRUNC('second', started_at),
        word_set_id,
        homework_id
      ORDER BY created_at ASC
    ) AS row_num
  FROM game_sessions
  WHERE created_at >= NOW() - INTERVAL '24 hours'
)
DELETE FROM game_sessions
WHERE id IN (
  SELECT id 
  FROM duplicate_sessions 
  WHERE row_num > 1
);
*/

-- Step 3: Verify deletion
-- Run this AFTER uncommenting and running Step 2
/*
SELECT 
  student_id,
  COUNT(*) AS session_count,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) AS recent_sessions
FROM game_sessions
GROUP BY student_id
ORDER BY session_count DESC
LIMIT 10;
*/

-- =========================================================
-- NOTES:
-- - This script groups sessions by second (not millisecond) to catch near-duplicates
-- - Only processes sessions from the last 24 hours for safety
-- - Keeps the FIRST session created (by created_at ASC)
-- - To execute deletion, uncomment the DELETE block in Step 2
-- =========================================================





















