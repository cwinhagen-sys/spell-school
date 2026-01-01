-- Fix test pilot status for c.winhagen@gmail.com RIGHT NOW
-- This script will link the code to your user and set everything correctly

-- Step 1: Get your user ID and update subscription
DO $$
DECLARE
  v_user_id UUID;
  v_code_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'c.winhagen@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email c.winhagen@gmail.com';
  END IF;

  -- Get the code ID
  SELECT id INTO v_code_id
  FROM testpilot_codes
  WHERE code = 'WINHAGEN2024'
  LIMIT 1;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Code WINHAGEN2024 not found';
  END IF;

  -- Update the code to link it to your user
  UPDATE testpilot_codes
  SET 
    used_by = v_user_id,
    used_at = COALESCE(used_at, NOW()),
    expires_at = COALESCE(expires_at, NOW() + INTERVAL '365 days'),
    current_uses = CASE 
      WHEN used_by IS NULL OR used_by != v_user_id THEN 1 
      ELSE current_uses 
    END,
    is_active = true
  WHERE id = v_code_id;

  -- Ensure your profile is set to pro WITHOUT stripe_subscription_id
  UPDATE profiles
  SET 
    subscription_tier = 'pro',
    stripe_subscription_id = NULL  -- CRITICAL: Must be NULL for test pilot
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Successfully linked code WINHAGEN2024 to user % and set subscription to pro', v_user_id;
END $$;

-- Step 2: Verify everything is correct
SELECT 
  'Profile Status' as check_type,
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN '✅ Correct (pro without stripe = test pilot)'
    WHEN p.subscription_tier != 'pro' THEN '❌ Wrong: subscription_tier is not pro'
    WHEN p.stripe_subscription_id IS NOT NULL THEN '❌ Wrong: stripe_subscription_id is set (should be NULL for test pilot)'
    ELSE '❌ Unknown issue'
  END as status
FROM profiles p
WHERE p.email = 'c.winhagen@gmail.com'

UNION ALL

SELECT 
  'Code Status' as check_type,
  'Code: ' || tpc.code as email,
  'Uses: ' || tpc.current_uses || '/' || tpc.max_uses as subscription_tier,
  'User: ' || COALESCE(p.email, 'NOT LINKED') as stripe_subscription_id,
  CASE 
    WHEN tpc.used_by IS NULL THEN '❌ Code not linked to any user'
    WHEN tpc.used_by != (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com') THEN '❌ Code linked to wrong user'
    WHEN tpc.used_at IS NULL THEN '❌ used_at is NULL'
    WHEN tpc.expires_at IS NULL THEN '⚠️ expires_at is NULL (will use fallback calculation)'
    WHEN tpc.expires_at < NOW() THEN '❌ Code has expired'
    WHEN tpc.expires_at > NOW() THEN '✅ Code is active'
    ELSE '❓ Unknown status'
  END as status
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.code = 'WINHAGEN2024';

-- Step 3: Show what getTestPilotInfo would see
SELECT 
  'Simulated getTestPilotInfo check' as check_type,
  p.email,
  p.subscription_tier || ' (stripe_subscription_id: ' || COALESCE(p.stripe_subscription_id::text, 'NULL') || ')' as subscription_tier,
  COALESCE(tpc.code, 'NO CODE FOUND') as stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier != 'pro' THEN '❌ Would return isTestPilot: false (not pro tier)'
    WHEN p.stripe_subscription_id IS NOT NULL THEN '❌ Would return isTestPilot: false (has stripe_subscription_id)'
    WHEN tpc.code IS NULL THEN '❌ Would return isTestPilot: false (no code linked to user)'
    WHEN tpc.used_at IS NULL THEN '⚠️ Would return isTestPilot: true but expiresAt: null (used_at is NULL)'
    WHEN tpc.expires_at < NOW() THEN '❌ Would return isTestPilot: false (expired)'
    WHEN tpc.expires_at > NOW() THEN '✅ Would return isTestPilot: true with expiresAt: ' || tpc.expires_at
    ELSE '❓ Unknown'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';



