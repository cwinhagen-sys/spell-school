-- Upgrade bengt@gmail.com to PRO subscription
-- Run this in Supabase SQL Editor

UPDATE profiles
SET subscription_tier = 'pro'
WHERE email = 'bengt@gmail.com';

-- Verify the update
SELECT id, email, subscription_tier, role
FROM profiles
WHERE email = 'bengt@gmail.com';










