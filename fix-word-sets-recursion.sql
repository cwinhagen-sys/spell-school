-- Fix infinite recursion in word_sets RLS policy
-- Run this in Supabase SQL Editor
-- The problem: word_sets_student_assigned queries assigned_word_sets which queries class_students,
-- and when Supabase does nested queries, this causes infinite recursion

-- 1. Drop ALL word_sets policies
DROP POLICY IF EXISTS "word_sets_teacher_own" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_assigned" ON word_sets;
DROP POLICY IF EXISTS "word_sets_student_view" ON word_sets;
DROP POLICY IF EXISTS "word_sets_teacher_manage" ON word_sets;
DROP POLICY IF EXISTS "Teachers can view their own word sets" ON word_sets;
DROP POLICY IF EXISTS "Teachers can create word sets" ON word_sets;

-- 2. Temporarily disable RLS to break recursion
ALTER TABLE word_sets DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLE non-recursive policies
-- Teachers can manage their own word sets
CREATE POLICY "word_sets_teacher_own" ON word_sets
  FOR ALL USING (teacher_id = auth.uid());

-- IMPORTANT: For students, we use a simpler approach
-- Instead of querying assigned_word_sets (which causes recursion),
-- we allow students to view word_sets if they can see it via assigned_word_sets
-- But we need to make this work with RLS without recursion...

-- Solution: Use a function or allow students to view word_sets via foreign key
-- Actually, the best solution is to make word_sets readable for students
-- who have ANY assigned_word_sets entry, but check it more carefully

-- CRITICAL: Use a simpler approach to avoid recursion
-- Instead of querying assigned_word_sets FROM word_sets policy (which causes recursion),
-- we temporarily disable RLS on word_sets for students OR use a security definer function
-- 
-- Actually, best solution: Allow students to read word_sets that are linked via
-- assigned_word_sets, but do it in a way that doesn't query assigned_word_sets
-- from within the policy check itself.

-- Solution: Create a policy that uses direct foreign key relationship
-- Since assigned_word_sets.word_set_id references word_sets.id,
-- we can use a subquery that bypasses RLS on assigned_word_sets by using SECURITY DEFINER
-- OR we can simply allow based on the relationship

-- Let's try the simplest approach: Allow if there's ANY assigned_word_sets entry
-- But check it using a security definer function to avoid recursion

-- First, create a helper function to check if student can access word set
CREATE OR REPLACE FUNCTION can_student_access_word_set(ws_id UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM assigned_word_sets 
    WHERE word_set_id = ws_id 
    AND (student_id = student_uuid 
         OR class_id IN (
           SELECT class_id FROM class_students 
           WHERE student_id = student_uuid
         ))
  );
END;
$$;

-- Now use the function in the policy (this avoids recursion!)
CREATE POLICY "word_sets_student_assigned" ON word_sets
  FOR SELECT USING (
    can_student_access_word_set(id, auth.uid())
  );

-- 5. Verify
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'word_sets'
ORDER BY policyname;

SELECT 'word_sets recursion fixed!' as status;

