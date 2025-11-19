-- Fix class code column name mismatch
-- Frontend expects 'join_code' but we created 'code'

-- Option 1: Rename 'code' to 'join_code' to match frontend
ALTER TABLE public.classes 
  RENAME COLUMN code TO join_code;

-- Now generate codes for all classes
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

-- Update all classes that don't have a join_code
DO $$
DECLARE
  class_record RECORD;
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER;
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
        
        RAISE NOTICE 'Generated code % for class %', new_code, class_record.name;
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
END $$;

-- Show all classes with their new codes
SELECT 
  id,
  name,
  join_code,
  teacher_id,
  '✅ Ready to share!' as status
FROM classes
ORDER BY created_at DESC;























