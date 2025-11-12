-- Check existing categories in badges table
SELECT DISTINCT category, COUNT(*) as count
FROM badges 
GROUP BY category 
ORDER BY category;



