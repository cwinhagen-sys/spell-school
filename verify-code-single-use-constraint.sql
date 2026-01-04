-- Verify that users cannot use the same code multiple times
-- Run this in Supabase SQL Editor

-- 1. Check that UNIQUE constraint exists on (code_id, user_id)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.testpilot_code_usage'::regclass
  AND contype = 'u'  -- 'u' = UNIQUE constraint
ORDER BY conname;

-- 2. Check current unique constraints on the table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'testpilot_code_usage'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- 3. Test: Try to find any duplicate entries (should return 0 rows)
-- If this returns any rows, it means there's a problem
SELECT 
  code_id,
  user_id,
  COUNT(*) AS duplicate_count
FROM testpilot_code_usage
GROUP BY code_id, user_id
HAVING COUNT(*) > 1;

-- 4. Show all usage records grouped by code and user
-- Each (code_id, user_id) combination should appear only once
SELECT 
  tc.code,
  p.email AS user_email,
  COUNT(*) AS usage_count,
  MIN(tcu.used_at) AS first_used,
  MAX(tcu.used_at) AS last_used
FROM testpilot_code_usage tcu
JOIN testpilot_codes tc ON tc.id = tcu.code_id
LEFT JOIN profiles p ON p.id = tcu.user_id
GROUP BY tc.code, p.email, tcu.code_id, tcu.user_id
ORDER BY tc.code, p.email;

-- 5. If you want to test the constraint manually (uncomment to run):
-- This SHOULD fail with a UNIQUE constraint violation error
/*
INSERT INTO testpilot_code_usage (code_id, user_id, used_at, expires_at)
SELECT 
  code_id,
  user_id,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM testpilot_code_usage
LIMIT 1;
*/


-- Run this in Supabase SQL Editor

-- 1. Check that UNIQUE constraint exists on (code_id, user_id)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.testpilot_code_usage'::regclass
  AND contype = 'u'  -- 'u' = UNIQUE constraint
ORDER BY conname;

-- 2. Check current unique constraints on the table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'testpilot_code_usage'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- 3. Test: Try to find any duplicate entries (should return 0 rows)
-- If this returns any rows, it means there's a problem
SELECT 
  code_id,
  user_id,
  COUNT(*) AS duplicate_count
FROM testpilot_code_usage
GROUP BY code_id, user_id
HAVING COUNT(*) > 1;

-- 4. Show all usage records grouped by code and user
-- Each (code_id, user_id) combination should appear only once
SELECT 
  tc.code,
  p.email AS user_email,
  COUNT(*) AS usage_count,
  MIN(tcu.used_at) AS first_used,
  MAX(tcu.used_at) AS last_used
FROM testpilot_code_usage tcu
JOIN testpilot_codes tc ON tc.id = tcu.code_id
LEFT JOIN profiles p ON p.id = tcu.user_id
GROUP BY tc.code, p.email, tcu.code_id, tcu.user_id
ORDER BY tc.code, p.email;

-- 5. If you want to test the constraint manually (uncomment to run):
-- This SHOULD fail with a UNIQUE constraint violation error
/*
INSERT INTO testpilot_code_usage (code_id, user_id, used_at, expires_at)
SELECT 
  code_id,
  user_id,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM testpilot_code_usage
LIMIT 1;
*/




