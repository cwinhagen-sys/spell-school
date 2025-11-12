-- Streak System - Complete Database Setup
-- Tracks daily login + play streaks with proper persistence

-- 1. Create streak tracking table
CREATE TABLE IF NOT EXISTS public.student_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_play_date DATE,
  streak_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own streak" ON public.student_streaks;
DROP POLICY IF EXISTS "Users can insert their own streak" ON public.student_streaks;
DROP POLICY IF EXISTS "Users can update their own streak" ON public.student_streaks;

CREATE POLICY "Users can view their own streak"
  ON public.student_streaks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON public.student_streaks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON public.student_streaks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_student_streaks_user_id ON public.student_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_student_streaks_last_play_date ON public.student_streaks(last_play_date DESC);

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_student_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_streaks_updated_at ON public.student_streaks;
CREATE TRIGGER trg_student_streaks_updated_at
  BEFORE UPDATE ON public.student_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_streaks_updated_at();

-- 6. Create RPC function to update streak (atomic operation)
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
  -- Get or create streak record
  SELECT * INTO v_streak_record
  FROM public.student_streaks
  WHERE user_id = p_user_id;

  IF v_streak_record IS NULL THEN
    -- First time playing ever
    INSERT INTO public.student_streaks (user_id, current_streak, longest_streak, last_play_date)
    VALUES (p_user_id, 1, 1, v_today)
    RETURNING * INTO v_streak_record;
    
    v_is_new_streak := TRUE;
    v_streak_increased := TRUE;
  ELSE
    -- Check last play date
    IF v_streak_record.last_play_date = v_today THEN
      -- Already played today, no change
      v_new_streak := v_streak_record.current_streak;
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
    END IF;
  END IF;

  -- Return streak info with flags for UI
  RETURN json_build_object(
    'current_streak', v_streak_record.current_streak,
    'longest_streak', v_streak_record.longest_streak,
    'last_play_date', v_streak_record.last_play_date,
    'is_new_streak', v_is_new_streak,
    'streak_increased', v_streak_increased,
    'show_animation', v_streak_increased
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get current streak (fast read)
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_streak_record RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_is_valid BOOLEAN;
BEGIN
  SELECT * INTO v_streak_record
  FROM public.student_streaks
  WHERE user_id = p_user_id;

  IF v_streak_record IS NULL THEN
    RETURN json_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'is_valid', FALSE
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
      'was_broken', TRUE
    );
  END IF;

  RETURN json_build_object(
    'current_streak', v_streak_record.current_streak,
    'longest_streak', v_streak_record.longest_streak,
    'is_valid', v_is_valid,
    'last_play_date', v_streak_record.last_play_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_streak_after_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_streak_after_game(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_streak(UUID) TO anon;

-- 9. Add DELETE policy (needed for testing)
DROP POLICY IF EXISTS "Users can delete their own streak" ON public.student_streaks;
CREATE POLICY "Users can delete their own streak"
  ON public.student_streaks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Done! Now verify the setup
SELECT 
  'Streak system setup complete!' as message,
  COUNT(*) as policies_created
FROM pg_policies 
WHERE tablename = 'student_streaks';

