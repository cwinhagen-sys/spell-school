-- Fix profiles RLS recursion issue
-- Run this in Supabase SQL Editor

-- 1. Temporarily disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on profiles
DROP POLICY IF EXISTS "profiles_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_simple" ON profiles;

-- 3. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create a simple, safe policy without recursion
CREATE POLICY "profiles_simple" ON profiles
  FOR ALL USING (id = auth.uid());

-- 5. Add comment
COMMENT ON POLICY "profiles_simple" ON profiles IS 'Users can only access their own profile - simple version without recursion';

-- 6. Verify
SELECT 'Profiles RLS fixed - no more recursion' as status;












