-- Check test pilot status for c.winhagen@gmail.com
-- Run this in Supabase SQL Editor

-- First, get the user ID
SELECT id, email, subscription_tier, stripe_subscription_id
FROM profiles
WHERE email = 'c.winhagen@gmail.com';

-- Then check if the test pilot code was used by this user
-- (Replace USER_ID_HERE with the actual user ID from above)
SELECT 
  tpc.code,
  tpc.used_by,
  tpc.used_at,
  tpc.expires_at,
  tpc.is_active,
  tpc.current_uses,
  tpc.max_uses,
  p.email as user_email
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.code = 'WINHAGEN2024';

-- Check all test pilot codes used by this user
-- (Replace USER_ID_HERE with the actual user ID from above)
SELECT 
  tpc.code,
  tpc.used_by,
  tpc.used_at,
  tpc.expires_at,
  tpc.is_active,
  tpc.current_uses,
  tpc.max_uses
FROM testpilot_codes tpc
WHERE tpc.used_by = (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com')
ORDER BY tpc.used_at DESC;



