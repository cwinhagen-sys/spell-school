-- Fix testpilot code expiration dates
-- This script updates all testpilot codes to have expires_at = used_at + 1 month
-- Run this in Supabase SQL Editor

-- Update all testpilot codes where expires_at is more than 1 month from used_at
-- or where expires_at is NULL but used_at exists
UPDATE testpilot_codes
SET expires_at = (used_at + INTERVAL '1 month')
WHERE used_at IS NOT NULL
  AND (
    -- Case 1: expires_at is NULL but used_at exists
    expires_at IS NULL
    OR
    -- Case 2: expires_at is more than 1 month from used_at (likely set to 1 year)
    expires_at > (used_at + INTERVAL '1 month' + INTERVAL '1 day')
  );

-- Verify the changes
SELECT 
  code,
  used_by,
  used_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'NULL (needs fixing)'
    WHEN expires_at <= used_at THEN 'Invalid (expires before used)'
    WHEN expires_at > (used_at + INTERVAL '1 month' + INTERVAL '1 day') THEN 'Too long (more than 1 month)'
    WHEN expires_at < (used_at + INTERVAL '1 month' - INTERVAL '1 day') THEN 'Too short (less than 1 month)'
    ELSE 'OK (approximately 1 month)'
  END AS status,
  EXTRACT(EPOCH FROM (expires_at - used_at)) / 86400 AS days_duration
FROM testpilot_codes
WHERE used_at IS NOT NULL
ORDER BY used_at DESC;


-- This script updates all testpilot codes to have expires_at = used_at + 1 month
-- Run this in Supabase SQL Editor

-- Update all testpilot codes where expires_at is more than 1 month from used_at
-- or where expires_at is NULL but used_at exists
UPDATE testpilot_codes
SET expires_at = (used_at + INTERVAL '1 month')
WHERE used_at IS NOT NULL
  AND (
    -- Case 1: expires_at is NULL but used_at exists
    expires_at IS NULL
    OR
    -- Case 2: expires_at is more than 1 month from used_at (likely set to 1 year)
    expires_at > (used_at + INTERVAL '1 month' + INTERVAL '1 day')
  );

-- Verify the changes
SELECT 
  code,
  used_by,
  used_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'NULL (needs fixing)'
    WHEN expires_at <= used_at THEN 'Invalid (expires before used)'
    WHEN expires_at > (used_at + INTERVAL '1 month' + INTERVAL '1 day') THEN 'Too long (more than 1 month)'
    WHEN expires_at < (used_at + INTERVAL '1 month' - INTERVAL '1 day') THEN 'Too short (less than 1 month)'
    ELSE 'OK (approximately 1 month)'
  END AS status,
  EXTRACT(EPOCH FROM (expires_at - used_at)) / 86400 AS days_duration
FROM testpilot_codes
WHERE used_at IS NOT NULL
ORDER BY used_at DESC;




