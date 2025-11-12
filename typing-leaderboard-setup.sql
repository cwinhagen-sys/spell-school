-- Typing Challenge Leaderboard Setup
-- Run this in Supabase SQL Editor

-- Create typing_leaderboard table
CREATE TABLE IF NOT EXISTS typing_leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  kpm INTEGER NOT NULL, -- Keys per minute
  duration_sec INTEGER NOT NULL, -- Time taken in seconds
  accuracy_pct INTEGER NOT NULL, -- Must be 100% to be on leaderboard
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint: one record per student per word set
  -- Handle NULL word_set_id properly (NULLs are considered distinct in PostgreSQL)
  UNIQUE NULLS NOT DISTINCT(word_set_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_word_set_id ON typing_leaderboard(word_set_id);
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_student_id ON typing_leaderboard(student_id);
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_kpm ON typing_leaderboard(word_set_id, kpm DESC);
CREATE INDEX IF NOT EXISTS idx_typing_leaderboard_created ON typing_leaderboard(created_at DESC);

-- Enable RLS
ALTER TABLE typing_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Students can view all leaderboard entries (for ranking)
CREATE POLICY "Students can view leaderboard" ON typing_leaderboard
  FOR SELECT
  USING (true);

-- Students can insert their own records
CREATE POLICY "Students can insert own leaderboard" ON typing_leaderboard
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own records (to improve their best)
CREATE POLICY "Students can update own leaderboard" ON typing_leaderboard
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Teachers can view all leaderboard entries
-- NOTE: We allow all authenticated users to view leaderboard to avoid RLS recursion
-- Teachers are already authenticated, so this is safe
CREATE POLICY "Teachers can view leaderboard" ON typing_leaderboard
  FOR SELECT
  USING (true); -- Changed from EXISTS query to avoid profiles recursion

