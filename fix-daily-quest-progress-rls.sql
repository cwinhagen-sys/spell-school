-- Fix RLS policies for daily_quest_progress table
-- This table is missing INSERT and UPDATE policies

-- Ensure RLS is enabled
ALTER TABLE public.daily_quest_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own quest progress" ON public.daily_quest_progress;
DROP POLICY IF EXISTS "Users can insert their own quest progress" ON public.daily_quest_progress;
DROP POLICY IF EXISTS "Users can update their own quest progress" ON public.daily_quest_progress;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own quest progress" 
  ON public.daily_quest_progress
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quest progress" 
  ON public.daily_quest_progress
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quest progress" 
  ON public.daily_quest_progress
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'daily_quest_progress'
ORDER BY policyname;























