# 🚀 RUN THIS MIGRATION NOW!

## Critical: Atomic XP Increment Function

**File:** `migrations/create_increment_student_xp.sql`

**Vad gör den:**
- Skapar en PostgreSQL function för atomisk XP increment
- **Race-safe** - förhindrar att quest XP och game XP överskriver varandra
- Använder SQL `total_points = total_points + delta` (atomiskt!)

## Hur Man Kör

### Method 1: Supabase Dashboard (SQL Editor)

1. Öppna Supabase Dashboard
2. Gå till **SQL Editor**
3. Kopiera hela innehållet från `migrations/create_increment_student_xp.sql`
4. Klistra in och klicka **RUN**

### Method 2: Supabase CLI

```bash
supabase db push --file migrations/create_increment_student_xp.sql
```

## Vad Händer Efter

**Före (race condition):**
```
Game XP:  UPDATE total_points = 100 + 7  → 107
Quest XP: UPDATE total_points = 100 + 75 → 175
Game skriver sist → DB: 107 ❌ (Quest XP förlorad!)
```

**Efter (atomisk):**
```
Game XP:  UPDATE total_points = 100 + 7         → 107
Quest XP: UPDATE total_points = total_points + 75 → 182 ✅
(SQL låser raden → ingen race!)
```

## Verify

Efter att ha kört migration, testa i SQL Editor:

```sql
-- Test funktionen:
SELECT * FROM increment_student_xp(
  'DIN-USER-ID'::UUID,
  10,
  'test'
);

-- Borde returnera:
-- student_id | total_points | games_played | ...
-- -----------|--------------|--------------|----
-- ...        | OLD_XP + 10  | ...          | ...
```

## Fallback

Om RPC inte finns (eller misslyckas), systemet använder automatiskt:
- **3 retries** med exponentiell backoff (300ms, 600ms, 900ms)
- Detaljerad error logging
- UI uppdateras BARA om success

**Kör migrationen nu, sedan refresh och testa!** 🚀




















