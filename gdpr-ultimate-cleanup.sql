-- GDPR Ultimate Cleanup - ULTRA SAFE VERSION
-- This script safely removes ALL data that actually exists
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    table_exists BOOLEAN;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting ultimate cleanup...';
    
    -- Step 1: Delete all user data from public schema
    
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
    
    -- Delete profiles (this should always exist)
    DELETE FROM profiles;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user profiles', deleted_count;
    
    -- Step 2: Clear auth data (only if tables exist)
    
    -- Check and delete from auth.refresh_tokens if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'refresh_tokens'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM auth.refresh_tokens;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % refresh tokens', deleted_count;
    ELSE
        RAISE NOTICE 'auth.refresh_tokens table does not exist, skipping';
    END IF;
    
    -- Check and delete from auth.sessions if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'sessions'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM auth.sessions;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % sessions', deleted_count;
    ELSE
        RAISE NOTICE 'auth.sessions table does not exist, skipping';
    END IF;
    
    -- Check and delete from auth.identities if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'identities'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM auth.identities;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % identities', deleted_count;
    ELSE
        RAISE NOTICE 'auth.identities table does not exist, skipping';
    END IF;
    
    -- Check and delete from auth.factors if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'factors'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM auth.factors;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % factors', deleted_count;
    ELSE
        RAISE NOTICE 'auth.factors table does not exist, skipping';
    END IF;
    
    -- Finally delete all users from auth.users
    DELETE FROM auth.users;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % users from auth.users', deleted_count;
    
    -- Step 3: Verify complete cleanup
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Remaining profiles: %', (SELECT COUNT(*) FROM profiles);
    RAISE NOTICE 'Remaining auth.users: %', (SELECT COUNT(*) FROM auth.users);
    
    -- Check remaining auth data only if tables exist
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'sessions')) THEN
        RAISE NOTICE 'Remaining auth.sessions: %', (SELECT COUNT(*) FROM auth.sessions);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'refresh_tokens')) THEN
        RAISE NOTICE 'Remaining auth.refresh_tokens: %', (SELECT COUNT(*) FROM auth.refresh_tokens);
    END IF;
    
    IF (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities')) THEN
        RAISE NOTICE 'Remaining auth.identities: %', (SELECT COUNT(*) FROM auth.identities);
    END IF;
    
    -- Final verification
    IF (SELECT COUNT(*) FROM profiles) = 0 AND (SELECT COUNT(*) FROM auth.users) = 0 THEN
        RAISE NOTICE 'SUCCESS: All user accounts and authentication data have been completely removed!';
        RAISE NOTICE 'Database is now completely clean and GDPR compliant.';
        RAISE NOTICE 'You can now create new accounts and classes normally.';
    ELSE
        RAISE NOTICE 'WARNING: Some data may still remain. Check the counts above.';
    END IF;
    
END $$;













