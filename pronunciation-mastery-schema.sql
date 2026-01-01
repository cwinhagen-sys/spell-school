-- Pronunciation Mastery Table
-- This table stores which words a student has mastered (85%+ accuracy) in flashcards
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pronunciation_mastery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_en TEXT NOT NULL,
  word_sv TEXT,
  word_set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
  accuracy_score INTEGER NOT NULL,
  mastered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Note: One mastery record per student per word per word_set/homework
-- Using unique indexes instead of constraint to better handle nulls

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pronunciation_mastery_student_id ON pronunciation_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_mastery_word_en ON pronunciation_mastery(word_en);
CREATE INDEX IF NOT EXISTS idx_pronunciation_mastery_word_set_id ON pronunciation_mastery(word_set_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_mastery_homework_id ON pronunciation_mastery(homework_id);

-- Create unique indexes to prevent duplicates
-- This ensures one mastery record per student per word per context
-- Using a partial unique index approach that handles nulls properly
DROP INDEX IF EXISTS idx_pronunciation_mastery_unique;
DROP INDEX IF EXISTS idx_pronunciation_mastery_unique_word_set;
DROP INDEX IF EXISTS idx_pronunciation_mastery_unique_homework;
DROP INDEX IF EXISTS idx_pronunciation_mastery_unique_general;

-- For records with word_set_id
CREATE UNIQUE INDEX idx_pronunciation_mastery_unique_word_set 
ON pronunciation_mastery(student_id, word_en, word_set_id) 
WHERE word_set_id IS NOT NULL AND homework_id IS NULL;

-- For records with homework_id
CREATE UNIQUE INDEX idx_pronunciation_mastery_unique_homework 
ON pronunciation_mastery(student_id, word_en, homework_id) 
WHERE homework_id IS NOT NULL AND word_set_id IS NULL;

-- For records with neither (general mastery)
CREATE UNIQUE INDEX idx_pronunciation_mastery_unique_general 
ON pronunciation_mastery(student_id, word_en) 
WHERE word_set_id IS NULL AND homework_id IS NULL;

-- Enable Row Level Security
ALTER TABLE pronunciation_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Students can only see and modify their own mastery records
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own pronunciation mastery" ON pronunciation_mastery;
DROP POLICY IF EXISTS "Students can insert own pronunciation mastery" ON pronunciation_mastery;
DROP POLICY IF EXISTS "Students can update own pronunciation mastery" ON pronunciation_mastery;

-- Create policies
CREATE POLICY "Students can view own pronunciation mastery" 
  ON pronunciation_mastery FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own pronunciation mastery" 
  ON pronunciation_mastery FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own pronunciation mastery" 
  ON pronunciation_mastery FOR UPDATE 
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pronunciation_mastery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS pronunciation_mastery_updated_at ON pronunciation_mastery;
CREATE TRIGGER pronunciation_mastery_updated_at
  BEFORE UPDATE ON pronunciation_mastery
  FOR EACH ROW
  EXECUTE FUNCTION update_pronunciation_mastery_updated_at();

