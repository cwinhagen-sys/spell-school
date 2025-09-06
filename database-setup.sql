-- Database setup for Spell School app
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create class_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- 4. Create word_sets table if it doesn't exist
CREATE TABLE IF NOT EXISTS word_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  words JSONB NOT NULL, -- Array of {en: string, sv: string} objects
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create assigned_word_sets table if it doesn't exist
CREATE TABLE IF NOT EXISTS assigned_word_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Either class_id or student_id must be set, but not both
  CHECK (
    (class_id IS NOT NULL AND student_id IS NULL) OR
    (class_id IS NULL AND student_id IS NOT NULL)
  )
);

-- 6. Create homeworks table if it doesn't exist (for backward compatibility)
CREATE TABLE IF NOT EXISTS homeworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  vocabulary_words TEXT[],
  due_date TIMESTAMP WITH TIME ZONE,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create student_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create game_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_type TEXT CHECK (game_type IN ('flashcards', 'matching', 'typing', 'story')),
  score INTEGER DEFAULT 0,
  time_taken INTEGER DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for classes
CREATE POLICY "Teachers can view their own classes" ON classes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);
CREATE POLICY "Teachers can create classes" ON classes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- RLS Policies for class_students
CREATE POLICY "Students can view their class memberships" ON class_students FOR SELECT USING (
  student_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes WHERE id = class_students.class_id AND teacher_id = auth.uid()
  )
);

-- RLS Policies for word_sets
CREATE POLICY "Teachers can view their own word sets" ON word_sets FOR SELECT USING (
  teacher_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM assigned_word_sets 
    WHERE word_set_id = word_sets.id 
    AND (student_id = auth.uid() OR 
         class_id IN (
           SELECT class_id FROM class_students WHERE student_id = auth.uid()
         ))
  )
);
CREATE POLICY "Teachers can create word sets" ON word_sets FOR INSERT WITH CHECK (
  teacher_id = auth.uid()
);

-- RLS Policies for assigned_word_sets
CREATE POLICY "Users can view relevant assignments" ON assigned_word_sets FOR SELECT USING (
  student_id = auth.uid() OR
  class_id IN (
    SELECT class_id FROM class_students WHERE student_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM word_sets WHERE id = word_set_id AND teacher_id = auth.uid()
  )
);
CREATE POLICY "Teachers can assign word sets" ON assigned_word_sets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM word_sets WHERE id = word_set_id AND teacher_id = auth.uid()
  )
);

-- RLS Policies for homeworks (backward compatibility)
CREATE POLICY "Users can view relevant homeworks" ON homeworks FOR SELECT USING (
  teacher_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.student_id = auth.uid() AND c.teacher_id = homeworks.teacher_id
  )
);

-- RLS Policies for student_progress
CREATE POLICY "Students can view own progress" ON student_progress FOR SELECT USING (
  student_id = auth.uid()
);

-- RLS Policies for game_scores
CREATE POLICY "Students can view own scores" ON game_scores FOR SELECT USING (
  student_id = auth.uid()
);
CREATE POLICY "Students can insert own scores" ON game_scores FOR INSERT WITH CHECK (
  student_id = auth.uid()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_word_sets_teacher_id ON word_sets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assigned_word_sets_word_set_id ON assigned_word_sets(word_set_id);
CREATE INDEX IF NOT EXISTS idx_assigned_word_sets_class_id ON assigned_word_sets(class_id);
CREATE INDEX IF NOT EXISTS idx_assigned_word_sets_student_id ON assigned_word_sets(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);

























