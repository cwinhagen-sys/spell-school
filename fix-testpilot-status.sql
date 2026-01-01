-- Fix test pilot status for c.winhagen@gmail.com
-- Run this in Supabase SQL Editor

-- Step 1: Find the user ID
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

  -- Get the code ID
  SELECT id INTO v_code_id
  FROM testpilot_codes
  WHERE code = 'WINHAGEN2024';

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Code WINHAGEN2024 not found';
  END IF;

  -- Update the code to mark it as used by this user
  -- Set expires_at to 1 year from now (or when it was used, if already used)
  UPDATE testpilot_codes
  SET 
    used_by = v_user_id,
    used_at = COALESCE(used_at, NOW()),
    expires_at = COALESCE(expires_at, NOW() + INTERVAL '365 days'),
    current_uses = CASE 
      WHEN used_by IS NULL THEN 1 
      ELSE current_uses 
    END
  WHERE id = v_code_id
    AND (used_by IS NULL OR used_by = v_user_id);

  -- Ensure user has pro tier (without stripe_subscription_id)
  UPDATE profiles
  SET 
    subscription_tier = 'pro',
    stripe_subscription_id = NULL  -- Important: must be NULL for test pilot
  WHERE id = v_user_id;

  RAISE NOTICE 'Updated test pilot status for user %', v_user_id;
END $$;

-- Step 2: Verify the fix
SELECT 
  p.email,
  p.subscription_tier,
  p.stripe_subscription_id,
  tpc.code,
  tpc.used_at,
  tpc.expires_at,
  CASE 
    WHEN tpc.expires_at > NOW() THEN 'Active (not expired)'
    ELSE 'Expired'
  END as status
FROM profiles p
LEFT JOIN testpilot_codes tpc ON tpc.used_by = p.id AND tpc.code = 'WINHAGEN2024'
WHERE p.email = 'c.winhagen@gmail.com';



