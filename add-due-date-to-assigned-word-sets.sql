-- Add due_date column to assigned_word_sets table
-- Run this in Supabase SQL Editor

-- Add due_date column if it doesn't exist
ALTER TABLE assigned_word_sets 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add quiz_unlocked column if it doesn't exist (used in the code)
ALTER TABLE assigned_word_sets 
ADD COLUMN IF NOT EXISTS quiz_unlocked BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN assigned_word_sets.due_date IS 'Due date for the assignment';
COMMENT ON COLUMN assigned_word_sets.quiz_unlocked IS 'Whether the quiz is unlocked for this assignment';

