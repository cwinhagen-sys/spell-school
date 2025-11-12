-- =========================================================
-- XP EVENT SYSTEM - HÅLLBAR ARKITEKTUR
-- =========================================================
-- Detta ersätter det gamla student_progress systemet med:
-- 1. Event log (append-only, idempotent)
-- 2. Totals tabell (single source of truth)
-- 3. Trigger för automatisk uppdatering
-- 4. Batch RPC för atomiska operationer
-- =========================================================

-- 1. XP Events Table (append-only, idempotent)
-- =========================================================
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY,              -- client_generated_id (ULID/UUID)
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,               -- 'typing' | 'choice' | 'flashcards' | 'connect' | etc.
  delta INT NOT NULL,               -- +2, +10, etc.
  word_set_id UUID,                 -- Optional reference to word_sets (no FK constraint to avoid dependency)
  homework_id UUID,                 -- Optional reference to homework/assignments (no FK constraint)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb  -- Extra context (game session, diminishing factor, etc.)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_student ON xp_events(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created ON xp_events(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_events_word_set ON xp_events(word_set_id) WHERE word_set_id IS NOT NULL;

-- 2. XP Totals Table (single source of truth for UI)
-- =========================================================
CREATE TABLE IF NOT EXISTS xp_totals (
  student_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  last_game_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_xp_totals_updated ON xp_totals(updated_at);

-- 3. Trigger: Auto-update totals when events are inserted
-- =========================================================
CREATE OR REPLACE FUNCTION apply_xp_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert into xp_totals
  INSERT INTO xp_totals (student_id, total_xp, games_played, last_game_type, updated_at)
  VALUES (
    NEW.student_id, 
    GREATEST(NEW.delta, 0),  -- Ensure non-negative
    1, 
    NEW.kind, 
    NOW()
  )
  ON CONFLICT(student_id) DO UPDATE
    SET total_xp = GREATEST(xp_totals.total_xp + NEW.delta, 0),  -- Never go negative
        games_played = xp_totals.games_played + 1,
        last_game_type = NEW.kind,
        updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_apply_xp ON xp_events;

-- Create trigger
CREATE TRIGGER trg_apply_xp
AFTER INSERT ON xp_events
FOR EACH ROW
EXECUTE FUNCTION apply_xp_event();

-- 4. RPC: Batch ingest XP events (idempotent, atomic)
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
  txp INT;
  gp INT;
  inserted BOOLEAN;
BEGIN
  -- Advisory lock for serialization (optional, helps with race conditions)
  -- PERFORM pg_advisory_xact_lock(hashtext('xp_ingest'));

  -- Process each event
  FOR ev IN SELECT * FROM jsonb_array_elements(events)
  LOOP
    ev_id := (ev->>'id')::UUID;
    sid   := (ev->>'student_id')::UUID;
    k     := ev->>'kind';
    d     := (ev->>'delta')::INT;
    ws_id := NULLIF(ev->>'word_set_id', '')::UUID;
    hw_id := NULLIF(ev->>'homework_id', '')::UUID;
    meta  := COALESCE(ev->'metadata', '{}'::jsonb);

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
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO ev_id;

    -- Track which IDs were actually inserted (not duplicates)
    GET DIAGNOSTICS inserted = ROW_COUNT;
    IF inserted THEN
      ids := array_append(ids, ev_id);
    END IF;
  END LOOP;

  -- Get current totals for this student
  SELECT t.total_xp, t.games_played INTO txp, gp
  FROM xp_totals t
  WHERE t.student_id = sid;

  -- Return results
  RETURN QUERY SELECT ids, COALESCE(txp, 0), COALESCE(gp, 0);
END;
$$;

-- 5. RPC: Get XP total for a student (fast read)
-- =========================================================
CREATE OR REPLACE FUNCTION get_xp_total(p_student_id UUID)
RETURNS TABLE(total_xp INT, games_played INT, last_game_type TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(t.total_xp, 0) AS total_xp,
    COALESCE(t.games_played, 0) AS games_played,
    t.last_game_type,
    t.updated_at
  FROM xp_totals t
  WHERE t.student_id = p_student_id;
  
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- 6. Migration: Copy existing student_progress to new system (optional)
-- =========================================================
-- Uncomment to migrate existing data:
/*
INSERT INTO xp_totals (student_id, total_xp, games_played, last_game_type, updated_at)
SELECT 
  student_id,
  COALESCE(total_points, 0) AS total_xp,
  COALESCE(games_played, 0),
  last_game_type,
  COALESCE(last_played_at, NOW()) AS updated_at
FROM student_progress
WHERE word_set_id IS NULL AND homework_id IS NULL  -- Only global records
ON CONFLICT (student_id) DO UPDATE
  SET total_xp = GREATEST(xp_totals.total_xp, EXCLUDED.total_xp),
      games_played = GREATEST(xp_totals.games_played, EXCLUDED.games_played),
      updated_at = EXCLUDED.updated_at;
*/

-- 7. RLS Policies
-- =========================================================
-- Enable RLS
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_totals ENABLE ROW LEVEL SECURITY;

-- xp_events: Students can only see their own events
DROP POLICY IF EXISTS xp_events_select_own ON xp_events;
CREATE POLICY xp_events_select_own ON xp_events
  FOR SELECT
  USING (student_id = auth.uid());

-- xp_events: Only server (via RPC) can insert
-- No direct insert policy needed since we use RPC with SECURITY DEFINER

-- xp_totals: Students can read their own total
DROP POLICY IF EXISTS xp_totals_select_own ON xp_totals;
CREATE POLICY xp_totals_select_own ON xp_totals
  FOR SELECT
  USING (student_id = auth.uid());

-- xp_totals: Teachers can view all students' totals
DROP POLICY IF EXISTS xp_totals_select_teachers ON xp_totals;
CREATE POLICY xp_totals_select_teachers ON xp_totals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Teachers can view all xp_events for analytics
DROP POLICY IF EXISTS xp_events_select_teachers ON xp_events;
CREATE POLICY xp_events_select_teachers ON xp_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- =========================================================
-- NOTES:
-- - xp_events is append-only (no updates/deletes from client)
-- - Client generates UUIDs to ensure idempotency
-- - Trigger handles all totals updates automatically
-- - Batch RPC ensures atomic operations
-- - RLS ensures data isolation
-- =========================================================

