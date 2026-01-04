-- Check if Breakfast Chef and Master Chef badges have quest_id in Supabase
-- Run this in Supabase SQL Editor

SELECT 
  id,
  name,
  description,
  icon,
  category,
  rarity,
  requirement_type,
  requirement_value,
  quest_id,
  created_at
FROM badges
WHERE name IN ('Breakfast Chef', 'Master Chef')
ORDER BY name;

-- Expected result:
-- Breakfast Chef should have quest_id = 'scenario_breakfast_2_stars'
-- Master Chef should have quest_id = 'scenario_breakfast_3_stars'












