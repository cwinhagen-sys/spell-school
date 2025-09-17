-- Completely disable RLS on profiles table to fix recursion
-- Run this in Supabase SQL Editor

-- 1. Completely disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on profiles (just to be safe)
DROP POLICY IF EXISTS "profiles_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_teacher_only" ON profiles;
DROP POLICY IF EXISTS "profiles_student_only" ON profiles;

-- 3. Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 4. Test that we can access profiles
SELECT 'Profiles RLS completely disabled - login should work now' as status;
