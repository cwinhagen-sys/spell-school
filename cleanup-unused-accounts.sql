-- Cleanup Unused Accounts Script
-- This script helps identify and safely remove unused user accounts
-- Run this in Supabase SQL Editor

-- 1. First, let's identify potentially unused accounts
-- An account is considered "unused" if:
-- - No class memberships
-- - No word set assignments
-- - No game scores or progress
-- - No word sets created (for teachers)
-- - Account created more than 7 days ago (to avoid deleting recent test accounts)

-- View unused accounts (READ-ONLY - this won't delete anything)
CREATE OR REPLACE VIEW unused_accounts AS
SELECT 
    p.id,
    p.email,
    p.username,
    p.role,
    p.created_at,
    p.class_code,
    -- Check if account has any activity
    CASE 
        WHEN EXISTS (SELECT 1 FROM class_students cs WHERE cs.student_id = p.id) THEN 'Has class membership'
        WHEN EXISTS (SELECT 1 FROM assigned_word_sets aws WHERE aws.student_id = p.id) THEN 'Has word set assignments'
        WHEN EXISTS (SELECT 1 FROM game_scores gs WHERE gs.student_id = p.id) THEN 'Has game scores'
        WHEN EXISTS (SELECT 1 FROM student_progress sp WHERE sp.student_id = p.id) THEN 'Has progress data'
        WHEN EXISTS (SELECT 1 FROM word_sets ws WHERE ws.teacher_id = p.id) THEN 'Has created word sets'
        WHEN EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = p.id) THEN 'Has created classes'
        ELSE 'No activity found'
    END as activity_status,
    -- Count related records
    (SELECT COUNT(*) FROM class_students cs WHERE cs.student_id = p.id) as class_memberships,
    (SELECT COUNT(*) FROM assigned_word_sets aws WHERE aws.student_id = p.id) as word_set_assignments,
    (SELECT COUNT(*) FROM game_scores gs WHERE gs.student_id = p.id) as game_scores_count,
    (SELECT COUNT(*) FROM student_progress sp WHERE sp.student_id = p.id) as progress_records,
    (SELECT COUNT(*) FROM word_sets ws WHERE ws.teacher_id = p.id) as created_word_sets,
    (SELECT COUNT(*) FROM classes c WHERE c.teacher_id = p.id) as created_classes
FROM profiles p
WHERE p.created_at < NOW() - INTERVAL '7 days'  -- Only accounts older than 7 days
ORDER BY p.created_at ASC;

-- 2. Show summary of unused accounts
SELECT 
    'Total accounts older than 7 days' as description,
    COUNT(*) as count
FROM profiles 
WHERE created_at < NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Accounts with no activity' as description,
    COUNT(*) as count
FROM unused_accounts 
WHERE activity_status = 'No activity found'

UNION ALL

SELECT 
    'Student accounts with no class membership' as description,
    COUNT(*) as count
FROM unused_accounts 
WHERE role = 'student' AND class_memberships = 0

UNION ALL

SELECT 
    'Teacher accounts with no created content' as description,
    COUNT(*) as count
FROM unused_accounts 
WHERE role = 'teacher' AND created_word_sets = 0 AND created_classes = 0;

-- 3. Show detailed list of unused accounts (for review)
SELECT 
    id,
    email,
    username,
    role,
    created_at,
    activity_status,
    class_memberships,
    word_set_assignments,
    game_scores_count,
    progress_records,
    created_word_sets,
    created_classes
FROM unused_accounts 
WHERE activity_status = 'No activity found'
ORDER BY created_at ASC;

-- 4. SAFE DELETION FUNCTION (use with caution!)
-- This function will delete an account and all related data
-- Only use this after reviewing the accounts above
CREATE OR REPLACE FUNCTION delete_unused_account(account_id UUID)
RETURNS TEXT AS $$
DECLARE
    account_info RECORD;
    result_text TEXT := '';
BEGIN
    -- Get account info
    SELECT email, username, role, created_at 
    INTO account_info
    FROM profiles 
    WHERE id = account_id;
    
    IF NOT FOUND THEN
        RETURN 'Account not found';
    END IF;
    
    -- Check if account has any activity (safety check)
    IF EXISTS (
        SELECT 1 FROM class_students WHERE student_id = account_id
        UNION ALL
        SELECT 1 FROM assigned_word_sets WHERE student_id = account_id
        UNION ALL
        SELECT 1 FROM game_scores WHERE student_id = account_id
        UNION ALL
        SELECT 1 FROM student_progress WHERE student_id = account_id
        UNION ALL
        SELECT 1 FROM word_sets WHERE teacher_id = account_id
        UNION ALL
        SELECT 1 FROM classes WHERE teacher_id = account_id
    ) THEN
        RETURN 'Account has activity - not safe to delete';
    END IF;
    
    -- Delete related data (CASCADE should handle most of this, but being explicit)
    DELETE FROM class_students WHERE student_id = account_id;
    DELETE FROM assigned_word_sets WHERE student_id = account_id;
    DELETE FROM game_scores WHERE student_id = account_id;
    DELETE FROM student_progress WHERE student_id = account_id;
    DELETE FROM profiles WHERE id = account_id;
    
    -- Note: auth.users deletion needs to be done through Supabase Admin API
    -- or manually in the Supabase dashboard
    
    result_text := 'Account ' || account_info.email || ' (' || account_info.username || ') deleted successfully. ';
    result_text := result_text || 'Note: You still need to delete the auth.users record manually in Supabase dashboard.';
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- 5. BATCH DELETION FUNCTION (use with extreme caution!)
-- This will delete ALL accounts with no activity
-- Only use this after careful review
CREATE OR REPLACE FUNCTION delete_all_unused_accounts()
RETURNS TABLE(deleted_email TEXT, result TEXT) AS $$
DECLARE
    account_record RECORD;
BEGIN
    FOR account_record IN 
        SELECT id, email, username 
        FROM unused_accounts 
        WHERE activity_status = 'No activity found'
    LOOP
        -- Delete the account
        PERFORM delete_unused_account(account_record.id);
        
        -- Return result
        deleted_email := account_record.email;
        result := 'Deleted: ' || account_record.username;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Instructions for manual cleanup
-- After running the deletion functions above, you need to manually delete auth.users records
-- Go to Supabase Dashboard > Authentication > Users
-- Find and delete the corresponding auth.users records for the deleted profiles

-- 7. Verification queries
-- Run these after cleanup to verify the deletion worked
SELECT 'Remaining profiles count' as description, COUNT(*) as count FROM profiles;
SELECT 'Remaining auth users count' as description, COUNT(*) as count FROM auth.users;
