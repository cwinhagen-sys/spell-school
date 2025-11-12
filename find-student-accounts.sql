-- Find student accounts
-- This will help us find actual student accounts to test with

-- 1. Get all users with their roles
SELECT 
  'All users' as info,
  u.id,
  u.email,
  u.created_at,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 2. Get only student accounts
SELECT 
  'Student accounts' as info,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.role = 'student'
ORDER BY u.created_at DESC;

-- 3. Get accounts without profiles (might be students)
SELECT 
  'Accounts without profiles' as info,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 4. Count by role
SELECT 
  'User count by role' as info,
  COALESCE(p.role, 'no_profile') as role,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
GROUP BY p.role
ORDER BY count DESC;



