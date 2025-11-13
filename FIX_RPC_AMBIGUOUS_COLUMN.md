# 🔧 Fix RPC Ambiguous Column Error

## Error

```
❌ Quest XP RPC failed: {
  message: 'column reference "total_points" is ambiguous',
  code: '42702',
  details: 'It could refer to either a PL/pgSQL variable or a table column.'
}
```

## Root Cause

**I `increment_student_xp` function:**

```sql
RETURNS TABLE (
  student_id UUID,
  total_points INTEGER,  -- ← RETURN variable
  ...
)
...
DECLARE
  v_current_points INTEGER;  -- Variable (inte använd, men fanns i template)
BEGIN
  UPDATE student_progress
  SET total_points = total_points + p_xp_delta  -- ← Ambiguous!
  --     ↑                ↑
  --   Column?         Column? eller RETURN variable?
```

**PostgreSQL blir förvirrad:**
- `total_points` = table column?
- `total_points` = RETURN TABLE variable?

## Fix

**Lägg till table alias:**

```sql
UPDATE student_progress AS sp  -- ← Alias!
SET total_points = sp.total_points + p_xp_delta
--                 ↑ Kvalificerad med alias
WHERE sp.student_id = p_student_id
  AND sp.word_set_id IS NULL
RETURNING 
  sp.student_id,  -- Kvalificerad
  sp.total_points,  -- Kvalificerad
  sp.games_played,
  ...
```

**Samma för INSERT:**
```sql
INSERT INTO student_progress AS sp (...)
RETURNING 
  sp.student_id,
  sp.total_points,
  ...
```

## Test

**Efter att ha kört fixad migration i Supabase SQL Editor:**

```sql
SELECT * FROM increment_student_xp(
  'DIN-USER-ID'::UUID,
  10,
  'test'
);

-- Borde fungera nu utan "ambiguous" error!
```

## Förväntat Resultat

**Efter fix:**
```
Console:
💾 Quest XP: Adding 15 XP using atomic INCREMENT (AWAITED)
✅ Quest XP saved via RPC (atomic, AWAITED): {total_points: 109, ...}
Quest completed: Memory Champion, Total after DB save: 109
```

**Istället för:**
```
❌ Quest XP RPC failed: ambiguous column
💾 Quest XP retry 1: ...
```

---

**KÖR DENNA FIXADE MIGRATION I SUPABASE SQL EDITOR NU!**

Kopiera hela den uppdaterade `migrations/create_increment_student_xp.sql` filen!















