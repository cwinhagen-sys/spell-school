-- Create cache table for Sentence Gap generated sentences
-- This allows us to reuse previously generated sentences for the same word sets
CREATE TABLE IF NOT EXISTS sentence_gap_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_set_hash TEXT NOT NULL UNIQUE, -- Hash of wordSet + difficulty
  word_set JSONB NOT NULL, -- Original wordSet array
  difficulty TEXT NOT NULL CHECK (difficulty IN ('green', 'yellow', 'red')),
  gap_text TEXT NOT NULL,
  solution_text TEXT NOT NULL,
  used_words JSONB NOT NULL,
  gaps_meta JSONB NOT NULL,
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  use_count INTEGER DEFAULT 1
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sentence_gap_cache_hash ON sentence_gap_cache(word_set_hash);
CREATE INDEX IF NOT EXISTS idx_sentence_gap_cache_last_used ON sentence_gap_cache(last_used_at);

-- RLS: Allow all authenticated users to read cache
ALTER TABLE sentence_gap_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache" ON sentence_gap_cache FOR SELECT USING (true);
CREATE POLICY "Service role can insert/update cache" ON sentence_gap_cache FOR ALL USING (true);

-- Function to clean old cache entries (older than 30 days, used less than 5 times)
CREATE OR REPLACE FUNCTION clean_old_sentence_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM sentence_gap_cache
  WHERE last_used_at < NOW() - INTERVAL '30 days'
    AND use_count < 5;
END;
$$ LANGUAGE plpgsql;








