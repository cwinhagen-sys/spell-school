-- Fix Quiz Results Migration
-- This script adds missing columns to student_progress table for quiz functionality
-- Run this in Supabase SQL Editor

-- Add missing columns to student_progress table
ALTER TABLE student_progress 
ADD COLUMN IF NOT EXISTS word_set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS last_quiz_score INTEGER,
ADD COLUMN IF NOT EXISTS last_quiz_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_quiz_total INTEGER,
ADD COLUMN IF NOT EXISTS last_game_type TEXT,
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_word_set_id ON student_progress(word_set_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_homework_id ON student_progress(homework_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_quiz_score ON student_progress(last_quiz_score);
CREATE INDEX IF NOT EXISTS idx_student_progress_quiz_at ON student_progress(last_quiz_at);

-- Create unique constraint to prevent duplicate records
-- This allows one progress record per student per word set per homework
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_progress_unique 
ON student_progress(student_id, word_set_id, homework_id);

-- Update existing records to have updated_at timestamp
UPDATE student_progress 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN student_progress.word_set_id IS 'Reference to the word set this progress is for';
COMMENT ON COLUMN student_progress.last_quiz_score IS 'Last quiz score achieved by the student';
COMMENT ON COLUMN student_progress.last_quiz_at IS 'Timestamp of the last quiz attempt';
COMMENT ON COLUMN student_progress.last_quiz_total IS 'Total possible points in the last quiz';
COMMENT ON COLUMN student_progress.last_game_type IS 'Type of the last game played';
COMMENT ON COLUMN student_progress.total_points IS 'Total points accumulated across all activities';
COMMENT ON COLUMN student_progress.games_played IS 'Total number of games played';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_progress' 
ORDER BY ordinal_position;














