-- Check existing assignments in database
-- Run this in Supabase SQL Editor

-- 1. Check all assignments
SELECT 
  id,
  word_set_id,
  class_id,
  student_id,
  created_at,
  due_date,
  quiz_unlocked
FROM assigned_word_sets
ORDER BY created_at DESC;

-- 2. Check word sets
SELECT 
  id,
  title,
  teacher_id,
  created_at
FROM word_sets
ORDER BY created_at DESC;

-- 3. Check classes
SELECT 
  id,
  name,
  teacher_id,
  created_at
FROM classes
ORDER BY created_at DESC;

-- 4. Check class_students
SELECT 
  class_id,
  student_id
FROM class_students
ORDER BY class_id;

-- 5. Check profiles
SELECT 
  id,
  email,
  role
FROM profiles
ORDER BY created_at DESC;

-- 6. Count assignments by type
SELECT 
  CASE 
    WHEN class_id IS NOT NULL AND student_id IS NULL THEN 'Class Assignment'
    WHEN class_id IS NULL AND student_id IS NOT NULL THEN 'Individual Assignment'
    ELSE 'Invalid Assignment'
  END as assignment_type,
  COUNT(*) as count
FROM assigned_word_sets
GROUP BY assignment_type;












