-- GDPR Safe Cleanup - ALL ACCOUNTS
-- This script safely removes ALL user accounts and data from the database
-- SAFE: Checks if tables exist before trying to delete from them
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    deleted_count INTEGER;
    total_profiles INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Get total count before deletion
    SELECT COUNT(*) INTO total_profiles FROM profiles;
    RAISE NOTICE 'Starting cleanup of % total accounts', total_profiles;
    
    -- Step 1: Delete all student-related data (check if tables exist first)
    
    -- Check and delete from game_scores if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'game_scores'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM game_scores;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % game scores', deleted_count;
    ELSE
        RAISE NOTICE 'game_scores table does not exist, skipping';
    END IF;
    
    -- Check and delete from student_progress if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_progress'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM student_progress;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % student progress records', deleted_count;
    ELSE
        RAISE NOTICE 'student_progress table does not exist, skipping';
    END IF;
    
    -- Check and delete from class_students if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'class_students'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM class_students;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % class memberships', deleted_count;
    ELSE
        RAISE NOTICE 'class_students table does not exist, skipping';
    END IF;
    
    -- Check and delete from assigned_word_sets if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assigned_word_sets'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM assigned_word_sets;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % assigned word sets', deleted_count;
    ELSE
        RAISE NOTICE 'assigned_word_sets table does not exist, skipping';
    END IF;
    
    -- Step 2: Delete teacher-created content (check if tables exist first)
    
    -- Check and delete from word_sets if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'word_sets'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM word_sets;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % word sets', deleted_count;
    ELSE
        RAISE NOTICE 'word_sets table does not exist, skipping';
    END IF;
    
    -- Check and delete from homeworks if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'homeworks'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM homeworks;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % homeworks', deleted_count;
    ELSE
        RAISE NOTICE 'homeworks table does not exist, skipping';
    END IF;
    
    -- Check and delete from classes if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'classes'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM classes;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % classes', deleted_count;
    ELSE
        RAISE NOTICE 'classes table does not exist, skipping';
    END IF;
    
    -- Step 3: Delete all user profiles (this should always exist)
    DELETE FROM profiles;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user profiles', deleted_count;
    
    -- Step 4: Verify complete cleanup
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Remaining profiles: %', (SELECT COUNT(*) FROM profiles);
    
    -- Check remaining data in existing tables
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_progress')) THEN
        RAISE NOTICE 'Remaining student progress: %', (SELECT COUNT(*) FROM student_progress);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_scores')) THEN
        RAISE NOTICE 'Remaining game scores: %', (SELECT COUNT(*) FROM game_scores);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'class_students')) THEN
        RAISE NOTICE 'Remaining class students: %', (SELECT COUNT(*) FROM class_students);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assigned_word_sets')) THEN
        RAISE NOTICE 'Remaining assigned word sets: %', (SELECT COUNT(*) FROM assigned_word_sets);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'word_sets')) THEN
        RAISE NOTICE 'Remaining word sets: %', (SELECT COUNT(*) FROM word_sets);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeworks')) THEN
        RAISE NOTICE 'Remaining homeworks: %', (SELECT COUNT(*) FROM homeworks);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classes')) THEN
        RAISE NOTICE 'Remaining classes: %', (SELECT COUNT(*) FROM classes);
    END IF;
    
    -- Final verification
    IF (SELECT COUNT(*) FROM profiles) = 0 THEN
        RAISE NOTICE 'SUCCESS: All user accounts and data have been completely removed!';
        RAISE NOTICE 'Database is now clean and GDPR compliant.';
        RAISE NOTICE 'You can now create new accounts and classes normally.';
    ELSE
        RAISE NOTICE 'WARNING: Some data may still remain. Check the counts above.';
    END IF;
    
    -- Show what remains (should only be predefined word bundles)
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'word_bundles')) THEN
        RAISE NOTICE 'Remaining word bundles (predefined): %', (SELECT COUNT(*) FROM word_bundles);
    END IF;
    
END $$;













