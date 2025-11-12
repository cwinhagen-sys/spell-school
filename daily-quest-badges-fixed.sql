-- Clear existing daily quest badges and create new ones with correct quest IDs
DELETE FROM badges WHERE quest_id IS NOT NULL;

-- Insert daily quest badges (one for each quest) with correct quest IDs
INSERT INTO badges (name, description, icon, category, rarity, requirement, requirement_type, requirement_value, quest_id) VALUES
-- Easy quests
('Word Warrior Badge', 'Complete "Word Warrior" daily quest for the first time', '⚔️', 'general', 'common', 'Complete Word Warrior daily quest for the first time', 'quest_completion', 1, 'play_3_games'),
('Memory Champion Badge', 'Complete "Memory Champion" daily quest for the first time', '🧠', 'general', 'common', 'Complete Memory Champion daily quest for the first time', 'quest_completion', 1, 'memory_2'),
('Spelling Bee Badge', 'Complete "Spelling Bee" daily quest for the first time', '⌨️', 'general', 'common', 'Complete Spelling Bee daily quest for the first time', 'quest_completion', 1, 'typing_1'),
('Choice Master Badge', 'Complete "Choice Master" daily quest for the first time', '✅', 'general', 'uncommon', 'Complete Choice Master daily quest for the first time', 'quest_completion', 1, 'choice_3_perfect'),
('Gap Filler Badge', 'Complete "Gap Filler" daily quest for the first time', '📝', 'general', 'uncommon', 'Complete Gap Filler daily quest for the first time', 'quest_completion', 1, 'sentence_gap_perfect'),

-- Medium quests
('Spell Slinger Novice Badge', 'Complete "Spell Slinger Novice" daily quest for the first time', '✨', 'general', 'rare', 'Complete Spell Slinger Novice daily quest for the first time', 'quest_completion', 1, 'spell_slinger_100'),
('Sentence Builder Badge', 'Complete "Sentence Builder" daily quest for the first time', '📝', 'general', 'rare', 'Complete Sentence Builder daily quest for the first time', 'quest_completion', 1, 'sentence_gap_2'),
('Roulette Master Badge', 'Complete "Roulette Master" daily quest for the first time', '🎯', 'general', 'rare', 'Complete Roulette Master daily quest for the first time', 'quest_completion', 1, 'roulette_3'),
('Multi-Game Player Badge', 'Complete "Multi-Game Player" daily quest for the first time', '🎮', 'general', 'rare', 'Complete Multi-Game Player daily quest for the first time', 'quest_completion', 1, 'multi_game_4'),
('Perfect Score Badge', 'Complete "Perfect Score" daily quest for the first time', '💯', 'general', 'rare', 'Complete Perfect Score daily quest for the first time', 'quest_completion', 1, 'perfect_score_1'),

-- Hard quests
('Spell Slinger Expert Badge', 'Complete "Spell Slinger Expert" daily quest for the first time', '🔥', 'general', 'epic', 'Complete Spell Slinger Expert daily quest for the first time', 'quest_completion', 1, 'spell_slinger_1200'),
('Grammar Guru Badge', 'Complete "Grammar Guru" daily quest for the first time', '📖', 'general', 'epic', 'Complete Grammar Guru daily quest for the first time', 'quest_completion', 1, 'sentence_gap_5'),
('Roulette Legend Badge', 'Complete "Roulette Legend" daily quest for the first time', '👑', 'general', 'epic', 'Complete Roulette Legend daily quest for the first time', 'quest_completion', 1, 'roulette_5'),
('Marathon Runner Badge', 'Complete "Marathon Runner" daily quest for the first time', '🏃‍♂️', 'general', 'epic', 'Complete Marathon Runner daily quest for the first time', 'quest_completion', 1, 'marathon_10'),
('Perfectionist Badge', 'Complete "Perfectionist" daily quest for the first time', '⭐', 'general', 'epic', 'Complete Perfectionist daily quest for the first time', 'quest_completion', 1, 'perfect_3'),
('Quiz God Badge', 'Complete "Quiz God" daily quest for the first time', '🎓', 'general', 'epic', 'Complete Quiz God daily quest for the first time', 'quest_completion', 1, 'quiz_perfect'),
('Speed God Badge', 'Complete "Speed God" daily quest for the first time', '⚡', 'general', 'epic', 'Complete Speed God daily quest for the first time', 'quest_completion', 1, 'typing_speed'),
('Ultimate Gamer Badge', 'Complete "Ultimate Gamer" daily quest for the first time', '👑', 'general', 'legendary', 'Complete Ultimate Gamer daily quest for the first time', 'quest_completion', 1, 'all_games');
