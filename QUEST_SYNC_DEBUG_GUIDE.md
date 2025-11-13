# 🐛 Quest Sync Debug Guide

## Problem Rapporterat

**Användare spelade 3 spel:**
- Fick "Word Warrior" badge ✅
- Efter logout/login: progress visar 2/3 ❌
- Badgen finns kvar ✅
- XP stämmer inte mellan student och teacher ❌

## Fixes Implementerade

### 1. Sync Indicator - Bara visa "Saved" när DB bekräftar

**Problem:** Indikatorn visade "Saved" hela tiden pga gamla logs

**Fix:**
```typescript
// Före: Kollade ALLA logs varje 500ms
const recent = parsed.slice(-5)

// Efter: Bara NYA logs sedan senaste check
let lastProcessedLogIndex = -1
const newLogs = parsed.slice(lastProcessedLogIndex + 1)
lastProcessedLogIndex = parsed.length - 1
```

**Resultat:** "Saved" visas bara efter NYTT "XP updated successfully" event

### 2. Quest Progress Logging - Mer detaljerad debug

**Tillagt:**
```typescript
console.log(`💾 Saving ${questsToSave.length} quests to DB:`, 
  questsToSave.map(q => ({ id: q.id, progress: q.progress, completed: q.completed }))
)

// För varje quest:
console.log(`✅ Quest ${quest.id} saved to DB:`, data)
// eller
console.error(`❌ Failed to save quest ${quest.id}:`, error)
```

## Debug Steg

### När du spelar ett spel:

**Console borde visa:**
```
1. "updateStudentProgress called: typing, score: 2"
2. "💾 Saving 3 quests to DB with absolute values: [{id: 'multi_game_4', progress: 1, completed: false}, ...]"
3. "✅ Quest multi_game_4 saved to DB: [{user_id: '...', progress: 1, ...}]"
4. "XP updated successfully: +2 XP for typing"
5. "✅ All 3 quests saved successfully"
```

**Sync Indicator borde visa:**
```
🔵 "Saving..." (när spel slutar)
   ↓ (efter DB write bekräftas)
✅ "Saved" (visas i 3 sekunder)
   ↓
(försvinner)
```

### Vid Logout:

```
"💾 Saved 3 quests to DB with absolute values: [...]"
"Quest outbox cleared (using saveDailyQuestsToDB instead)"
"Progress synced successfully before logout"
```

### Vid Login:

```
"🔄 Merging daily quests from DB..."
"Quest multi_game_4 merge: {local: 0, db: 1, merged: 1, completed: false}"
"✅ Synced 3 quests from DB"
```

## Vad Kollar Vi Efter?

### 1. Sparas quests till DB?

**Kolla console vid spel:**
- ✅ Ser du `"✅ Quest X saved to DB: [...]"`?
- ❌ Ser du `"❌ Failed to save quest X to DB"`?

**Om failed:**
- Kolla felet: RLS policy? Tabell finns inte?
- Quest outbox kanske interfererar (ska vara disabled)

### 2. Läses quests från DB vid login?

**Kolla console vid login:**
- ✅ Ser du `"Quest X merge: {local: 0, db: 1, merged: 1}"`?
- ❌ Ser du `"Quest X merge: {local: 0, db: 0, merged: 0}"`?

**Om db: 0:**
- Quests sparades inte till DB i förra sessionen
- Eller fel quest_date format (kolla `getQuestDateString()`)

### 3. Stämmer XP mellan student och teacher?

**Check i Supabase:**
```sql
-- Student's XP (global progress)
SELECT total_points, games_played, last_game_type
FROM student_progress
WHERE student_id = 'USER_ID'
  AND word_set_id IS NULL
  AND homework_id IS NULL;

-- Student's quest progress
SELECT quest_id, progress, completed_at, xp_awarded
FROM daily_quest_progress
WHERE user_id = 'USER_ID'
  AND quest_date = '2025-10-19'  -- dagens datum YYYY-MM-DD
ORDER BY updated_at DESC;

-- Student's game sessions (vad teacher ser)
SELECT game_type, score, started_at, finished_at
FROM game_sessions
WHERE student_id = 'USER_ID'
  AND started_at > '2025-10-19'
ORDER BY started_at DESC;
```

## Möjliga Problem & Lösningar

### Problem 1: Quest sparas inte till DB

**Symptom:** Ser `"❌ Failed to save quest X"`

**Lösning:**
```sql
-- Check RLS policy
SELECT * FROM daily_quest_progress WHERE user_id = auth.uid();

-- Om error: lägg till policy
CREATE POLICY "Users can manage own quest progress"
ON daily_quest_progress
FOR ALL
USING (user_id = auth.uid());
```

### Problem 2: Quest progress återställs vid login

**Symptom:** Console visar `"Quest X merge: {db: 0}"`

**Lösning:**
- Quest sparades inte i förra sessionen
- Kolla att `saveDailyQuestsToDB()` körs FÖRE logout
- Kolla `syncProgressBeforeLogout()` körs

### Problem 3: XP stämmer inte mellan student och teacher

**Symptom:** Student ser 100 XP, teacher ser 50 XP

**Möjliga orsaker:**
1. **Quest XP inte sparat till student_progress**
   - Check: Kör SQL ovan, se om `last_game_type = 'quest_completion'`
   - Fix: Quest XP UPDATE misslyckas (kolla console errors)

2. **localStorage cache felaktig**
   - Fix: Använd DB som source of truth vid login (redan fixat)

3. **Race condition mellan quest XP och game XP**
   - Fix: UPDATE istället för UPSERT (redan fixat)

## Test Scenario

**Förväntad Behavior:**

1. **Spela 3 olika spel (typing, choice, match)**
   ```
   Console: "✅ Quest multi_game_4 saved to DB: [..., progress: 3, ...]"
   UI: Badge "Memory Champion" unlocks 🎉
   XP: +2 + +2 + +6 + +10 (quest) = 20 XP
   ```

2. **Logga ut**
   ```
   Console: "Progress synced successfully before logout"
   ```

3. **Teacher: Check progress report**
   ```
   XP: 20 ✅
   Games: 3 (typing, choice, match) ✅
   Sessions: INTE "quest_completion" eller "daily_quest" ✅
   ```

4. **Logga in igen**
   ```
   Console: "Quest multi_game_4 merge: {db: 3, merged: 3, completed: true}"
   UI: Badge "Memory Champion" visas ✅
   UI: Quest progress 3/4 ✅
   XP: 20 ✅ (samma som teacher ser)
   ```

---

**Om problem kvarstår efter dessa fixes, kolla console logs och kör SQL queries ovan för att hitta var synk-kedjan bryts.**















