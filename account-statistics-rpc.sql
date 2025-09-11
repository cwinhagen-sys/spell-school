-- RPC function for account statistics
-- Run this in Supabase SQL Editor to create the function

CREATE OR REPLACE FUNCTION get_account_statistics()
RETURNS TABLE(
  total_accounts BIGINT,
  accounts_older_than_7_days BIGINT,
  accounts_with_no_activity BIGINT,
  student_accounts_no_class BIGINT,
  teacher_accounts_no_content BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH account_activity AS (
    SELECT 
      p.id,
      p.role,
      p.created_at,
      -- Check for activity
      CASE 
        WHEN EXISTS (SELECT 1 FROM class_students cs WHERE cs.student_id = p.id) THEN true
        WHEN EXISTS (SELECT 1 FROM assigned_word_sets aws WHERE aws.student_id = p.id) THEN true
        WHEN EXISTS (SELECT 1 FROM game_scores gs WHERE gs.student_id = p.id) THEN true
        WHEN EXISTS (SELECT 1 FROM student_progress sp WHERE sp.student_id = p.id) THEN true
        WHEN EXISTS (SELECT 1 FROM word_sets ws WHERE ws.teacher_id = p.id) THEN true
        WHEN EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = p.id) THEN true
        ELSE false
      END as has_activity,
      -- Check specific conditions
      CASE 
        WHEN p.role = 'student' AND NOT EXISTS (SELECT 1 FROM class_students cs WHERE cs.student_id = p.id)
        THEN true ELSE false
      END as student_no_class,
      CASE 
        WHEN p.role = 'teacher' AND NOT EXISTS (SELECT 1 FROM word_sets ws WHERE ws.teacher_id = p.id) 
        AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = p.id)
        THEN true ELSE false
      END as teacher_no_content
    FROM profiles p
  )
  SELECT 
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_accounts,
    (SELECT COUNT(*) FROM profiles WHERE created_at < NOW() - INTERVAL '7 days')::BIGINT as accounts_older_than_7_days,
    (SELECT COUNT(*) FROM account_activity WHERE NOT has_activity AND created_at < NOW() - INTERVAL '7 days')::BIGINT as accounts_with_no_activity,
    (SELECT COUNT(*) FROM account_activity WHERE student_no_class AND created_at < NOW() - INTERVAL '7 days')::BIGINT as student_accounts_no_class,
    (SELECT COUNT(*) FROM account_activity WHERE teacher_no_content AND created_at < NOW() - INTERVAL '7 days')::BIGINT as teacher_accounts_no_content;
END;
$$ LANGUAGE plpgsql;

