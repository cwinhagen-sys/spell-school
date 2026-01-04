-- Diagnose test pilot issue for c.winhagen@gmail.com
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check user profile
SELECT 
  id,
  email,
  subscription_tier,
  stripe_subscription_id,
  created_at
FROM profiles
WHERE email = 'c.winhagen@gmail.com';

-- 2. Check the test pilot code WINHAGEN2024
SELECT 
  id,
  code,
  max_uses,
  current_uses,
  used_by,
  used_at,
  expires_at,
  is_active,
  notes,
  created_at
FROM testpilot_codes
WHERE code = 'WINHAGEN2024';

-- 3. Check if there's any test pilot code linked to this user
SELECT 
  tpc.id,
  tpc.code,
  tpc.used_by,
  tpc.used_at,
  tpc.expires_at,
  tpc.is_active,
  p.email as user_email,
  p.subscription_tier,
  p.stripe_subscription_id
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.used_by = (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com')
   OR tpc.code = 'WINHAGEN2024';

-- 4. Check what getTestPilotInfo would return (simulate the logic)
SELECT 
  p.id as user_id,
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN 'Would check test pilot codes'
    ELSE 'Not a test pilot candidate (has stripe_subscription_id or not pro)'
  END as test_pilot_check,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.used_at IS NULL THEN 'No used_at - would return isTestPilot: true, expiresAt: null'
    WHEN tpc.expires_at IS NULL THEN 'No expires_at - would calculate from used_at'
    WHEN tpc.expires_at > NOW() THEN 'Active test pilot'
    ELSE 'Expired test pilot'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';



-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check user profile
SELECT 
  id,
  email,
  subscription_tier,
  stripe_subscription_id,
  created_at
FROM profiles
WHERE email = 'c.winhagen@gmail.com';

-- 2. Check the test pilot code WINHAGEN2024
SELECT 
  id,
  code,
  max_uses,
  current_uses,
  used_by,
  used_at,
  expires_at,
  is_active,
  notes,
  created_at
FROM testpilot_codes
WHERE code = 'WINHAGEN2024';

-- 3. Check if there's any test pilot code linked to this user
SELECT 
  tpc.id,
  tpc.code,
  tpc.used_by,
  tpc.used_at,
  tpc.expires_at,
  tpc.is_active,
  p.email as user_email,
  p.subscription_tier,
  p.stripe_subscription_id
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.used_by = (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com')
   OR tpc.code = 'WINHAGEN2024';

-- 4. Check what getTestPilotInfo would return (simulate the logic)
SELECT 
  p.id as user_id,
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN 'Would check test pilot codes'
    ELSE 'Not a test pilot candidate (has stripe_subscription_id or not pro)'
  END as test_pilot_check,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.used_at IS NULL THEN 'No used_at - would return isTestPilot: true, expiresAt: null'
    WHEN tpc.expires_at IS NULL THEN 'No expires_at - would calculate from used_at'
    WHEN tpc.expires_at > NOW() THEN 'Active test pilot'
    ELSE 'Expired test pilot'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';





