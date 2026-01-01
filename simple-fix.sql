-- Simple fix - run this after diagnose
-- This will fix everything in one go

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
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get code ID
  SELECT id INTO v_code_id
  FROM testpilot_codes
  WHERE code = 'WINHAGEN2024';

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Code WINHAGEN2024 not found';
  END IF;

  -- Link code to user
  UPDATE testpilot_codes
  SET 
    used_by = v_user_id,
    used_at = COALESCE(used_at, NOW()),
    expires_at = COALESCE(expires_at, NOW() + INTERVAL '365 days'),
    current_uses = 1,
    is_active = true
  WHERE id = v_code_id;

  -- Set profile to pro WITHOUT stripe_subscription_id
  UPDATE profiles
  SET 
    subscription_tier = 'pro',
    stripe_subscription_id = NULL
  WHERE id = v_user_id;

  RAISE NOTICE 'Fixed! User: %, Code linked: %', v_user_id, v_code_id;
END $$;

-- Verify
SELECT 
  'After fix - Profile:' as check_type,
  p.email,
  p.subscription_tier,
  COALESCE(p.stripe_subscription_id::text, 'NULL') as stripe_subscription_id,
  CASE 
    WHEN p.subscription_tier = 'pro' AND p.stripe_subscription_id IS NULL THEN '✅ GOOD'
    ELSE '❌ BAD'
  END as status
FROM profiles p
WHERE p.email = 'c.winhagen@gmail.com'

UNION ALL

SELECT 
  'After fix - Code:' as check_type,
  tpc.code,
  COALESCE(p.email, 'NOT LINKED') as subscription_tier,
  COALESCE(tpc.used_at::text, 'NULL') as stripe_subscription_id,
  CASE 
    WHEN tpc.used_by = (SELECT id FROM profiles WHERE email = 'c.winhagen@gmail.com') 
     AND tpc.used_at IS NOT NULL
     AND (tpc.expires_at IS NULL OR tpc.expires_at > NOW())
    THEN '✅ GOOD'
    ELSE '❌ BAD'
  END as status
FROM testpilot_codes tpc
LEFT JOIN profiles p ON p.id = tpc.used_by
WHERE tpc.code = 'WINHAGEN2024';



