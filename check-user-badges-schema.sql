-- Check and fix user_badges table schema
-- This ensures the table has the correct column name: unlocked_at (not earned_at)

-- First, let's check what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_badges' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the table doesn't exist or has wrong schema, create/fix it
DO $$ 
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_badges') THEN
    -- Create table with correct schema
    CREATE TABLE public.user_badges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
      unlocked_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, badge_id)
    );
    
    RAISE NOTICE 'Created user_badges table with unlocked_at column';
  ELSE
    -- Table exists, check if it has earned_at instead of unlocked_at
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_badges' 
        AND column_name = 'earned_at' 
        AND table_schema = 'public'
    ) THEN
      -- Rename earned_at to unlocked_at
      ALTER TABLE public.user_badges RENAME COLUMN earned_at TO unlocked_at;
      RAISE NOTICE 'Renamed earned_at to unlocked_at';
    END IF;
    
    -- Ensure unlocked_at column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_badges' 
        AND column_name = 'unlocked_at' 
        AND table_schema = 'public'
    ) THEN
      -- Add unlocked_at column
      ALTER TABLE public.user_badges ADD COLUMN unlocked_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added unlocked_at column';
    END IF;
    
    -- Remove created_at column if it exists (we don't need it, unlocked_at is enough)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_badges' 
        AND column_name = 'created_at' 
        AND table_schema = 'public'
    ) THEN
      -- Don't drop it, just ignore it (safer for existing data)
      RAISE NOTICE 'created_at column exists but is not used by the app';
    END IF;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked_at ON public.user_badges(unlocked_at DESC);

-- Ensure RLS policies exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_badges' 
      AND policyname = 'Users can view their own badges'
  ) THEN
    CREATE POLICY "Users can view their own badges" 
      ON public.user_badges 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_badges' 
      AND policyname = 'Users can insert their own badges'
  ) THEN
    CREATE POLICY "Users can insert their own badges" 
      ON public.user_badges 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Show final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_badges' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

