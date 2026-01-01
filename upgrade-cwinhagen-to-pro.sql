-- Upgrade c.winhagen@gmail.com to PRO subscription
-- Run this in Supabase SQL Editor

UPDATE profiles
SET subscription_tier = 'pro',
    stripe_subscription_id = 'manual_upgrade'
WHERE email = 'c.winhagen@gmail.com';

-- Verify the update
SELECT id, email, subscription_tier, stripe_subscription_id, role
FROM profiles
WHERE email = 'c.winhagen@gmail.com';

