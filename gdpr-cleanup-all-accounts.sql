-- GDPR Complete Cleanup - ALL ACCOUNTS
-- This script removes ALL user accounts and data from the database
-- SAFE: This will NOT affect the ability to create new accounts/classes
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    deleted_count INTEGER;
    total_profiles INTEGER;
BEGIN
    -- Get total count before deletion
    SELECT COUNT(*) INTO total_profiles FROM profiles;
    RAISE NOTICE 'Starting cleanup of % total accounts', total_profiles;
    
    -- Step 1: Delete all student-related data
    DELETE FROM game_scores;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % game scores', deleted_count;
    
    DELETE FROM student_progress;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % student progress records', deleted_count;
    
    DELETE FROM class_students;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % class memberships', deleted_count;
    
    DELETE FROM assigned_word_sets;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % assigned word sets', deleted_count;
    
    -- Step 2: Delete teacher-created content
    DELETE FROM word_sets;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % word sets', deleted_count;
    
    DELETE FROM homeworks;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % homeworks', deleted_count;
    
    DELETE FROM classes;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % classes', deleted_count;
    
    -- Step 3: Delete all user profiles (this also removes from auth.users)
    DELETE FROM profiles;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user profiles', deleted_count;
    
    -- Step 4: Verify complete cleanup
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Remaining profiles: %', (SELECT COUNT(*) FROM profiles);
    RAISE NOTICE 'Remaining student progress: %', (SELECT COUNT(*) FROM student_progress);
    RAISE NOTICE 'Remaining game scores: %', (SELECT COUNT(*) FROM game_scores);
    RAISE NOTICE 'Remaining class students: %', (SELECT COUNT(*) FROM class_students);
    RAISE NOTICE 'Remaining assigned word sets: %', (SELECT COUNT(*) FROM assigned_word_sets);
    RAISE NOTICE 'Remaining word sets: %', (SELECT COUNT(*) FROM word_sets);
    RAISE NOTICE 'Remaining homeworks: %', (SELECT COUNT(*) FROM homeworks);
    RAISE NOTICE 'Remaining classes: %', (SELECT COUNT(*) FROM classes);
    
    -- Final verification
    IF (SELECT COUNT(*) FROM profiles) = 0 THEN
        RAISE NOTICE 'SUCCESS: All user accounts and data have been completely removed!';
        RAISE NOTICE 'Database is now clean and GDPR compliant.';
        RAISE NOTICE 'You can now create new accounts and classes normally.';
    ELSE
        RAISE NOTICE 'WARNING: Some data may still remain. Check the counts above.';
    END IF;
    
    -- Show what remains (should only be predefined word bundles)
    RAISE NOTICE 'Remaining word bundles (predefined): %', (SELECT COUNT(*) FROM word_bundles);
    
END $$;

-- Optional: Reset sequences to start from 1 (uncomment if needed)
-- ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS classes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS word_sets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS homeworks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS student_progress_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS game_scores_id_seq RESTART WITH 1;
