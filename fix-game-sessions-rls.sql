-- Fix RLS on game_sessions table to allow teachers to view student sessions

-- Check if table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'game_sessions'
) as table_exists;

-- Add RLS policy for teachers to view student sessions in their classes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_sessions') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Teachers can view student sessions in their classes" ON game_sessions;
    
    -- Create policy for teachers
    CREATE POLICY "Teachers can view student sessions in their classes"
      ON game_sessions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM class_students cs
          JOIN classes c ON cs.class_id = c.id
          WHERE cs.student_id = game_sessions.student_id
            AND c.teacher_id = auth.uid()
            AND cs.deleted_at IS NULL
        )
      );
    
    RAISE NOTICE 'Created RLS policy for game_sessions';
  ELSE
    RAISE NOTICE 'game_sessions table does not exist';
  END IF;
END $$;

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'game_sessions';























