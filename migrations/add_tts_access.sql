-- TTS Access Migration
-- Allows PRO teachers to grant TTS (OpenAI) access to individual students
-- Run this in Supabase SQL Editor

-- Create student_tts_access table
CREATE TABLE IF NOT EXISTS student_tts_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, teacher_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_tts_access_student_id ON student_tts_access(student_id);
CREATE INDEX IF NOT EXISTS idx_student_tts_access_teacher_id ON student_tts_access(teacher_id);

-- Enable RLS
ALTER TABLE student_tts_access ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Students can view their own TTS access
CREATE POLICY "students_can_view_own_tts_access" ON student_tts_access
  FOR SELECT USING (student_id = auth.uid());

-- RLS Policy: Teachers can manage TTS access for their students
CREATE POLICY "teachers_can_manage_student_tts_access" ON student_tts_access
  FOR ALL USING (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.student_id = student_tts_access.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE student_tts_access IS 'Tracks which students have TTS (OpenAI) access granted by PRO teachers';
COMMENT ON COLUMN student_tts_access.student_id IS 'Student who has TTS access';
COMMENT ON COLUMN student_tts_access.teacher_id IS 'PRO teacher who granted the access';
COMMENT ON COLUMN student_tts_access.enabled IS 'Whether TTS access is currently enabled';



