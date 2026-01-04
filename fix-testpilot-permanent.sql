-- Permanently fix test pilot status for c.winhagen@gmail.com
-- This ensures the code is properly linked and won't get downgraded on login

DO $$
DECLARE
  v_user_id UUID;
  v_code_id UUID;
BEGIN
  -- Step 1: Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'c.winhagen@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email c.winhagen@gmail.com';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Step 2: Get the code ID
  SELECT id INTO v_code_id
  FROM testpilot_codes
  WHERE code = 'WINHAGEN2024'
  LIMIT 1;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Code WINHAGEN2024 not found';
  END IF;

  RAISE NOTICE 'Found code ID: %', v_code_id;

  -- Step 3: Update the code to link it to the user with proper timestamps
  UPDATE testpilot_codes
  SET 
    used_by = v_user_id,
    used_at = COALESCE(used_at, NOW()),
    -- Set expires_at to 1 year from now (or from used_at if it was set earlier)
    expires_at = COALESCE(
      GREATEST(expires_at, used_at + INTERVAL '365 days'),  -- Use the later of: existing expires_at or 1 year from used_at
      NOW() + INTERVAL '365 days'  -- If both are null, use 1 year from now
    ),
    current_uses = CASE 
      WHEN used_by IS NULL OR used_by != v_user_id THEN 1 
      ELSE GREATEST(current_uses, 1)  -- Ensure at least 1
    END,
    is_active = true
  WHERE id = v_code_id;

  RAISE NOTICE 'Updated code WINHAGEN2024 to link to user %', v_user_id;

  -- Step 4: CRITICAL: Set subscription_tier to 'pro' and stripe_subscription_id to NULL
  UPDATE profiles
  SET 
    subscription_tier = 'pro',
    stripe_subscription_id = NULL  -- MUST be NULL for test pilot - this is critical!
  WHERE id = v_user_id;

  RAISE NOTICE 'Updated profile to pro tier with NULL stripe_subscription_id';

  -- Step 5: Verify the fix
  RAISE NOTICE 'Verification:';
  RAISE NOTICE 'Profile: subscription_tier = %, stripe_subscription_id = %', 
    (SELECT subscription_tier FROM profiles WHERE id = v_user_id),
    (SELECT stripe_subscription_id FROM profiles WHERE id = v_user_id);
  RAISE NOTICE 'Code: used_by = %, used_at = %, expires_at = %',
    (SELECT used_by FROM testpilot_codes WHERE id = v_code_id),
    (SELECT used_at FROM testpilot_codes WHERE id = v_code_id),
    (SELECT expires_at FROM testpilot_codes WHERE id = v_code_id);

END $$;

-- Final verification query
SELECT 
  '=== PROFILE STATUS ===' as section,
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN '✅ CORRECT - Ready for test pilot check'
    WHEN p.subscription_tier != 'pro' THEN '❌ WRONG: subscription_tier is ' || p.subscription_tier
    WHEN p.stripe_subscription_id IS NOT NULL THEN '❌ WRONG: stripe_subscription_id is set (must be NULL)'
    ELSE '❓ UNKNOWN'
  END as status
FROM profiles p
WHERE p.email = 'c.winhagen@gmail.com'

UNION ALL

