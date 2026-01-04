-- Fix test pilot expiration for c.winhagen@gmail.com
-- This script will:
-- 1. Check current status
-- 2. Update expires_at to 1 year from used_at (or now if not used yet)
-- 3. Ensure subscription_tier is 'pro' and stripe_subscription_id is NULL

-- First, check current status
SELECT 
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.expires_at IS NULL THEN 'No expiration set'
    WHEN tpc.expires_at > NOW() THEN 'Active (expires ' || tpc.expires_at || ')'
    ELSE 'Expired (expired ' || tpc.expires_at || ')'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';

-- Update the code expiration to 1 year from when it was used (or 1 year from now if not used)
UPDATE testpilot_codes
SET expires_at = COALESCE(
  used_at + INTERVAL '365 days',  -- If used, set to 1 year from used_at
  NOW() + INTERVAL '365 days'     -- If not used, set to 1 year from now
)
WHERE code = 'WINHAGEN2024';

-- Ensure user has pro tier without stripe_subscription_id
UPDATE profiles
SET 
  subscription_tier = 'pro',
  stripe_subscription_id = NULL  -- Must be NULL for test pilot
WHERE email = 'c.winhagen@gmail.com'
  AND id IN (SELECT used_by FROM testpilot_codes WHERE code = 'WINHAGEN2024');

-- Verify the fix
SELECT 
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.expires_at IS NULL THEN 'No expiration set'
    WHEN tpc.expires_at > NOW() THEN 'Active (expires ' || tpc.expires_at || ')'
    ELSE 'Expired (expired ' || tpc.expires_at || ')'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';



-- This script will:
-- 1. Check current status
-- 2. Update expires_at to 1 year from used_at (or now if not used yet)
-- 3. Ensure subscription_tier is 'pro' and stripe_subscription_id is NULL

-- First, check current status
SELECT 
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.expires_at IS NULL THEN 'No expiration set'
    WHEN tpc.expires_at > NOW() THEN 'Active (expires ' || tpc.expires_at || ')'
    ELSE 'Expired (expired ' || tpc.expires_at || ')'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';

-- Update the code expiration to 1 year from when it was used (or 1 year from now if not used)
UPDATE testpilot_codes
SET expires_at = COALESCE(
  used_at + INTERVAL '365 days',  -- If used, set to 1 year from used_at
  NOW() + INTERVAL '365 days'     -- If not used, set to 1 year from now
)
WHERE code = 'WINHAGEN2024';

-- Ensure user has pro tier without stripe_subscription_id
UPDATE profiles
SET 
  subscription_tier = 'pro',
  stripe_subscription_id = NULL  -- Must be NULL for test pilot
WHERE email = 'c.winhagen@gmail.com'
  AND id IN (SELECT used_by FROM testpilot_codes WHERE code = 'WINHAGEN2024');

-- Verify the fix
SELECT 
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.expires_at IS NULL THEN 'No expiration set'
    WHEN tpc.expires_at > NOW() THEN 'Active (expires ' || tpc.expires_at || ')'
    ELSE 'Expired (expired ' || tpc.expires_at || ')'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';




