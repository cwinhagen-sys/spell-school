-- Delete a test user from Supabase
-- Run this in Supabase SQL Editor
-- Replace 'user-email@example.com' with the email you want to delete

-- Option 1: Delete user by email
-- This will delete the user from auth.users and cascade delete from profiles

-- First, get the user ID
DO $$
DECLARE
  user_id_to_delete uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO user_id_to_delete
  FROM auth.users
  WHERE email = 'user-email@example.com';
  
  -- Check if user exists
  IF user_id_to_delete IS NULL THEN
    RAISE NOTICE 'User not found with email: user-email@example.com';
  ELSE
    -- Delete from profiles first (if it exists)
    DELETE FROM public.profiles WHERE id = user_id_to_delete;
    
    -- Delete from auth.users (this will cascade delete related auth data)
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    
    RAISE NOTICE 'User deleted successfully: %', user_id_to_delete;
  END IF;
END $$;

-- Option 2: Delete all test users (use with caution!)
-- This will delete ALL users - only use for development/testing
-- Uncomment the lines below if you want to delete all users:

-- DELETE FROM public.profiles;
-- DELETE FROM auth.users;

-- Option 3: Delete user by ID (if you know the user ID)
-- Replace 'user-id-here' with the actual UUID
-- DELETE FROM public.profiles WHERE id = 'user-id-here';
-- DELETE FROM auth.users WHERE id = 'user-id-here';






-- Run this in Supabase SQL Editor
-- Replace 'user-email@example.com' with the email you want to delete

-- Option 1: Delete user by email
-- This will delete the user from auth.users and cascade delete from profiles

-- First, get the user ID
DO $$
DECLARE
  user_id_to_delete uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO user_id_to_delete
  FROM auth.users
  WHERE email = 'user-email@example.com';
  
  -- Check if user exists
  IF user_id_to_delete IS NULL THEN
    RAISE NOTICE 'User not found with email: user-email@example.com';
  ELSE
    -- Delete from profiles first (if it exists)
    DELETE FROM public.profiles WHERE id = user_id_to_delete;
    
    -- Delete from auth.users (this will cascade delete related auth data)
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    
    RAISE NOTICE 'User deleted successfully: %', user_id_to_delete;
  END IF;
END $$;

-- Option 2: Delete all test users (use with caution!)
-- This will delete ALL users - only use for development/testing
-- Uncomment the lines below if you want to delete all users:

-- DELETE FROM public.profiles;
-- DELETE FROM auth.users;

-- Option 3: Delete user by ID (if you know the user ID)
-- Replace 'user-id-here' with the actual UUID
-- DELETE FROM public.profiles WHERE id = 'user-id-here';
-- DELETE FROM auth.users WHERE id = 'user-id-here';








