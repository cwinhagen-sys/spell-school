-- =========================================================
-- FIX USERNAME CASE SENSITIVITY
-- =========================================================
-- This script converts all student usernames to lowercase
-- to ensure consistency with the login system
-- =========================================================

-- Step 1: Preview what will be changed
SELECT 
    id,
    username as current_username,
    LOWER(username) as new_username,
    email,
    class_code,
    CASE 
        WHEN username = LOWER(username) THEN 'No change needed'
        ELSE 'Will be updated'
    END as status
FROM profiles
WHERE role = 'student'
AND deleted_at IS NULL
ORDER BY username;

-- Step 2: Update all student usernames to lowercase
UPDATE profiles
SET username = LOWER(username)
WHERE role = 'student'
AND deleted_at IS NULL
AND username != LOWER(username);

-- Step 3: Verify the update
SELECT 
    COUNT(*) as total_students,
    COUNT(CASE WHEN username = LOWER(username) THEN 1 END) as lowercase_usernames,
    COUNT(CASE WHEN username != LOWER(username) THEN 1 END) as still_mixed_case
FROM profiles
WHERE role = 'student'
AND deleted_at IS NULL;

-- =========================================================
-- NOTES
-- =========================================================
-- After running this script:
-- 1. All student usernames will be lowercase
-- 2. Students can now login with just their username (e.g., "elev1")
-- 3. Case doesn't matter when typing username at login
-- =========================================================















