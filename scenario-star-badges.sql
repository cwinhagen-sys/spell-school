-- Insert star-based badges for Make Breakfast scenario
-- These badges are awarded when a student completes the scenario with 2 or 3 stars

INSERT INTO badges (name, description, icon, category, rarity, requirement, requirement_type, requirement_value, quest_id) VALUES
('Breakfast Chef', 'Complete "Make Breakfast" scenario with 2 stars', '👨‍🍳', 'general', 'uncommon', 'Complete Make Breakfast with 2 stars', 'scenario_stars', 2, 'scenario_breakfast_2_stars'),
('Master Chef', 'Complete "Make Breakfast" scenario with 3 stars (perfect!)', '🏆', 'general', 'rare', 'Complete Make Breakfast with 3 stars', 'scenario_stars', 3, 'scenario_breakfast_3_stars')
ON CONFLICT DO NOTHING;


