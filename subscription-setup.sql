-- Subscription Tier Setup
-- Add subscription_tier column to profiles table

-- Add subscription_tier column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro'));
  END IF;
END $$;

-- Update existing profiles to have 'free' as default
UPDATE profiles SET subscription_tier = 'free' WHERE subscription_tier IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);













