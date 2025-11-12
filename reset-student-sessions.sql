-- =========================================================
-- RESET GAME SESSIONS FOR SPECIFIC STUDENT
-- =========================================================
-- This script will delete all game sessions for a specific student
-- and reset their progress to allow for clean testing
-- =========================================================

-- STEP 1: View current sessions for student
SELECT 
  id,
  game_type,
  score,
  accuracy_pct,
  started_at,
  finished_at,
  created_at
FROM game_sessions
WHERE student_id = '31a6c518-7d46-4fd4-a650-9ed7f16d3baa'
ORDER BY created_at DESC;

-- STEP 2: View current progress
SELECT 
  id,
  total_points,
  games_played,
  last_played_at,
  last_game_type
FROM student_progress
WHERE student_id = '31a6c518-7d46-4fd4-a650-9ed7f16d3baa'
  AND word_set_id IS NULL
  AND homework_id IS NULL;

-- STEP 3: DELETE all game sessions (UNCOMMENT TO EXECUTE)
/*
DELETE FROM game_sessions
WHERE student_id = '31a6c518-7d46-4fd4-a650-9ed7f16d3baa';
*/

-- STEP 4: RESET progress (UNCOMMENT TO EXECUTE)
/*
UPDATE student_progress
SET 
  total_points = 0,
  games_played = 0,
  last_played_at = NOW(),
  last_game_type = NULL
WHERE student_id = '31a6c518-7d46-4fd4-a650-9ed7f16d3baa'
  AND word_set_id IS NULL
  AND homework_id IS NULL;
*/

-- STEP 5: Verify deletion
SELECT 
  'Game sessions count' as metric,
  COUNT(*) as value
FROM game_sessions
WHERE student_id = '31a6c518-7d46-4fd4-a650-9ed7f16d3baa'
UNION ALL
SELECT 
  'Total XP' as metric,
  total_points as value
FROM student_progress
WHERE student_id = '31a6c518-7d46-4fd4-a650-9ed7f16d3baa'
  AND word_set_id IS NULL
  AND homework_id IS NULL;















