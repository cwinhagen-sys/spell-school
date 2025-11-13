# 🚨 KÖR DENNA FIXADE MIGRATION NU!

## Problem

RPC funktionen `increment_student_xp` ger error:
```
code: '42702'
message: 'column reference "total_points" is ambiguous'
```

## Fix Applied

**File:** `migrations/create_increment_student_xp.sql`

**Ändring:**
```sql
-- FÖRE (ambiguous):
UPDATE student_progress
SET total_points = total_points + p_xp_delta
--     ↑ Column?      ↑ Column? Variable? Oklart!

-- EFTER (qualified):
UPDATE student_progress AS sp
SET total_points = sp.total_points + p_xp_delta
--                 ↑ Tydligt: table.column!
WHERE sp.student_id = p_student_id
```

## 🚀 KÖR DENNA SQL I SUPABASE SQL EDITOR:

### Fullständig Fixed SQL:

```sql
CREATE OR REPLACE FUNCTION increment_student_xp(
  p_student_id UUID,
  p_xp_delta INTEGER,
  p_game_type TEXT DEFAULT 'quest_completion'
)
RETURNS TABLE (
  student_id UUID,
  total_points INTEGER,
  games_played INTEGER,
  last_played_at TIMESTAMPTZ,
  last_game_type TEXT
) AS $$
DECLARE
  v_current_points INTEGER;
  v_current_games INTEGER;
BEGIN
  -- Try to UPDATE existing record (atomiskt!)
  UPDATE student_progress AS sp
  SET 
    total_points = sp.total_points + p_xp_delta,
    last_played_at = NOW(),
    last_game_type = p_game_type
  WHERE sp.student_id = p_student_id
    AND sp.word_set_id IS NULL
    AND sp.homework_id IS NULL
  RETURNING 
    sp.student_id,
    sp.total_points,
    sp.games_played,
    sp.last_played_at,
    sp.last_game_type
  INTO 
    student_id,
    total_points,
    games_played,
    last_played_at,
    last_game_type;

  IF FOUND THEN
    RAISE NOTICE 'Incremented XP: +% → % total', p_xp_delta, total_points;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If no record found, INSERT new record
  INSERT INTO student_progress (
    student_id,
    word_set_id,
    homework_id,
    total_points,
    games_played,
    last_played_at,
    last_game_type
  ) VALUES (
    p_student_id,
    NULL,
    NULL,
    p_xp_delta,
    0,
    NOW(),
    p_game_type
  )
  RETURNING 
    student_progress.student_id,
    student_progress.total_points,
    student_progress.games_played,
    student_progress.last_played_at,
    student_progress.last_game_type
  INTO 
    student_id,
    total_points,
    games_played,
    last_played_at,
    last_game_type;

  RAISE NOTICE 'Created new student_progress: % XP', total_points;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_student_xp TO authenticated;
```

## Steg för Steg:

1. **Öppna Supabase Dashboard** → SQL Editor
2. **+ New query**
3. **Kopiera hela SQL:en ovan**
4. **Klistra in**
5. **Klicka RUN** (eller Ctrl+Enter)

**Du borde se:**
```
Success. No rows returned
```

## Test

**Efter att ha kört migration, testa:**

```sql
SELECT * FROM increment_student_xp(
  'adc2cba3-67dc-44e6-aca1-d61b6c458b49'::UUID,
  10,
  'test'
);
```

**Förväntat resultat:**
```
student_id | total_points | games_played | ...
-----------|--------------|--------------|----
adc2...    | 104          | 2            | ...
```

**INTE:**
```
ERROR: column reference "total_points" is ambiguous
```

---

## Efter Migration:

**Refresh student page och spela ett spel:**

**Console borde visa:**
```
✅ Quest XP saved via RPC (atomic, AWAITED): {total_points: 109}
```

**INTE:**
```
❌ Quest XP RPC failed: ambiguous column
```

---

**KÖR MIGRATIONEN NU! Det är bara att köra CREATE OR REPLACE så ersätts den gamla buggy versionen!** 🚀















