-- Add stripe_subscription_id column to profiles table for Stripe integration
-- Run this in Supabase SQL Editor

-- Add stripe_subscription_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for subscription management';



