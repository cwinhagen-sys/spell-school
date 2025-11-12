-- Create join_class_with_code RPC Function
-- Allows students to join classes using a class code

-- First, ensure classes table has a join_code column
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.join_class_with_code(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_class_id UUID;
  v_user_id UUID;
  v_existing_record INTEGER;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find class by code (case-insensitive)
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE UPPER(join_code) = UPPER(p_code)
  LIMIT 1;

  IF v_class_id IS NULL THEN
    -- Class code not found
    RETURN FALSE;
  END IF;

  -- Check if already in this class
  SELECT COUNT(*) INTO v_existing_record
  FROM public.class_students
  WHERE class_id = v_class_id
    AND student_id = v_user_id
    AND deleted_at IS NULL;

  IF v_existing_record > 0 THEN
    -- Already in class, return success
    RETURN TRUE;
  END IF;

  -- Add student to class
  INSERT INTO public.class_students (class_id, student_id, created_at)
  VALUES (v_class_id, v_user_id, NOW())
  ON CONFLICT (class_id, student_id) 
  DO UPDATE SET deleted_at = NULL; -- Undelete if was soft-deleted

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in join_class_with_code: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.join_class_with_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_with_code(TEXT) TO anon;

-- Verify function was created
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'join_class_with_code';

