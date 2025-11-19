-- =========================================================
-- FIX RPC RETURN FORMAT
-- =========================================================
-- Förenklar ingest_xp_events för att returnera data korrekt
-- =========================================================

CREATE OR REPLACE FUNCTION ingest_xp_events(events JSONB)
RETURNS TABLE(accepted_ids UUID[], total_xp INT, games_played INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ev JSONB;
  ev_id UUID;
  sid UUID;
  k TEXT;
  d INT;
  ws_id UUID;
  hw_id UUID;
  meta JSONB;
  ids UUID[] := '{}';
  txp INT := 0;
  gp INT := 0;
  inserted INT;
  last_student_id UUID := NULL;
BEGIN
  RAISE NOTICE 'ingest_xp_events: Processing % events', jsonb_array_length(events);

  -- Process each event
  FOR ev IN SELECT * FROM jsonb_array_elements(events)
  LOOP
    BEGIN
      ev_id := (ev->>'id')::UUID;
      sid   := (ev->>'student_id')::UUID;
      k     := ev->>'kind';
      d     := (ev->>'delta')::INT;
      ws_id := NULLIF(ev->>'word_set_id', '')::UUID;
      hw_id := NULLIF(ev->>'homework_id', '')::UUID;
      meta  := COALESCE(ev->'metadata', '{}'::jsonb);
      
      last_student_id := sid;

      RAISE NOTICE 'Processing event: id=%, student=%, kind=%, delta=%', ev_id, sid, k, d;

      -- Insert event (ignore duplicates via ON CONFLICT)
      INSERT INTO xp_events(id, student_id, kind, delta, word_set_id, homework_id, created_at, metadata)
      VALUES (
        ev_id, 
        sid, 
        k, 
        d, 
        ws_id, 
        hw_id, 
        COALESCE((ev->>'created_at')::TIMESTAMPTZ, NOW()),
        meta
      )
      ON CONFLICT (id) DO NOTHING;

      -- Check if row was inserted
      GET DIAGNOSTICS inserted = ROW_COUNT;
      IF inserted > 0 THEN
        ids := array_append(ids, ev_id);
        RAISE NOTICE 'Event inserted: %', ev_id;
      ELSE
        RAISE NOTICE 'Event already exists (duplicate): %', ev_id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing event %: %', ev_id, SQLERRM;
      -- Continue with next event
    END;
  END LOOP;

  -- Get current totals for the last student processed
  IF last_student_id IS NOT NULL THEN
    SELECT t.total_xp, t.games_played INTO txp, gp
    FROM xp_totals t
    WHERE t.student_id = last_student_id;
    
    RAISE NOTICE 'Final totals for student %: xp=%, games=%', last_student_id, txp, gp;
  END IF;

  -- Return results as a single row
  RETURN QUERY SELECT ids, COALESCE(txp, 0), COALESCE(gp, 0);
END;
$$;

-- Test the function
DO $$
DECLARE
  test_student_id UUID;
  result RECORD;
BEGIN
  -- Get a test student
  SELECT id INTO test_student_id 
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1;
  
  IF test_student_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with student: %', test_student_id;
    
    -- Test the RPC
    SELECT * INTO result
    FROM ingest_xp_events(jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'student_id', test_student_id,
        'kind', 'test_fix',
        'delta', 50,
        'created_at', NOW()
      )
    ));
    
    RAISE NOTICE 'Test result: accepted_ids=%, total_xp=%, games_played=%', 
      result.accepted_ids, result.total_xp, result.games_played;
  END IF;
END $$;




















