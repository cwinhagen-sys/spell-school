-- Check if last_active column exists in profiles table
-- Run this in Supabase SQL Editor

-- 1. Check if last_active column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'last_active';

-- 2. If column doesn't exist, create it
-- (Uncomment the lines below if needed)
-- ALTER TABLE profiles ADD COLUMN last_active TIMESTAMP WITH TIME ZONE;

-- 3. Check current profiles data
SELECT 
  id, 
  email, 
  role, 
  last_active,
  created_at,
  updated_at
FROM profiles 
WHERE role = 'student'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if any students have last_active data
SELECT 
  COUNT(*) as total_students,
  COUNT(last_active) as students_with_last_active,
  COUNT(*) - COUNT(last_active) as students_without_last_active
FROM profiles 
WHERE role = 'student';
