-- Simple diagnostic - run this first to see what's wrong
-- Run in Supabase SQL Editor

-- 1. Check your profile
SELECT 
  id,
  email,
  subscription_tier,
  stripe_subscription_id,
  created_at
FROM profiles
WHERE email = 'c.winhagen@gmail.com';

-- 2. Check the code
SELECT 
  id,
  code,
  used_by,
  used_at,
  expires_at,
  is_active,
  current_uses,
  max_uses
FROM testpilot_codes
WHERE code = 'WINHAGEN2024';

-- 3. Check if code is linked to your user
SELECT 
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  tpc.code,
  tpc.used_by,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.used_by = p.id THEN '✅ Code is linked to you'
    WHEN tpc.used_by IS NULL THEN '❌ Code is NOT linked to anyone'
    ELSE '❌ Code is linked to someone else'
  END as link_status
FROM profiles p
CROSS JOIN testpilot_codes tpc
WHERE p.email = 'c.winhagen@gmail.com'
  AND tpc.code = 'WINHAGEN2024';



