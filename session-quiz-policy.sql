-- Create the teachers_grade_responses policy
-- Run this AFTER add-quiz-columns.sql and session-quiz-setup.sql
-- This policy allows teachers to manually grade quiz responses

DROP POLICY IF EXISTS "teachers_grade_responses" ON session_quiz_responses;

CREATE POLICY "teachers_grade_responses" ON session_quiz_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_quiz_responses.session_id
      AND s.teacher_id = auth.uid()
      AND s.quiz_grading_type = 'manual'
    )
  );


