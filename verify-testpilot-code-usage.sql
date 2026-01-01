-- Verify that testpilot_code_usage system is working correctly
-- Run this in Supabase SQL Editor after running create-testpilot-code-usage-table.sql

-- 1. Check that the table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'testpilot_code_usage'
ORDER BY ordinal_position;

-- 2. Check that existing data was migrated correctly
-- (Should show all existing testpilot code redemptions)
SELECT 
  tcu.id,
  tc.code,
  tcu.user_id,
  p.email AS user_email,
  tcu.used_at,
  tcu.expires_at,
  EXTRACT(EPOCH FROM (tcu.expires_at - tcu.used_at)) / 86400 AS days_valid,
  CASE 
    WHEN tcu.expires_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END AS status
FROM testpilot_code_usage tcu
JOIN testpilot_codes tc ON tc.id = tcu.code_id
LEFT JOIN profiles p ON p.id = tcu.user_id
ORDER BY tcu.used_at DESC;

-- 3. Verify that each user has their own expires_at
-- (If multiple users used the same code, they should have different expires_at dates)
SELECT 
  tc.code,
  COUNT(DISTINCT tcu.user_id) AS unique_users,
  COUNT(*) AS total_usage_records,
  MIN(tcu.used_at) AS first_usage,
  MAX(tcu.used_at) AS last_usage,
  MIN(tcu.expires_at) AS earliest_expires,
  MAX(tcu.expires_at) AS latest_expires
FROM testpilot_codes tc
LEFT JOIN testpilot_code_usage tcu ON tcu.code_id = tc.id
WHERE tc.used_by IS NOT NULL OR EXISTS (SELECT 1 FROM testpilot_code_usage WHERE code_id = tc.id)
GROUP BY tc.code, tc.id
HAVING COUNT(DISTINCT tcu.user_id) > 0
ORDER BY unique_users DESC;

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'testpilot_code_usage';

-- 5. Summary: Count records and check data integrity
SELECT 
  'Total usage records' AS metric,
  COUNT(*)::text AS value
FROM testpilot_code_usage
UNION ALL
SELECT 
  'Unique users' AS metric,
  COUNT(DISTINCT user_id)::text AS value
FROM testpilot_code_usage
UNION ALL
SELECT 
  'Unique codes used' AS metric,
  COUNT(DISTINCT code_id)::text AS value
FROM testpilot_code_usage
UNION ALL
SELECT 
  'Active (not expired)' AS metric,
  COUNT(*)::text AS value
FROM testpilot_code_usage
WHERE expires_at > NOW()
UNION ALL
SELECT 
  'Expired' AS metric,
  COUNT(*)::text AS value
FROM testpilot_code_usage
WHERE expires_at <= NOW();


