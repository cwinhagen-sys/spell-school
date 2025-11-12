-- Fix profiles RLS infinite recursion - COMPLETE FIX
-- Run this in Supabase SQL Editor
-- This will fix the "infinite recursion detected in policy for relation profiles" error

-- 1. Drop ALL existing policies on profiles (comprehensive list)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_own_only" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_teacher_only" ON profiles;
DROP POLICY IF EXISTS "profiles_student_only" ON profiles;

-- 2. Temporarily disable RLS to break any potential loops
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLE, NON-RECURSIVE policies
-- These policies only check auth.uid() which never queries profiles table
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Verify policies are created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Test message
SELECT 'Profiles RLS fixed - no recursion! Policies only use auth.uid() which never queries profiles.' as status;



