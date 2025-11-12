-- Check what categories are allowed in the badges table
-- This will help us understand the constraint

-- 1. Check the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'badges' 
  AND column_name = 'category';

-- 2. Check for check constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'badges'::regclass 
  AND contype = 'c';

-- 3. Check existing badges to see what categories are used
SELECT DISTINCT category, COUNT(*) as count
FROM badges 
GROUP BY category 
ORDER BY category;

-- 4. Check if there are any existing badges
SELECT COUNT(*) as total_badges FROM badges;



