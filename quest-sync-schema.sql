-- Quest Sync Database Schema and Functions
-- This file sets up the atomic, idempotent quest synchronization system

-- 1. Create quest_event_applied table for idempotency tracking
CREATE TABLE IF NOT EXISTS quest_event_applied (
  idempotency_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create daily_quest_progress table for atomic quest tracking
CREATE TABLE IF NOT EXISTS daily_quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  quest_date DATE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NULL,
  xp_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, quest_id, quest_date)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_event_applied_user_id ON quest_event_applied(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_event_applied_applied_at ON quest_event_applied(applied_at);
CREATE INDEX IF NOT EXISTS idx_daily_quest_progress_user_date ON daily_quest_progress(user_id, quest_date);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE quest_event_applied ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quest_progress ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view their own quest events" ON quest_event_applied
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own quest progress" ON daily_quest_progress
  FOR SELECT USING (auth.uid() = user_id);

-- 6. RPC Function: Upsert quest progress
CREATE OR REPLACE FUNCTION upsert_quest_progress(
  p_user_id UUID,
  p_quest_id TEXT,
  p_quest_date DATE,
  p_progress_delta INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Upsert quest progress
  INSERT INTO daily_quest_progress (
    user_id, quest_id, quest_date, progress, updated_at
  )
  VALUES (
    p_user_id, p_quest_id, p_quest_date, p_progress_delta, NOW()
  )
  ON CONFLICT (user_id, quest_id, quest_date)
  DO UPDATE SET
    progress = daily_quest_progress.progress + p_progress_delta,
    updated_at = NOW()
  RETURNING json_build_object(
    'user_id', user_id,
    'quest_id', quest_id,
    'quest_date', quest_date,
    'progress', progress,
    'completed', completed_at IS NOT NULL
  ) INTO result;

  RETURN result;
END;
$$;

-- 7. RPC Function: Complete quest and award XP atomically
CREATE OR REPLACE FUNCTION complete_quest_and_award_xp(
  p_user_id UUID,
  p_quest_id TEXT,
  p_quest_date DATE,
  p_xp_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest_row RECORD;
  xp_awarded BOOLEAN := FALSE;
  result JSON;
BEGIN
  -- Get current quest state
  SELECT * INTO quest_row
  FROM daily_quest_progress
  WHERE user_id = p_user_id 
    AND quest_id = p_quest_id 
    AND quest_date = p_quest_date;

  -- If quest exists and XP not yet awarded
  IF quest_row IS NOT NULL AND NOT quest_row.xp_awarded THEN
    -- Award XP to global progress record
    INSERT INTO student_progress (
      student_id, word_set_id, homework_id, total_points, games_played, last_played_at, last_game_type
    )
    VALUES (
      p_user_id, NULL, NULL, p_xp_amount, 0, NOW(), 'daily_quest'
    )
    ON CONFLICT (student_id, word_set_id, homework_id)
    DO UPDATE SET
      total_points = student_progress.total_points + p_xp_amount,
      last_played_at = NOW(),
      last_game_type = 'daily_quest';

    -- Mark quest as completed and XP awarded
    UPDATE daily_quest_progress
    SET 
      completed_at = NOW(),
      xp_awarded = TRUE,
      updated_at = NOW()
    WHERE user_id = p_user_id 
      AND quest_id = p_quest_id 
      AND quest_date = p_quest_date;

    xp_awarded := TRUE;
  END IF;

  -- Return result
  SELECT json_build_object(
    'user_id', p_user_id,
    'quest_id', p_quest_id,
    'quest_date', p_quest_date,
    'xp_awarded', xp_awarded,
    'xp_amount', CASE WHEN xp_awarded THEN p_xp_amount ELSE 0 END,
    'completed', TRUE
  ) INTO result;

  RETURN result;
END;
$$;

-- 8. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION upsert_quest_progress(UUID, TEXT, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_quest_and_award_xp(UUID, TEXT, DATE, INTEGER) TO authenticated;

-- 9. Cleanup function for old events (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_quest_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM quest_event_applied
  WHERE applied_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant cleanup permission to service role
GRANT EXECUTE ON FUNCTION cleanup_old_quest_events() TO service_role;
