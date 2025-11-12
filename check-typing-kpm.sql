-- Check Typing Challenge KPM data in game_sessions
-- Run this in Supabase SQL Editor

SELECT 
  id,
  student_id,
  game_type,
  duration_sec,
  accuracy_pct,
  details->>'kpm' as kpm,
  details->>'total_chars' as total_chars,
  details->>'words_typed' as words_typed,
  details->>'total_words' as total_words,
  finished_at,
  created_at
FROM game_sessions
WHERE game_type = 'typing'
ORDER BY finished_at DESC
LIMIT 20;



