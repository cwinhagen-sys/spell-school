-- Atomisk XP increment funktion (race-safe!)
-- Förhindrar race conditions mellan game XP och quest XP

CREATE OR REPLACE FUNCTION increment_student_xp(
  p_student_id UUID,
  p_xp_delta INTEGER,
  p_game_type TEXT DEFAULT 'quest_completion'
)
RETURNS TABLE (
  student_id UUID,
  total_points INTEGER,
  games_played INTEGER,
  last_played_at TIMESTAMPTZ,
  last_game_type TEXT
) AS $$
DECLARE
  v_current_points INTEGER;
  v_current_games INTEGER;
BEGIN
  -- Try to UPDATE existing record (atomiskt!)
  UPDATE student_progress AS sp
  SET 
    total_points = sp.total_points + p_xp_delta,  -- INCREMENT (race-safe!)
    last_played_at = NOW(),
    last_game_type = p_game_type
    -- INTE games_played (bevaras!)
  WHERE sp.student_id = p_student_id
    AND sp.word_set_id IS NULL
    AND sp.homework_id IS NULL
  RETURNING 
    sp.student_id,
    sp.total_points,
    sp.games_played,
    sp.last_played_at,
    sp.last_game_type
  INTO 
    student_id,
    total_points,
    games_played,
    last_played_at,
    last_game_type;

  -- If UPDATE affected rows, return the result
  IF FOUND THEN
    RAISE NOTICE 'Incremented XP for student %: +% XP → % total', p_student_id, p_xp_delta, total_points;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If no record found, INSERT new record
  INSERT INTO student_progress (
    student_id,
    word_set_id,
    homework_id,
    total_points,
    games_played,
    last_played_at,
    last_game_type
  ) VALUES (
    p_student_id,
    NULL,
    NULL,
    p_xp_delta,  -- First quest, so just the delta
    0,           -- No games yet (quests don't count as games)
    NOW(),
    p_game_type
  )
  RETURNING 
    student_progress.student_id,
    student_progress.total_points,
    student_progress.games_played,
    student_progress.last_played_at,
    student_progress.last_game_type
  INTO 
    student_id,
    total_points,
    games_played,
    last_played_at,
    last_game_type;

  RAISE NOTICE 'Created new student_progress for %: % XP', p_student_id, total_points;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test query:
-- SELECT * FROM increment_student_xp(
--   'YOUR-USER-ID'::UUID,
--   75,
--   'quest_completion'
-- );

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_student_xp TO authenticated;

COMMENT ON FUNCTION increment_student_xp IS 'Atomically increment student XP (race-safe). Used for quest XP to prevent race conditions with game XP.';

