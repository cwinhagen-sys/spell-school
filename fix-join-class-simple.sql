-- SIMPLE FIX for Join Class Feature
-- Generate codes for all classes that don't have one

-- Step 1: Drop old 'code' column if it exists (we use 'join_code' instead)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' 
      AND column_name = 'code'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.classes DROP COLUMN code;
    RAISE NOTICE '✅ Dropped old code column';
  END IF;
END $$;

-- Step 2: Ensure join_code is UNIQUE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'classes_join_code_key'
  ) THEN
    ALTER TABLE public.classes ADD CONSTRAINT classes_join_code_key UNIQUE (join_code);
    RAISE NOTICE '✅ Added UNIQUE constraint to join_code';
  END IF;
END $$;

-- Step 3: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);

-- Step 4: Function to generate random codes
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars (0,O,1,I)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Generate codes for all classes that don't have one
DO $$
DECLARE
  class_record RECORD;
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER;
  classes_updated INTEGER := 0;
BEGIN
  FOR class_record IN 
    SELECT id, name FROM classes WHERE join_code IS NULL
  LOOP
    attempt := 0;
    LOOP
      -- Generate a new code
      new_code := generate_class_code();
      
      -- Try to set it (will fail if duplicate due to UNIQUE constraint)
      BEGIN
        UPDATE classes 
        SET join_code = new_code 
        WHERE id = class_record.id;
        
        classes_updated := classes_updated + 1;
        RAISE NOTICE '✅ Generated code % for class "%"', new_code, class_record.name;
        EXIT; -- Success, exit loop
        
      EXCEPTION WHEN unique_violation THEN
        -- Code already exists, try again
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique code after % attempts', max_attempts;
        END IF;
      END;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Updated % classes with new join codes', classes_updated;
END $$;

-- Step 6: Create/Update the RPC function
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

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.join_class_with_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_with_code(TEXT) TO anon;

-- Step 8: Show all classes with their codes
SELECT 
  '🎉 SETUP COMPLETE!' as status,
  name as class_name,
  join_code,
  CASE 
    WHEN join_code IS NULL THEN '⚠️ Missing code'
    ELSE '✅ Ready'
  END as code_status,
  created_at
FROM classes
ORDER BY created_at DESC;
























