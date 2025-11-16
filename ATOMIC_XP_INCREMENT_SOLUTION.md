# ⚛️ Atomic XP Increment - Ultimate Race Condition Fix

## Problem: Quest XP Försvinner

**Scenario:**
```
1. Spela typing → Speed God quest completas
2. Level 8 i UI (107 + 75 = 182 XP)
3. Gå till profiles → Level 5 (107 XP)
4. Quest XP (75 XP) försvann! ❌
```

## Root Cause: Race Condition

**Vad händer:**
```javascript
// T=0ms: Game finish
void syncProgressToDatabase()  // Körs i bakgrund
  → läser DB: 100 XP
  → beräknar: 100 + 7 = 107

// T=10ms: Quest triggers (nästan samtidigt!)
void (async () => { quest XP })()  // Körs också i bakgrund!
  → läser DB: 100 XP  ← Läser INNAN game write!
  → beräknar: 100 + 75 = 175

// T=300ms: Game write slutförs
UPDATE student_progress SET total_points = 107

// T=310ms: Quest write slutförs
UPDATE student_progress SET total_points = 175  ← Bra!

// T=320ms: Game write transaction commit
// ÖVERSKRIVER 175 → 107! ❌
// Quest XP förlorad!
```

## Lösning: SQL Atomisk INCREMENT

### Before (Race Condition):
```typescript
// Läs, beräkna, skriv (INTE atomiskt!)
const current = await db.select('total_points')  // Läs
const newTotal = current + delta                 // Beräkna
await db.update({ total_points: newTotal })      // Skriv
// Race mellan läs och skriv! ❌
```

### After (Atomic):
```typescript
// En SQL operation (atomiskt!)
await supabase.rpc('increment_student_xp', {
  p_xp_delta: 75
})
// SQL: UPDATE total_points = total_points + 75
// Row lock → ingen race! ✅
```

## Migration SQL

**File:** `migrations/create_increment_student_xp.sql`

```sql
CREATE OR REPLACE FUNCTION increment_student_xp(
  p_student_id UUID,
  p_xp_delta INTEGER,
  p_game_type TEXT DEFAULT 'quest_completion'
)
RETURNS TABLE (...) AS $$
BEGIN
  -- Atomisk UPDATE (row lock!)
  UPDATE student_progress
  SET total_points = total_points + p_xp_delta  -- INCREMENT!
  WHERE student_id = p_student_id
    AND word_set_id IS NULL
    AND homework_id IS NULL;
  
  RETURN QUERY SELECT ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Varför detta fungerar:**
- SQL row lock under UPDATE
- Ingen "läs → beräkna → skriv" race
- Atomisk operation

## Code Changes

### Quest XP

**Före:**
```typescript
const current = await supabase.select(...)
const newTotalXP = current.total_points + quest.xp
await supabase.update({ total_points: newTotalXP })
```

**Efter:**
```typescript
const { data } = await supabase.rpc('increment_student_xp', {
  p_student_id: user.id,
  p_xp_delta: quest.xp,  // +75
  p_game_type: 'quest_completion'
})

// Fallback om RPC inte finns:
if (error) {
  // Retry med delay (3 försök)
}
```

### Bonus XP

**Efter:**
```typescript
await supabase.rpc('increment_student_xp', {
  p_student_id: user.id,
  p_xp_delta: 100,  // All quests bonus
  p_game_type: 'all_quests_bonus'
})
```

## Installation

### Steg 1: Kör Migration

**Öppna Supabase Dashboard → SQL Editor:**

Kopiera och kör: `migrations/create_increment_student_xp.sql`

### Steg 2: Test

```sql
-- Test funktionen:
SELECT * FROM increment_student_xp(
  'DIN-USER-ID'::UUID,
  10,
  'test'
);

-- Run igen:
SELECT * FROM increment_student_xp(
  'DIN-USER-ID'::UUID,
  10,
  'test'
);

-- Total borde öka med 10 varje gång!
```

### Steg 3: Verify

Spela ett spel och complete quest:

**Console borde visa:**
```
✅ Quest XP added via RPC (atomic): {total_points: 182, ...}
```

**Om RPC saknas:**
```
❌ Quest XP RPC failed, falling back to manual UPDATE
💾 Quest XP retry 1: Current progress: {total_points: 107}
✅ Quest XP saved on retry 1: [{total_points: 182}]
```

## Fördelar

✅ **Race-safe** - SQL row lock förhindrar samtidiga writes  
✅ **Snabbare** - En DB roundtrip istället för två (select + update)  
✅ **Enklare** - Behöver inte läsa current value först  
✅ **Pålitlig** - Automatisk retry i fallback-koden  
✅ **Debugging** - Klar error messages om något går fel  

## Resultat

**Efter migration:**
```
Spela typing → Speed God quest
Game XP: 107 (atomiskt via tracking.ts)
Quest XP: +75 (atomiskt via RPC)
Total: 182 ✅

Gå till profiles: Level 8 ✅
Teacher ser: Level 8 ✅
Logout/login: Level 8 ✅
```

---

**KÖR MIGRATIONEN NU I SUPABASE SQL EDITOR!** 🚀

Sedan refresh och testa!

















