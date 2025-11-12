-- Daily Quest Badges
-- Creates one badge for each daily quest that gets awarded when completed for the first time

-- First, create the badges table if it doesn't exist
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'daily',
  rarity TEXT NOT NULL DEFAULT 'common',
  quest_id TEXT UNIQUE, -- Links to daily quest ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_badges table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Users can view their own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert daily quest badges (one for each quest)
INSERT INTO badges (name, description, icon, category, rarity, quest_id) VALUES
-- Easy quests
('Word Warrior Badge', 'Complete "Word Warrior" daily quest for the first time', '⚔️', 'daily', 'common', 'play_3_games'),
('Memory Champion Badge', 'Complete "Memory Champion" daily quest for the first time', '🧠', 'daily', 'common', 'memory_2'),
('Spelling Bee Badge', 'Complete "Spelling Bee" daily quest for the first time', '⌨️', 'daily', 'common', 'typing_1'),
('Choice Master Badge', 'Complete "Choice Master" daily quest for the first time', '✅', 'daily', 'uncommon', 'choice_3_perfect'),
('Gap Filler Badge', 'Complete "Gap Filler" daily quest for the first time', '📝', 'daily', 'uncommon', 'sentence_gap_perfect'),

-- Medium quests
('Spell Slinger Novice Badge', 'Complete "Spell Slinger Novice" daily quest for the first time', '✨', 'daily', 'rare', 'spell_slinger_100'),
('Sentence Builder Badge', 'Complete "Sentence Builder" daily quest for the first time', '📝', 'daily', 'rare', 'sentence_gap_2'),
('Roulette Master Badge', 'Complete "Roulette Master" daily quest for the first time', '🎯', 'daily', 'rare', 'roulette_3'),
('Multi-Game Player Badge', 'Complete "Multi-Game Player" daily quest for the first time', '🎮', 'daily', 'rare', 'multi_game_4'),
('Perfect Score Badge', 'Complete "Perfect Score" daily quest for the first time', '💯', 'daily', 'rare', 'perfect_score_1'),

-- Hard quests
('Spell Slinger Expert Badge', 'Complete "Spell Slinger Expert" daily quest for the first time', '🔥', 'general', 'epic', 'Complete Spell Slinger Expert daily quest for the first time', 'quest_completion', 1, 'spell_slinger_1200'),
('Grammar Guru Badge', 'Complete "Grammar Guru" daily quest for the first time', '📖', 'general', 'epic', 'Complete Grammar Guru daily quest for the first time', 'quest_completion', 1, 'sentence_gap_5'),
('Roulette Legend Badge', 'Complete "Roulette Legend" daily quest for the first time', '👑', 'general', 'epic', 'Complete Roulette Legend daily quest for the first time', 'quest_completion', 1, 'roulette_5'),
('Marathon Runner Badge', 'Complete "Marathon Runner" daily quest for the first time', '🏃‍♂️', 'general', 'epic', 'Complete Marathon Runner daily quest for the first time', 'quest_completion', 1, 'marathon_10'),
('Perfectionist Badge', 'Complete "Perfectionist" daily quest for the first time', '⭐', 'general', 'epic', 'Complete Perfectionist daily quest for the first time', 'quest_completion', 1, 'perfect_3'),
('Quiz God Badge', 'Complete "Quiz God" daily quest for the first time', '🎓', 'general', 'epic', 'Complete Quiz God daily quest for the first time', 'quest_completion', 1, 'quiz_perfect'),
('Speed God Badge', 'Complete "Speed God" daily quest for the first time', '⚡', 'general', 'epic', 'Complete Speed God daily quest for the first time', 'quest_completion', 1, 'typing_speed'),
('Ultimate Gamer Badge', 'Complete "Ultimate Gamer" daily quest for the first time', '👑', 'general', 'legendary', 'Complete Ultimate Gamer daily quest for the first time', 'quest_completion', 1, 'all_games');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_quest_id ON badges(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);
