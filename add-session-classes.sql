-- Add session_classes table to link sessions to classes
-- Run this in Supabase SQL Editor

-- 1. Create session_classes table
CREATE TABLE IF NOT EXISTS session_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, class_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_classes_session ON session_classes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_classes_class ON session_classes(class_id);

-- 3. Enable RLS
ALTER TABLE session_classes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Teachers can manage session-class links for their sessions
CREATE POLICY "teachers_manage_session_classes" ON session_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_classes.session_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Students can view session-class links for sessions in their classes
CREATE POLICY "students_view_session_classes" ON session_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.class_id = session_classes.class_id
      AND cs.student_id = auth.uid()
    )
  );

-- Anyone can view active session-class links (needed for joining)
CREATE POLICY "anyone_view_active_session_classes" ON session_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_classes.session_id
      AND s.is_active = true
    )
  );



-- Run this in Supabase SQL Editor

-- 1. Create session_classes table
CREATE TABLE IF NOT EXISTS session_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, class_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_classes_session ON session_classes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_classes_class ON session_classes(class_id);

-- 3. Enable RLS
ALTER TABLE session_classes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Teachers can manage session-class links for their sessions
CREATE POLICY "teachers_manage_session_classes" ON session_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_classes.session_id
      AND s.teacher_id = auth.uid()
    )
  );

-- Students can view session-class links for sessions in their classes
CREATE POLICY "students_view_session_classes" ON session_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.class_id = session_classes.class_id
      AND cs.student_id = auth.uid()
    )
  );

-- Anyone can view active session-class links (needed for joining)
CREATE POLICY "anyone_view_active_session_classes" ON session_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_classes.session_id
      AND s.is_active = true
    )
  );





