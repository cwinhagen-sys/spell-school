-- Debug Class Codes
-- Run this to see all classes and their codes

-- 1. Check if classes have codes
SELECT 
  id,
  name,
  code,
  teacher_id,
  created_at
FROM public.classes
ORDER BY created_at DESC;

-- 2. Check if code column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'classes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Test the RPC function with a specific code
-- Replace 'YOUR_CODE' with the actual code you're trying to use
-- SELECT public.join_class_with_code('YOUR_CODE');

-- 4. Check class_students table for your user
-- Replace 'YOUR_USER_ID' with your actual user ID
-- SELECT * FROM class_students WHERE student_id = 'YOUR_USER_ID';


















