-- Simple check for badge constraints
-- Run each query separately

-- 1. Check existing categories
SELECT DISTINCT category, COUNT(*) as count
FROM badges 
GROUP BY category 
ORDER BY category;

-- 2. Check constraints on badges table
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'badges'::regclass 
  AND contype = 'c';



