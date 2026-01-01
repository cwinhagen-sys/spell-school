-- Create testpilot_code_usage table to track individual usage per user
-- This allows multiple teachers to use the same code with their own expiration dates
-- Run this in Supabase SQL Editor

-- 1. Create the new table
CREATE TABLE IF NOT EXISTS public.testpilot_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.testpilot_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code_id, user_id) -- Each user can only use a code once
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_testpilot_code_usage_user_id ON public.testpilot_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_testpilot_code_usage_code_id ON public.testpilot_code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_testpilot_code_usage_expires_at ON public.testpilot_code_usage(expires_at);

-- 3. Enable RLS
ALTER TABLE public.testpilot_code_usage ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Users can read their own usage records
CREATE POLICY "Users can read own testpilot code usage"
  ON public.testpilot_code_usage
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can do everything (for API operations)
-- This will be handled via service role key in the API

-- 5. Grant permissions
GRANT SELECT ON public.testpilot_code_usage TO authenticated;

-- 6. Migrate existing data from testpilot_codes to testpilot_code_usage
-- This creates usage records for all existing code redemptions
INSERT INTO public.testpilot_code_usage (code_id, user_id, used_at, expires_at)
SELECT 
  tc.id AS code_id,
  tc.used_by AS user_id,
  COALESCE(tc.used_at, NOW()) AS used_at,
  COALESCE(
    tc.expires_at,
    COALESCE(tc.used_at, NOW()) + INTERVAL '1 month'
  ) AS expires_at
FROM public.testpilot_codes tc
WHERE tc.used_by IS NOT NULL
  AND NOT EXISTS (
    -- Don't insert if record already exists
    SELECT 1 FROM public.testpilot_code_usage tcu
    WHERE tcu.code_id = tc.id AND tcu.user_id = tc.used_by
  );

-- 7. Add a comment to explain the table
COMMENT ON TABLE public.testpilot_code_usage IS 'Tracks individual usage of testpilot codes by each user, allowing multiple users per code with individual expiration dates';


