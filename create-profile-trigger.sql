-- Database trigger to automatically create profile when user signs up
-- This ensures profile is created even when email verification is enabled
-- Run this in Supabase SQL Editor

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
  -- Use ON CONFLICT to avoid errors if profile already exists
  INSERT INTO public.profiles (id, email, role, subscription_tier, name)
  VALUES (
    NEW.id,
    NEW.email,
    'teacher', -- Default to teacher (students are created by teachers)
    'free',    -- Default to free tier
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email) -- Use name from metadata or email
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Verify trigger was created
SELECT 'Profile auto-create trigger installed successfully' as status;






-- This ensures profile is created even when email verification is enabled
-- Run this in Supabase SQL Editor

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
  -- Use ON CONFLICT to avoid errors if profile already exists
  INSERT INTO public.profiles (id, email, role, subscription_tier, name)
  VALUES (
    NEW.id,
    NEW.email,
    'teacher', -- Default to teacher (students are created by teachers)
    'free',    -- Default to free tier
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email) -- Use name from metadata or email
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Verify trigger was created
SELECT 'Profile auto-create trigger installed successfully' as status;








