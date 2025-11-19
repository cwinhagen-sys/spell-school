-- =========================================================
-- RESET ALL ACCOUNTS - DELETE ALL TEST DATA
-- =========================================================
-- ⚠️  WARNING: This will DELETE ALL user accounts and related data!
-- ⚠️  This is irreversible. Only run this before going to production.
-- =========================================================
-- 
-- This script will:
-- 1. Delete all user-related data from all tables
-- 2. Delete all user accounts from auth.users
-- 3. Clean up any remaining orphaned data
--
-- Tables affected:
-- - auth.users (all accounts)
-- - profiles (all user profiles)
-- - classes (all classes)
-- - class_students (all student-class relationships)
-- - word_sets (all word sets)
-- - assigned_word_sets (all assignments)
-- - homeworks (all homeworks)
-- - student_progress (all progress data)
-- - game_sessions (all game sessions)
-- - game_scores (all game scores)
-- - daily_quest_progress (all quest progress)
-- - quest_event_applied (all quest events)
-- - user_badges (all user badges)
-- - typing_leaderboard (all typing leaderboard entries)
-- - xp_events (all XP events)
-- - xp_totals (all XP totals)
-- =========================================================

-- Step 1: Disable RLS temporarily to allow deletion
-- (We'll re-enable it at the end)
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS word_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assigned_word_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homeworks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_quest_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quest_event_applied DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS typing_leaderboard DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS xp_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS xp_totals DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete all data from user-related tables
-- (These will cascade when we delete auth.users, but we'll do it explicitly for safety)

-- Delete quest-related data
DELETE FROM quest_event_applied;
DELETE FROM daily_quest_progress;

-- Delete badges
DELETE FROM user_badges;

-- Delete game data
DELETE FROM typing_leaderboard;
DELETE FROM game_sessions;
DELETE FROM game_scores;

-- Delete XP data
DELETE FROM xp_events;
DELETE FROM xp_totals;

-- Delete progress data
DELETE FROM student_progress;

-- Delete assignments
DELETE FROM assigned_word_sets;

-- Delete word sets (created by teachers)
DELETE FROM word_sets;

-- Delete homeworks
DELETE FROM homeworks;

-- Delete class relationships
DELETE FROM class_students;

-- Delete classes
DELETE FROM classes;

-- Delete profiles
DELETE FROM profiles;

-- Step 3: Delete all user accounts from auth.users
-- This is the main deletion that will cascade to any remaining references
DELETE FROM auth.users;

-- Step 4: Re-enable RLS
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assigned_word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quest_event_applied ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS typing_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS xp_totals ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify deletion (optional - uncomment to check)
-- SELECT COUNT(*) as remaining_users FROM auth.users;
-- SELECT COUNT(*) as remaining_profiles FROM profiles;
-- SELECT COUNT(*) as remaining_classes FROM classes;
-- SELECT COUNT(*) as remaining_sessions FROM game_sessions;

-- =========================================================
-- ✅ RESET COMPLETE
-- =========================================================
-- All user accounts and related data have been deleted.
-- The database is now clean and ready for production.
-- =========================================================







