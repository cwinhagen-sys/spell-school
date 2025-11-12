-- GDPR Single Student Cleanup
-- Replace 'STUDENT_UUID_HERE' with the actual student's UUID
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    student_uuid UUID := 'STUDENT_UUID_HERE'; -- Replace with actual UUID
    deleted_count INTEGER;
BEGIN
    -- Delete game scores
    DELETE FROM game_scores WHERE student_id = student_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % game scores', deleted_count;
    
    -- Delete student progress
    DELETE FROM student_progress WHERE student_id = student_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % progress records', deleted_count;
    
    -- Delete class memberships
    DELETE FROM class_students WHERE student_id = student_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % class memberships', deleted_count;
    
    -- Delete assigned word sets
    DELETE FROM assigned_word_sets WHERE student_id = student_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % assigned word sets', deleted_count;
    
    -- Delete the student profile (this also removes from auth.users)
    DELETE FROM profiles WHERE id = student_uuid AND role = 'student';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % student profile', deleted_count;
    
    -- Verify complete deletion
    RAISE NOTICE 'Verification - Remaining records:';
    RAISE NOTICE 'Profiles: %', (SELECT COUNT(*) FROM profiles WHERE id = student_uuid);
    RAISE NOTICE 'Student Progress: %', (SELECT COUNT(*) FROM student_progress WHERE student_id = student_uuid);
    RAISE NOTICE 'Game Scores: %', (SELECT COUNT(*) FROM game_scores WHERE student_id = student_uuid);
    RAISE NOTICE 'Class Students: %', (SELECT COUNT(*) FROM class_students WHERE student_id = student_uuid);
    RAISE NOTICE 'Assigned Word Sets: %', (SELECT COUNT(*) FROM assigned_word_sets WHERE student_id = student_uuid);
    
    IF (SELECT COUNT(*) FROM profiles WHERE id = student_uuid) = 0 THEN
        RAISE NOTICE 'SUCCESS: All student data has been completely removed!';
    ELSE
        RAISE NOTICE 'WARNING: Some data may still remain. Check the counts above.';
    END IF;
    
END $$;













