-- Fix badge insertion issues
-- Run this in Supabase SQL Editor

-- 1. Check current state
SELECT 'Current state' as info;
SELECT COUNT(*) as user_badges_count FROM user_badges;
SELECT COUNT(*) as badges_count FROM badges;

-- 2. Fix RLS policies
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can update their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can delete their own badges" ON user_badges;
DROP POLICY IF EXISTS "user_badges_select_own" ON user_badges;
DROP POLICY IF EXISTS "user_badges_insert_own" ON user_badges;
DROP POLICY IF EXISTS "user_badges_update_own" ON user_badges;
DROP POLICY IF EXISTS "user_badges_delete_own" ON user_badges;

-- 3. Create simple policies
CREATE POLICY "user_badges_all" ON user_badges
    FOR ALL USING (auth.uid() = user_id);

-- 4. Grant permissions
GRANT ALL ON user_badges TO authenticated;
GRANT ALL ON user_badges TO service_role;

-- 5. Test access
SELECT 'After fix' as info;
SELECT COUNT(*) as user_badges_count FROM user_badges;

-- 6. Show some badges
SELECT 'Available badges' as info;
SELECT id, name, category FROM badges LIMIT 5;

-- 7. Show users
SELECT 'Available users' as info;
SELECT id, email FROM auth.users LIMIT 3;



