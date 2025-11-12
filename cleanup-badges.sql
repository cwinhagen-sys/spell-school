-- Clean up badges and create only the 18 we need
-- This will remove all existing badges and create only the correct ones

-- 1. Remove all existing badges and user badges
DELETE FROM user_badges;
DELETE FROM badges;

-- 2. Create only the 18 badges we need
INSERT INTO badges (id, name, description, icon, category, rarity, requirement, requirement_type, requirement_value, created_at, updated_at) VALUES

-- Daily Quest Badges (8 badges) - using 'streaks' category (likely allowed)
(gen_random_uuid(), 'Word Warrior', 'Complete 3 games of any type', '🏆⚔️', 'streaks', 'common', 'Complete 3 games of any type', 'count', 3, NOW(), NOW()),
(gen_random_uuid(), 'Memory Champion', 'Complete 2 Memory Games', '🏆🧠', 'streaks', 'common', 'Complete 2 Memory Games', 'count', 2, NOW(), NOW()),
(gen_random_uuid(), 'Spelling Bee', 'Complete 1 Typing Challenge', '🏆⌨️', 'streaks', 'common', 'Complete 1 Typing Challenge', 'count', 1, NOW(), NOW()),
(gen_random_uuid(), 'Choice Master', 'Complete 3 perfect games of multiple choice', '🏆✅', 'streaks', 'uncommon', 'Complete 3 perfect games of multiple choice', 'count', 3, NOW(), NOW()),
(gen_random_uuid(), 'Gap Filler', 'Get a perfect result in sentence gap', '🏆📝', 'streaks', 'uncommon', 'Get a perfect result in sentence gap', 'count', 1, NOW(), NOW()),
(gen_random_uuid(), 'Spell Slinger Novice', 'Score 100+ points in Spell Slinger', '🏆✨', 'streaks', 'rare', 'Score 100+ points in Spell Slinger', 'score', 100, NOW(), NOW()),
(gen_random_uuid(), 'Sentence Builder', 'Complete 2 Sentence Gap games', '🏆📝', 'streaks', 'rare', 'Complete 2 Sentence Gap games', 'count', 2, NOW(), NOW()),
(gen_random_uuid(), 'Roulette Master', 'Get 3 perfect sentences in Word Roulette', '🏆🎯', 'streaks', 'rare', 'Get 3 perfect sentences in Word Roulette', 'count', 3, NOW(), NOW()),

-- Achievement Badges (10 badges) - using 'streaks' category
(gen_random_uuid(), 'First Steps', 'Play your first game', '🎯', 'streaks', 'common', 'Play your first game', 'count', 1, NOW(), NOW()),
(gen_random_uuid(), 'Getting Hot', 'Play 3 days in a row', '🔥', 'streaks', 'uncommon', 'Play 3 days in a row', 'streak', 3, NOW(), NOW()),
(gen_random_uuid(), 'Week Warrior', 'Play 7 days in a row', '📅', 'streaks', 'rare', 'Play 7 days in a row', 'streak', 7, NOW(), NOW()),
(gen_random_uuid(), 'Monthly Master', 'Play 30 days in a row', '📆', 'streaks', 'epic', 'Play 30 days in a row', 'streak', 30, NOW(), NOW()),
(gen_random_uuid(), 'Rising Star', 'Reach level 10', '⭐', 'streaks', 'uncommon', 'Reach level 10', 'level', 10, NOW(), NOW()),
(gen_random_uuid(), 'Experienced Learner', 'Reach level 25', '🌟', 'streaks', 'rare', 'Reach level 25', 'level', 25, NOW(), NOW()),
(gen_random_uuid(), 'Master Student', 'Reach level 50', '🏆', 'streaks', 'epic', 'Reach level 50', 'level', 50, NOW(), NOW()),
(gen_random_uuid(), 'Legendary Scholar', 'Reach level 100', '👑', 'streaks', 'legendary', 'Reach level 100', 'level', 100, NOW(), NOW()),
(gen_random_uuid(), 'Perfect Score', 'Get 100% accuracy in any game', '💯', 'streaks', 'rare', 'Get 100% accuracy in any game', 'accuracy', 100, NOW(), NOW()),
(gen_random_uuid(), 'Game Master', 'Complete 100 total games', '🎮', 'streaks', 'epic', 'Complete 100 total games', 'count', 100, NOW(), NOW());

-- 3. Verify the cleanup
SELECT 
  'Cleanup complete' as status,
  COUNT(*) as total_badges
FROM badges;

-- 4. Show the badges by category
SELECT 
  category,
  COUNT(*) as badge_count,
  array_agg(name ORDER BY name) as badge_names
FROM badges 
GROUP BY category 
ORDER BY category;
