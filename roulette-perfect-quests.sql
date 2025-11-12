-- Add 3 new Word Roulette perfect sentence quest badges
-- These quests are based on getting perfect sentences with different word counts

-- First, ensure quest_id has a UNIQUE constraint (in case it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'badges_quest_id_key' 
    AND conrelid = 'badges'::regclass
  ) THEN
    ALTER TABLE badges ADD CONSTRAINT badges_quest_id_key UNIQUE (quest_id);
  END IF;
END $$;

-- Insert the new badges
INSERT INTO badges (name, description, icon, category, rarity, requirement, requirement_type, requirement_value, quest_id) VALUES
-- Easy: Perfect sentence with 5+ words
('Sentence Starter Badge', 'Create a perfect sentence with 5+ words in Word Roulette for the first time', '📝', 'general', 'common', 'Create a perfect sentence with 5+ words in Word Roulette', 'roulette_perfect_sentence', 5, 'roulette_perfect_5_words'),

-- Medium: Perfect sentence with 10+ words  
('Sentence Expert Badge', 'Create a perfect sentence with 10+ words in Word Roulette for the first time', '📖', 'general', 'rare', 'Create a perfect sentence with 10+ words in Word Roulette', 'roulette_perfect_sentence', 10, 'roulette_perfect_10_words'),

-- Hard: Perfect sentence with 20+ words
('Sentence Master Badge', 'Create a perfect sentence with 20+ words in Word Roulette for the first time', '📚', 'general', 'legendary', 'Create a perfect sentence with 20+ words in Word Roulette', 'roulette_perfect_sentence', 20, 'roulette_perfect_20_words')
ON CONFLICT (quest_id) DO NOTHING;
