-- Quiz functionality for sessions
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Make sure you have run add-quiz-columns.sql FIRST if you already
-- have a sessions table, OR make sure session-mode-setup.sql includes the
-- quiz_enabled and quiz_grading_type columns.

-- 1. Create session_quiz_responses table
CREATE TABLE IF NOT EXISTS session_quiz_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES session_participants(id) ON DELETE CASCADE,
  word_en TEXT NOT NULL,
  word_sv TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  score DECIMAL(5,2), -- Score for this answer (0-100)
  feedback TEXT,
  graded_by VARCHAR(20) DEFAULT 'ai', -- 'ai' or 'manual'
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_session_quiz_session ON session_quiz_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_session_quiz_participant ON session_quiz_responses(participant_id);

-- 3. Enable RLS
ALTER TABLE session_quiz_responses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Anyone can insert quiz responses
CREATE POLICY "anyone_insert_quiz_response" ON session_quiz_responses
  FOR INSERT WITH CHECK (true);

-- Participants can view their own responses
CREATE POLICY "participants_view_own_responses" ON session_quiz_responses
  FOR SELECT USING (true);

-- Teachers can view all responses in their sessions
CREATE POLICY "teachers_view_session_responses" ON session_quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_quiz_responses.session_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Teachers can update responses for manual grading
-- Note: This policy will be created after quiz_grading_type column exists
-- If you get an error, run add-quiz-columns.sql first, then re-run this file
-- or manually create the policy after adding the column

