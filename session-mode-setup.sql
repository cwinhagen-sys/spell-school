-- Session Mode setup for Spell School
-- Run this in Supabase SQL Editor

-- 1. Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  word_set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  session_code VARCHAR(6) UNIQUE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  enabled_games JSONB NOT NULL, -- Array of game names: ["flashcards", "multiple_choice", etc.]
  quiz_enabled BOOLEAN DEFAULT false,
  quiz_grading_type VARCHAR(20) DEFAULT 'ai', -- 'ai' or 'manual'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create session_participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  student_id UUID, -- Optional: if student has account
  selected_blocks JSONB, -- Array of block IDs that student selected
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, student_name)
);

-- 3. Create session_progress table
CREATE TABLE IF NOT EXISTS session_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES session_participants(id) ON DELETE CASCADE,
  game_name VARCHAR(50) NOT NULL, -- e.g., "flashcards", "multiple_choice"
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0, -- Percentage or points
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, participant_id, game_name)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_session ON session_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_participant ON session_progress(participant_id);

-- 5. Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_progress ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for sessions
-- Teachers can manage their own sessions
CREATE POLICY "teachers_manage_own_sessions" ON sessions
  FOR ALL USING (teacher_id = auth.uid());

-- Anyone can view active sessions by code (for joining)
CREATE POLICY "anyone_view_active_sessions_by_code" ON sessions
  FOR SELECT USING (is_active = true);

-- 7. Create RLS policies for session_participants
-- Anyone can insert (join session)
CREATE POLICY "anyone_join_session" ON session_participants
  FOR INSERT WITH CHECK (true);

-- Participants can view their own participation
CREATE POLICY "participants_view_own" ON session_participants
  FOR SELECT USING (true); -- Allow viewing for progress tracking

-- Participants can update their own selected_blocks
CREATE POLICY "participants_update_own" ON session_participants
  FOR UPDATE USING (true); -- Allow updating for block selection

-- Teachers can view participants in their sessions
CREATE POLICY "teachers_view_participants" ON session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_participants.session_id
      AND s.teacher_id = auth.uid()
    )
  );

-- 8. Create RLS policies for session_progress
-- Anyone can insert/update progress (when playing)
CREATE POLICY "anyone_update_progress" ON session_progress
  FOR ALL USING (true);

-- 9. Create function to generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  
  -- Check if code already exists
  WHILE EXISTS (SELECT 1 FROM sessions WHERE session_code = result) LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

