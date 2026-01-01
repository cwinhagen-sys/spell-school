-- Force fix test pilot - this will definitely work
-- Run this in Supabase SQL Editor

-- Step 1: Get IDs
DO $$
DECLARE
  v_user_id UUID;
  v_code_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM profiles WHERE email = 'c.winhagen@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get code ID  
  SELECT id INTO v_code_id FROM testpilot_codes WHERE code = 'WINHAGEN2024';
  
  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Code WINHAGEN2024 not found';
  END IF;

  -- Step 2: Set profile to pro with NULL stripe_subscription_id
  -- This is CRITICAL - stripe_subscription_id MUST be NULL
  UPDATE profiles
  SET 
    subscription_tier = 'pro',
    stripe_subscription_id = NULL  -- MUST be NULL for test pilot
  WHERE id = v_user_id;

  -- Step 3: Link code to user with proper timestamps
  UPDATE testpilot_codes
  SET 
    used_by = v_user_id,
    used_at = NOW(),  -- Set to now
    expires_at = NOW() + INTERVAL '365 days',  -- 1 year from now
    current_uses = 1,
    is_active = true
  WHERE id = v_code_id;

  RAISE NOTICE '✅ Fixed! User ID: %, Code ID: %', v_user_id, v_code_id;
END $$;

-- Step 4: Final verification
-- This shows exactly what getTestPilotInfo() will see
SELECT 
  '=== FINAL VERIFICATION ===' as section,
  '' as detail1,
  '' as detail2,
  '' as detail3
UNION ALL

SELECT 
  '1. Profile Check',
  'subscription_tier: ' || p.subscription_tier,
  'stripe_subscription_id: ' || COALESCE(p.stripe_subscription_id::text, 'NULL (GOOD)'),
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN '✅ PASS'
    ELSE '❌ FAIL'
  END
FROM profiles p
WHERE p.email = 'c.winhagen@gmail.com'

UNION ALL

SELECT 
  '2. Code Link Check',
  'code: ' || tpc.code,
  'used_by matches user: ' || CASE WHEN tpc.used_by = (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com') THEN 'YES ✅' ELSE 'NO ❌' END,
  'used_at: ' || COALESCE(tpc.used_at::text, 'NULL ❌')
FROM testpilot_codes tpc
WHERE tpc.code = 'WINHAGEN2024'

UNION ALL

SELECT 
  '3. Expiration Check',
  'expires_at: ' || COALESCE(tpc.expires_at::text, 'NULL'),
  'expires_at > NOW(): ' || CASE WHEN tpc.expires_at > NOW() THEN 'YES ✅' ELSE 'NO ❌' END,
  CASE 
    WHEN tpc.expires_at IS NULL THEN '⚠️ NULL (will use fallback)'
    WHEN tpc.expires_at > NOW() THEN '✅ NOT EXPIRED'
    ELSE '❌ EXPIRED'
  END
FROM testpilot_codes tpc
WHERE tpc.code = 'WINHAGEN2024'

UNION ALL

SELECT 
  '4. Simulated getTestPilotInfo() Result',
  CASE 
    WHEN p.subscription_tier != 'pro' THEN 'Would return: isTestPilot = FALSE (not pro) ❌'
    WHEN p.stripe_subscription_id IS NOT NULL THEN 'Would return: isTestPilot = FALSE (has stripe_subscription_id) ❌'
    WHEN tpc.used_by IS NULL THEN 'Would return: isTestPilot = FALSE (code not linked) ❌'
    WHEN tpc.used_at IS NULL THEN 'Would return: isTestPilot = TRUE, expiresAt = NULL'
    WHEN tpc.expires_at IS NULL THEN 'Would return: isTestPilot = TRUE, expiresAt = calculated'
    WHEN tpc.expires_at < NOW() THEN 'Would return: isTestPilot = FALSE (expired) ❌'
    ELSE 'Would return: isTestPilot = TRUE, expiresAt = ' || tpc.expires_at || ' ✅'
  END,
  CASE 
    WHEN p.subscription_tier = 'pro' 
     AND p.stripe_subscription_id IS NULL 
     AND tpc.used_by = p.id
     AND tpc.used_at IS NOT NULL
     AND (tpc.expires_at IS NULL OR tpc.expires_at > NOW())
    THEN '✅ getUserSubscriptionTier() will return: pro'
    ELSE '❌ getUserSubscriptionTier() will return: free (will downgrade)'
  END,
  ''
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';