SELECT 
  '=== CODE STATUS ===' as section,
  'Code: ' || tpc.code,
  'Uses: ' || tpc.current_uses || '/' || tpc.max_uses,
  'User: ' || COALESCE(p.email, 'NOT LINKED'),
  CASE 
    WHEN tpc.used_by IS NULL THEN '❌ NOT LINKED to any user'
    WHEN tpc.used_by != (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com') THEN '❌ LINKED to wrong user'
    WHEN tpc.used_at IS NULL THEN '❌ used_at is NULL'
    WHEN tpc.expires_at IS NULL THEN '⚠️ expires_at is NULL'
    WHEN tpc.expires_at < NOW() THEN '❌ EXPIRED (expired ' || tpc.expires_at || ')'
    WHEN tpc.expires_at > NOW() THEN '✅ ACTIVE (expires ' || tpc.expires_at || ')'
    ELSE '❓ UNKNOWN'
  END as status
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.code = 'WINHAGEN2024'

UNION ALL

SELECT 
  '=== SIMULATED getTestPilotInfo() RESULT ===' as section,
  p.email,
  CASE 
    WHEN p.subscription_tier != 'pro' THEN 'Would return: isTestPilot = false (not pro tier)'
    WHEN p.stripe_subscription_id IS NOT NULL THEN 'Would return: isTestPilot = false (has stripe_subscription_id)'
    WHEN tpc.code IS NULL THEN 'Would return: isTestPilot = false (no code found)'
    WHEN tpc.used_at IS NULL THEN 'Would return: isTestPilot = true, expiresAt = null, usedAt = null'
    WHEN tpc.expires_at IS NULL THEN 'Would return: isTestPilot = true, expiresAt = calculated from used_at'
    WHEN tpc.expires_at < NOW() THEN 'Would return: isTestPilot = false (expired)'
    WHEN tpc.expires_at > NOW() THEN 'Would return: isTestPilot = true, expiresAt = ' || tpc.expires_at
    ELSE 'UNKNOWN'
  END as subscription_tier,
  CASE 
    WHEN tpc.expires_at IS NULL THEN 'expires_at is NULL'
    ELSE 'expires_at = ' || tpc.expires_at
  END as stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' 
     AND p.stripe_subscription_id IS NULL 
     AND tpc.code IS NOT NULL 
     AND tpc.used_at IS NOT NULL
     AND (tpc.expires_at IS NULL OR tpc.expires_at > NOW()) THEN '✅ Would pass test pilot check - user stays pro'
    ELSE '❌ Would fail test pilot check - user downgraded to free'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';



-- This ensures the code is properly linked and won't get downgraded on login

DO $$
DECLARE
  v_user_id UUID;
  v_code_id UUID;
BEGIN
  -- Step 1: Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'c.winhagen@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email c.winhagen@gmail.com';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Step 2: Get the code ID
  SELECT id INTO v_code_id
  FROM testpilot_codes
  WHERE code = 'WINHAGEN2024'
  LIMIT 1;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Code WINHAGEN2024 not found';
  END IF;

  RAISE NOTICE 'Found code ID: %', v_code_id;

  -- Step 3: Update the code to link it to the user with proper timestamps
  UPDATE testpilot_codes
  SET 
    used_by = v_user_id,
    used_at = COALESCE(used_at, NOW()),
    -- Set expires_at to 1 year from now (or from used_at if it was set earlier)
    expires_at = COALESCE(
      GREATEST(expires_at, used_at + INTERVAL '365 days'),  -- Use the later of: existing expires_at or 1 year from used_at
      NOW() + INTERVAL '365 days'  -- If both are null, use 1 year from now
    ),
    current_uses = CASE 
      WHEN used_by IS NULL OR used_by != v_user_id THEN 1 
      ELSE GREATEST(current_uses, 1)  -- Ensure at least 1
    END,
    is_active = true
  WHERE id = v_code_id;

  RAISE NOTICE 'Updated code WINHAGEN2024 to link to user %', v_user_id;

  -- Step 4: CRITICAL: Set subscription_tier to 'pro' and stripe_subscription_id to NULL
  UPDATE profiles
  SET 
    subscription_tier = 'pro',
    stripe_subscription_id = NULL  -- MUST be NULL for test pilot - this is critical!
  WHERE id = v_user_id;

  RAISE NOTICE 'Updated profile to pro tier with NULL stripe_subscription_id';

  -- Step 5: Verify the fix
  RAISE NOTICE 'Verification:';
  RAISE NOTICE 'Profile: subscription_tier = %, stripe_subscription_id = %', 
    (SELECT subscription_tier FROM profiles WHERE id = v_user_id),
    (SELECT stripe_subscription_id FROM profiles WHERE id = v_user_id);
  RAISE NOTICE 'Code: used_by = %, used_at = %, expires_at = %',
    (SELECT used_by FROM testpilot_codes WHERE id = v_code_id),
    (SELECT used_at FROM testpilot_codes WHERE id = v_code_id),
    (SELECT expires_at FROM testpilot_codes WHERE id = v_code_id);

END $$;

-- Final verification query
SELECT 
  '=== PROFILE STATUS ===' as section,
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN '✅ CORRECT - Ready for test pilot check'
    WHEN p.subscription_tier != 'pro' THEN '❌ WRONG: subscription_tier is ' || p.subscription_tier
    WHEN p.stripe_subscription_id IS NOT NULL THEN '❌ WRONG: stripe_subscription_id is set (must be NULL)'
    ELSE '❓ UNKNOWN'
  END as status
FROM profiles p
WHERE p.email = 'c.winhagen@gmail.com'

UNION ALL

SELECT 
  '=== CODE STATUS ===' as section,
  'Code: ' || tpc.code,
  'Uses: ' || tpc.current_uses || '/' || tpc.max_uses,
  'User: ' || COALESCE(p.email, 'NOT LINKED'),
  CASE 
    WHEN tpc.used_by IS NULL THEN '❌ NOT LINKED to any user'
    WHEN tpc.used_by != (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com') THEN '❌ LINKED to wrong user'
    WHEN tpc.used_at IS NULL THEN '❌ used_at is NULL'
    WHEN tpc.expires_at IS NULL THEN '⚠️ expires_at is NULL'
    WHEN tpc.expires_at < NOW() THEN '❌ EXPIRED (expired ' || tpc.expires_at || ')'
    WHEN tpc.expires_at > NOW() THEN '✅ ACTIVE (expires ' || tpc.expires_at || ')'
    ELSE '❓ UNKNOWN'
  END as status
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.code = 'WINHAGEN2024'

UNION ALL

SELECT 
  '=== SIMULATED getTestPilotInfo() RESULT ===' as section,
  p.email,
  CASE 
    WHEN p.subscription_tier != 'pro' THEN 'Would return: isTestPilot = false (not pro tier)'
    WHEN p.stripe_subscription_id IS NOT NULL THEN 'Would return: isTestPilot = false (has stripe_subscription_id)'
    WHEN tpc.code IS NULL THEN 'Would return: isTestPilot = false (no code found)'
    WHEN tpc.used_at IS NULL THEN 'Would return: isTestPilot = true, expiresAt = null, usedAt = null'
    WHEN tpc.expires_at IS NULL THEN 'Would return: isTestPilot = true, expiresAt = calculated from used_at'
    WHEN tpc.expires_at < NOW() THEN 'Would return: isTestPilot = false (expired)'
    WHEN tpc.expires_at > NOW() THEN 'Would return: isTestPilot = true, expiresAt = ' || tpc.expires_at
    ELSE 'UNKNOWN'
  END as subscription_tier,
  CASE 
    WHEN tpc.expires_at IS NULL THEN 'expires_at is NULL'
    ELSE 'expires_at = ' || tpc.expires_at
  END as stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' 
     AND p.stripe_subscription_id IS NULL 
     AND tpc.code IS NOT NULL 
     AND tpc.used_at IS NOT NULL
     AND (tpc.expires_at IS NULL OR tpc.expires_at > NOW()) THEN '✅ Would pass test pilot check - user stays pro'
    ELSE '❌ Would fail test pilot check - user downgraded to free'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';





