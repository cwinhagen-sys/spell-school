-- Check what categories exist in the current badges
SELECT DISTINCT category, COUNT(*) as count
FROM badges 
GROUP BY category 
ORDER BY category;



