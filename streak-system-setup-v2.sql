-- Streak System Setup v2 - With Better Error Handling
-- Run this to update/fix the streak system

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.student_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_play_date DATE,
  streak_updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure RLS and policies
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own streak" ON public.student_streaks;
DROP POLICY IF EXISTS "Users can insert their own streak" ON public.student_streaks;
DROP POLICY IF EXISTS "Users can update their own streak" ON public.student_streaks;
DROP POLICY IF EXISTS "Users can delete their own streak" ON public.student_streaks;

CREATE POLICY "Users can view their own streak"
  ON public.student_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON public.student_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON public.student_streaks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streak"
  ON public.student_streaks FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Improved RPC with better error handling
CREATE OR REPLACE FUNCTION public.update_streak_after_game(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_streak_record RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_is_new_streak BOOLEAN := FALSE;
  v_streak_increased BOOLEAN := FALSE;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'error', 'user_id is required',
      'current_streak', 0,
      'show_animation', false
    );
  END IF;

  -- Get or create streak record
  SELECT * INTO v_streak_record
  FROM public.student_streaks
  WHERE user_id = p_user_id;

  IF v_streak_record IS NULL THEN
    -- First time playing ever - create new record
    INSERT INTO public.student_streaks (user_id, current_streak, longest_streak, last_play_date)
    VALUES (p_user_id, 1, 1, v_today)
    RETURNING * INTO v_streak_record;
    
    v_is_new_streak := TRUE;
    v_streak_increased := TRUE;
    
    RAISE NOTICE 'Created first-time streak record for user %', p_user_id;
  ELSE
    -- Check last play date
    IF v_streak_record.last_play_date = v_today THEN
      -- Already played today, no change
      v_new_streak := v_streak_record.current_streak;
      RAISE NOTICE 'User % already played today, no streak change', p_user_id;
    ELSIF v_streak_record.last_play_date = v_yesterday THEN
      -- Played yesterday, continue streak
      v_new_streak := v_streak_record.current_streak + 1;
      v_streak_increased := TRUE;
      
      UPDATE public.student_streaks
      SET 
        current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_play_date = v_today,
        streak_updated_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_streak_record;
      
      RAISE NOTICE 'User % continued streak from % to %', p_user_id, v_streak_record.current_streak, v_new_streak;
    ELSE
      -- Streak broken (missed a day), reset to 1
      v_new_streak := 1;
      v_is_new_streak := TRUE;
      v_streak_increased := TRUE;
      
      UPDATE public.student_streaks
      SET 
        current_streak = 1,
        last_play_date = v_today,
        streak_updated_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_streak_record;
      
      RAISE NOTICE 'User % streak broken and reset to 1', p_user_id;
    END IF;
  END IF;

  -- Return streak info with flags for UI
  RETURN json_build_object(
    'current_streak', v_streak_record.current_streak,
    'longest_streak', v_streak_record.longest_streak,
    'last_play_date', v_streak_record.last_play_date,
    'is_new_streak', v_is_new_streak,
    'streak_increased', v_streak_increased,
    'show_animation', v_streak_increased,
    'success', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_streak_after_game: %', SQLERRM;
    RETURN json_build_object(
      'error', SQLERRM,
      'current_streak', 0,
      'show_animation', false,
      'success', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Improved get_current_streak
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_streak_record RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_is_valid BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'error', 'user_id is required',
      'current_streak', 0,
      'longest_streak', 0,
      'is_valid', FALSE
    );
  END IF;

  SELECT * INTO v_streak_record
  FROM public.student_streaks
  WHERE user_id = p_user_id;

  IF v_streak_record IS NULL THEN
    RETURN json_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'is_valid', FALSE,
      'success', true
    );
  END IF;

  -- Check if streak is still valid (not broken)
  v_is_valid := (
    v_streak_record.last_play_date = v_today OR 
    v_streak_record.last_play_date = v_yesterday
  );

  -- If streak is broken but not updated, return 0
  IF NOT v_is_valid AND v_streak_record.current_streak > 0 THEN
    RETURN json_build_object(
      'current_streak', 0,
      'longest_streak', v_streak_record.longest_streak,
      'is_valid', FALSE,
      'was_broken', TRUE,
      'success', true
    );
  END IF;

  RETURN json_build_object(
    'current_streak', v_streak_record.current_streak,
    'longest_streak', v_streak_record.longest_streak,
    'is_valid', v_is_valid,
    'last_play_date', v_streak_record.last_play_date,
    'success', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in get_current_streak: %', SQLERRM;
    RETURN json_build_object(
      'error', SQLERRM,
      'current_streak', 0,
      'longest_streak', 0,
      'is_valid', FALSE,
      'success', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.update_streak_after_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_streak_after_game(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_streak(UUID) TO anon;

-- 6. Verify setup
SELECT 
  'Streak system v2 setup complete!' as message,
  COUNT(*) as policies_created
FROM pg_policies 
WHERE tablename = 'student_streaks';

















