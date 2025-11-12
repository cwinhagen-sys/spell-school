-- Get some student email addresses for testing
-- This will show us student accounts we can use for testing

-- 1. Get first 10 student accounts
SELECT 
  'Student accounts' as info,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.role = 'student'
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Get student accounts created recently
SELECT 
  'Recent students' as info,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.role = 'student'
  AND u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC
LIMIT 5;



