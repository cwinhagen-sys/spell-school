-- Update teacher subscription tiers for testing
-- Run this in Supabase SQL Editor

-- Update bengt@gmail.com to Premium
UPDATE profiles
SET subscription_tier = 'premium'
WHERE email = 'bengt@gmail.com' AND role = 'teacher';

-- Update c.winhagen@gmail.com to Pro
UPDATE profiles
SET subscription_tier = 'pro'
WHERE email = 'c.winhagen@gmail.com' AND role = 'teacher';

-- Verify the updates
SELECT 
  email,
  role,
  subscription_tier,
  created_at
FROM profiles
WHERE email IN ('bengt@gmail.com', 'c.winhagen@gmail.com')
  AND role = 'teacher';

