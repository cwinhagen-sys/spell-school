-- Clean up old word sets with colors and animals
-- Run this in Supabase SQL Editor

-- First, let's see what word sets exist
SELECT 
  id, 
  title, 
  teacher_id,
  created_at
FROM word_sets 
ORDER BY created_at DESC;

-- Delete word sets that contain color or animal related words
-- This will remove word sets with titles or words containing:
-- - Colors (färger, röd, blå, grön, etc.)
-- - Animals (djur, katt, hund, etc.)

DELETE FROM word_sets 
WHERE 
  -- Check title for color/animal keywords
  LOWER(title) LIKE '%färg%' OR
  LOWER(title) LIKE '%djur%' OR
  LOWER(title) LIKE '%röd%' OR
  LOWER(title) LIKE '%blå%' OR
  LOWER(title) LIKE '%grön%' OR
  LOWER(title) LIKE '%gul%' OR
  LOWER(title) LIKE '%orange%' OR
  LOWER(title) LIKE '%lila%' OR
  LOWER(title) LIKE '%rosa%' OR
  LOWER(title) LIKE '%katt%' OR
  LOWER(title) LIKE '%hund%' OR
  LOWER(title) LIKE '%fisk%' OR
  LOWER(title) LIKE '%fågel%' OR
  LOWER(title) LIKE '%häst%' OR
  LOWER(title) LIKE '%ko%' OR
  LOWER(title) LIKE '%gris%' OR
  LOWER(title) LIKE '%kanin%' OR
  LOWER(title) LIKE '%hamster%' OR
  LOWER(title) LIKE '%colors%' OR
  LOWER(title) LIKE '%animals%' OR
  LOWER(title) LIKE '%red%' OR
  LOWER(title) LIKE '%blue%' OR
  LOWER(title) LIKE '%green%' OR
  LOWER(title) LIKE '%yellow%' OR
  LOWER(title) LIKE '%cat%' OR
  LOWER(title) LIKE '%dog%' OR
  LOWER(title) LIKE '%fish%' OR
  LOWER(title) LIKE '%bird%' OR
  LOWER(title) LIKE '%horse%' OR
  LOWER(title) LIKE '%cow%' OR
  LOWER(title) LIKE '%pig%' OR
  LOWER(title) LIKE '%rabbit%' OR
  LOWER(title) LIKE '%hamster%' OR
  -- Check words array for color/animal keywords
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(words) AS word
    WHERE 
      LOWER(word::text) LIKE '%färg%' OR
      LOWER(word::text) LIKE '%djur%' OR
      LOWER(word::text) LIKE '%röd%' OR
      LOWER(word::text) LIKE '%blå%' OR
      LOWER(word::text) LIKE '%grön%' OR
      LOWER(word::text) LIKE '%gul%' OR
      LOWER(word::text) LIKE '%orange%' OR
      LOWER(word::text) LIKE '%lila%' OR
      LOWER(word::text) LIKE '%rosa%' OR
      LOWER(word::text) LIKE '%katt%' OR
      LOWER(word::text) LIKE '%hund%' OR
      LOWER(word::text) LIKE '%fisk%' OR
      LOWER(word::text) LIKE '%fågel%' OR
      LOWER(word::text) LIKE '%häst%' OR
      LOWER(word::text) LIKE '%ko%' OR
      LOWER(word::text) LIKE '%gris%' OR
      LOWER(word::text) LIKE '%kanin%' OR
      LOWER(word::text) LIKE '%hamster%' OR
      LOWER(word::text) LIKE '%colors%' OR
      LOWER(word::text) LIKE '%animals%' OR
      LOWER(word::text) LIKE '%red%' OR
      LOWER(word::text) LIKE '%blue%' OR
      LOWER(word::text) LIKE '%green%' OR
      LOWER(word::text) LIKE '%yellow%' OR
      LOWER(word::text) LIKE '%cat%' OR
      LOWER(word::text) LIKE '%dog%' OR
      LOWER(word::text) LIKE '%fish%' OR
      LOWER(word::text) LIKE '%bird%' OR
      LOWER(word::text) LIKE '%horse%' OR
      LOWER(word::text) LIKE '%cow%' OR
      LOWER(word::text) LIKE '%pig%' OR
      LOWER(word::text) LIKE '%rabbit%' OR
      LOWER(word::text) LIKE '%hamster%'
  );

-- Show remaining word sets
SELECT 
  id, 
  title, 
  teacher_id,
  created_at
FROM word_sets 
ORDER BY created_at DESC;

-- Also clean up any assignments that reference deleted word sets
DELETE FROM assigned_word_sets 
WHERE word_set_id NOT IN (SELECT id FROM word_sets);

SELECT 'Old word sets cleanup completed' as status;
