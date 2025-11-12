# 🐛 Quest XP Race Condition Fix

## Problem

**Symptom:** Level 9 → Level 8 efter refresh

**Root Cause:**
```typescript
// Quest completion:
await supabase.from('student_progress').update({...})  // DB write
updatePointsSafely(newTotalXP, 'quest-completion')     // UI update

// Om DB write misslyckas eller är långsam:
localStorage: 120 XP ✅ (uppdaterad)
DB: 107 XP ❌ (write misslyckades)

// Vid nästa load:
DB (107) vinner → Level sjunker!
```

## Fixes

### 1. Endast uppdatera UI om DB write lyckas

**Före:**
```typescript
await supabase.from('student_progress').update({...})
console.log(`✅ Quest XP added`)
updatePointsSafely(newTotalXP, 'quest-completion')  // Alltid!
```

**Efter:**
```typescript
try {
  await supabase.from('student_progress').update({...})
  console.log(`✅ Quest XP added to DB`)
  updatePointsSafely(newTotalXP, 'quest-completion')  // Bara om success!
} catch (e) {
  console.error('❌ Quest XP sync failed - NOT updating UI:', e)
  // INTE uppdatera UI!
}
```

### 2. Debug Quest DB Writes

**Lägg till detaljerad logging:**
```typescript
const { data, error } = await supabase
  .from('student_progress')
  .update({...})
  .select()  // <-- VIKTIGT: Lägg till .select() för att få bekräftelse!

if (error) {
  console.error('❌ DB write failed:', error)
  throw error  // Kasta error så catch blockar kan hantera
}
console.log('✅ DB write confirmed:', data)
```

## Test Scenario

1. **Spela spel → complete quest**
2. **Kolla console:**
   ```
   ✅ Quest XP added to DB: +10, total: 117
   💰 Points update from quest-completion
   ```
3. **OM du ser:**
   ```
   ❌ Quest XP sync failed - NOT updating UI: [error]
   ```
   Då vet vi att DB write misslyckas!

## Nästa Steg Om Problem Kvarstår

### Check 1: Är det RLS policy?

```sql
-- Test om student kan UPDATE sin egen progress
SELECT * FROM student_progress 
WHERE student_id = auth.uid() 
  AND word_set_id IS NULL;

-- Om detta fungerar, testa UPDATE:
UPDATE student_progress 
SET total_points = total_points + 10
WHERE student_id = auth.uid() 
  AND word_set_id IS NULL;
```

### Check 2: Timing issue?

Kanske quest complete körs INNAN spel-XP är sparad:
```
Game finish: 107 XP → writing to DB... (pending)
Quest complete: reads 107 XP → adds 10 → writes 117 (race!)
Game write completes: overwrites to 107! ❌
```

**Solution:** Await game XP write INNAN quest check:
```typescript
await updateStudentProgress(score, gameType)  // Vänta!
// Sen kolla quests
```

---

**Test nu och säg mig om du ser "❌ Quest XP sync failed" i console!** 🔍














