-- Check current profiles RLS policies
-- Run this in Supabase SQL Editor to see what policies exist

-- 1. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- 2. List all policies on profiles
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 3. Check if there are any policies on OTHER tables that query profiles
-- (These could also cause recursion)
SELECT 
  policyname,
  tablename,
  cmd,
  qual
FROM pg_policies
WHERE qual LIKE '%profiles%' 
   OR qual LIKE '%FROM profiles%'
   OR with_check LIKE '%profiles%'
   OR with_check LIKE '%FROM profiles%'
ORDER BY tablename, policyname;



