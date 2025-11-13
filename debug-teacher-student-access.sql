-- Debug: Verify teacher has access to students
-- Replace YOUR_TEACHER_EMAIL and STUDENT_EMAIL with actual values

-- Step 1: Find teacher ID
SELECT 
  'Teacher Info:' as info,
  id as teacher_id,
  email,
  role
FROM profiles
WHERE email = 'YOUR_TEACHER_EMAIL@example.com'; -- REPLACE THIS

-- Step 2: Find teacher's classes
SELECT 
  'Teacher Classes:' as info,
  c.id as class_id,
  c.name as class_name,
  c.teacher_id
FROM classes c
JOIN profiles p ON c.teacher_id = p.id
WHERE p.email = 'YOUR_TEACHER_EMAIL@example.com'; -- REPLACE THIS

-- Step 3: Find student ID
SELECT 
  'Student Info:' as info,
  id as student_id,
  email,
  username,
  role
FROM profiles
WHERE email = 'STUDENT_EMAIL@example.com'; -- REPLACE THIS

-- Step 4: Check if student is in teacher's classes
SELECT 
  'Student in Classes:' as info,
  cs.id,
  cs.student_id,
  cs.class_id,
  cs.deleted_at,
  c.name as class_name,
  c.teacher_id,
  p.email as teacher_email
FROM class_students cs
JOIN classes c ON cs.class_id = c.id
JOIN profiles p ON c.teacher_id = p.id
WHERE cs.student_id = (SELECT id FROM profiles WHERE email = 'STUDENT_EMAIL@example.com') -- REPLACE
  AND c.teacher_id = (SELECT id FROM profiles WHERE email = 'YOUR_TEACHER_EMAIL@example.com'); -- REPLACE

-- Step 5: Check for soft-deleted records
SELECT 
  'Deleted Records (if any):' as info,
  cs.id,
  cs.student_id,
  cs.class_id,
  cs.deleted_at,
  c.name as class_name
FROM class_students cs
JOIN classes c ON cs.class_id = c.id
WHERE cs.student_id = (SELECT id FROM profiles WHERE email = 'STUDENT_EMAIL@example.com') -- REPLACE
  AND cs.deleted_at IS NOT NULL;

-- Quick alternative: Show ALL students in teacher's classes
SELECT 
  'All Students in Teacher Classes:' as info,
  p.id as student_id,
  p.email,
  p.username,
  c.name as class_name,
  cs.deleted_at
FROM class_students cs
JOIN classes c ON cs.class_id = c.id
JOIN profiles p ON cs.student_id = p.id
WHERE c.teacher_id = (SELECT id FROM profiles WHERE email = 'YOUR_TEACHER_EMAIL@example.com') -- REPLACE
  AND cs.deleted_at IS NULL
ORDER BY c.name, p.username
LIMIT 20;


















