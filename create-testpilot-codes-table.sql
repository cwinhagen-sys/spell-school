-- Create testpilot_codes table for beta tester codes
-- Run this in Supabase SQL Editor

-- Create table for testpilot codes
CREATE TABLE IF NOT EXISTS public.testpilot_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT 1, -- How many times the code can be used
  current_uses INTEGER DEFAULT 0, -- How many times it's been used
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who created it
  notes TEXT -- Optional notes about the code
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_testpilot_codes_code ON public.testpilot_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_testpilot_codes_used_by ON public.testpilot_codes(used_by);

-- Enable RLS
ALTER TABLE public.testpilot_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active codes (for validation)
CREATE POLICY "Anyone can read active testpilot codes"
  ON public.testpilot_codes
  FOR SELECT
  USING (is_active = true);

-- Policy: Only service role can insert/update/delete (admin operations)
-- This will be done via API with service role key

-- Grant permissions
GRANT SELECT ON public.testpilot_codes TO authenticated;
GRANT SELECT ON public.testpilot_codes TO anon;

-- Example: Create a test code (run this separately if needed)
-- INSERT INTO public.testpilot_codes (code, max_uses, expires_at, notes)
-- VALUES ('BETA2024', 10, NOW() + INTERVAL '90 days', 'Beta tester code for 2024');






