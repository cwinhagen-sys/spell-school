-- Create a testpilot code for c.winhagen@gmail.com
-- Run this in Supabase SQL Editor

-- Create a testpilot code (you can change the code to whatever you want)
INSERT INTO public.testpilot_codes (
  code,
  max_uses,
  expires_at,
  notes
) VALUES (
  'WINHAGEN2024',                    -- The code (use uppercase, you can change this)
  1,                                  -- Max uses (1 = one-time use)
  NOW() + INTERVAL '365 days',       -- Expires in 1 year (you can change this or set to NULL for no expiration)
  'Testpilot code for c.winhagen@gmail.com'
)
ON CONFLICT (code) DO NOTHING;

-- Verify the code was created
SELECT 
  code,
  max_uses,
  current_uses,
  expires_at,
  is_active,
  notes,
  created_at
FROM public.testpilot_codes
WHERE code = 'WINHAGEN2024';



