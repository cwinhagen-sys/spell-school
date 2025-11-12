    -- Performance Optimization Indexes for Spell School
    -- Run this in Supabase SQL Editor to significantly improve query performance
    -- Estimated impact: 30-50% faster queries across the board

    -- 1. Student Progress - Composite index for common query patterns
    -- This speeds up queries that filter by student_id and optionally word_set_id/homework_id
    CREATE INDEX IF NOT EXISTS idx_student_progress_student_composite 
    ON student_progress(student_id, word_set_id, homework_id)
    WHERE word_set_id IS NULL AND homework_id IS NULL;

    CREATE INDEX IF NOT EXISTS idx_student_progress_student_word_set 
    ON student_progress(student_id, word_set_id)
    WHERE word_set_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_student_progress_updated_at 
    ON student_progress(updated_at DESC);

    -- 2. User Badges - Composite index for user + badge lookups
    CREATE INDEX IF NOT EXISTS idx_user_badges_user_badge_composite 
    ON user_badges(user_id, badge_id);

    CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked_at 
    ON user_badges(unlocked_at DESC)
    WHERE unlocked_at IS NOT NULL;

    -- 3. Profiles - Optimize login and role checks
    CREATE INDEX IF NOT EXISTS idx_profiles_id_role 
    ON profiles(id, role)
    INCLUDE (email, name, last_active);

    -- 4. Assigned Word Sets - Composite indexes for assignment queries
    CREATE INDEX IF NOT EXISTS idx_assigned_word_sets_student_composite 
    ON assigned_word_sets(student_id, word_set_id, created_at DESC)
    WHERE student_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_assigned_word_sets_class_composite 
    ON assigned_word_sets(class_id, word_set_id, created_at DESC)
    WHERE class_id IS NOT NULL;

    -- 5. Daily Quest Progress - Optimize quest loading
    CREATE INDEX IF NOT EXISTS idx_daily_quest_progress_user_date_composite 
    ON daily_quest_progress(user_id, quest_date DESC, quest_id);

    -- 6. Badges - Optimize badge category and rarity filtering
    CREATE INDEX IF NOT EXISTS idx_badges_category_rarity 
    ON badges(category, rarity)
    WHERE quest_id IS NOT NULL;

    -- 7. Class Students - Optimize student-class lookups (for teacher dashboard)
    CREATE INDEX IF NOT EXISTS idx_class_students_composite 
    ON class_students(class_id, student_id);

    -- 8. Word Sets - Optimize teacher word set queries
    CREATE INDEX IF NOT EXISTS idx_word_sets_teacher_created 
    ON word_sets(teacher_id, created_at DESC);

    -- Note: game_sessions index removed as table structure varies
    -- If you have a game_sessions table with user_id column, uncomment:
    -- CREATE INDEX IF NOT EXISTS idx_game_sessions_user_created 
    --   ON game_sessions(user_id, created_at DESC);

    -- Analyze tables to update statistics for query planner
    ANALYZE student_progress;
    ANALYZE user_badges;
    ANALYZE profiles;
    ANALYZE assigned_word_sets;
    ANALYZE badges;
    ANALYZE daily_quest_progress;
    ANALYZE class_students;
    ANALYZE word_sets;

-- Display index information
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(pg_class.oid)) AS index_size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
  AND tablename IN ('student_progress', 'user_badges', 'profiles', 'assigned_word_sets', 'badges', 'daily_quest_progress')
ORDER BY tablename, indexname;

