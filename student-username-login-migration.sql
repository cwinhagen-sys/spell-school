-- =========================================================
-- STUDENT USERNAME-BASED LOGIN SYSTEM
-- =========================================================
-- This migration enables students to login with just their username + password
-- instead of username.CLASSCODE + password
-- 
-- The password in Supabase Auth remains tied to the unique email (username.CLASSCODE@local.local)
-- but students can now login using just their username
-- =========================================================

-- Step 1: Verify current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('username', 'email', 'class_code', 'role')
ORDER BY ordinal_position;

-- Step 2: Create index for faster username lookups (if not exists)
-- This is critical for performance when looking up students by username
CREATE INDEX IF NOT EXISTS idx_profiles_username_role 
ON profiles(username, role) 
WHERE role = 'student' AND deleted_at IS NULL;

-- Step 3: Create index for email lookups (used in fallback)
CREATE INDEX IF NOT EXISTS idx_profiles_email_role 
ON profiles(email, role) 
WHERE deleted_at IS NULL;

-- Step 4: Verify the indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname LIKE 'idx_profiles_%'
ORDER BY indexname;

-- =========================================================
-- TESTING QUERIES
-- =========================================================

-- Test 1: Find all students with username 'elev1' (should return multiple if they exist in different classes)
SELECT 
    id,
    username,
    email,
    class_code,
    created_at
FROM profiles
WHERE username = 'elev1'
AND role = 'student'
AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Test 2: Verify email format for existing students
SELECT 
    username,
    class_code,
    email,
    CASE 
        WHEN email LIKE '%@local.local' THEN 'Student account'
        ELSE 'Regular account'
    END as account_type
FROM profiles
WHERE role = 'student'
AND deleted_at IS NULL
LIMIT 10;

-- Test 3: Check for students with duplicate usernames (expected in multi-class scenario)
SELECT 
    username,
    COUNT(*) as count,
    STRING_AGG(class_code, ', ') as class_codes
FROM profiles
WHERE role = 'student'
AND deleted_at IS NULL
GROUP BY username
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- =========================================================
-- VERIFICATION
-- =========================================================

-- Final verification: Show index sizes and statistics
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND relname = 'profiles'
AND indexrelname LIKE 'idx_profiles_%'
ORDER BY indexrelname;

-- =========================================================
-- NOTES FOR IMPLEMENTATION
-- =========================================================
-- 1. Login flow will now work as follows:
--    - Student enters: username = "elev1", password = "[password]"
--    - System queries: SELECT * FROM profiles WHERE username = 'elev1' AND role = 'student'
--    - If multiple results: Use password to authenticate each until one succeeds
--    - If single result: Use that student's email (username.CLASSCODE@local.local) to login
--
-- 2. Backward compatibility:
--    - Old login method (username.CLASSCODE) still works
--    - New login method (username only) now also works
--
-- 3. Security:
--    - Each student still has a unique email in Supabase Auth
--    - Passwords remain unique per student (tied to email)
--    - No security is compromised
--
-- 4. Teacher management:
--    - Teachers can still see full context (which class each student belongs to)
--    - Teachers can reset student passwords via Supabase Auth
-- =========================================================

