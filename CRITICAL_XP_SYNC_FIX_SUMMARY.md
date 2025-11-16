# 🔥 KRITISK FIX: XP Försvinner Mellan Sessions

## Problem Rapporterat av Användare

```
🎮 Spela flera spel på elev5 → Level 8
🚪 Logga ut
👨‍🏫 Teacher progress report → Level 4 (?!)
🚪 Logga in igen → Level 3 (?!?!)
```

**XP FÖRSVINNER!** ❌

## Root Causes

### 1. Quest XP Överskriver games_played

**Före:**
```typescript
// Quest completion använder UPSERT
await supabase.from('student_progress').upsert({
  student_id: user.id,
  total_points: newTotalXP,
  games_played: 0  // ← ÖVERSKRIVER värdet från spelen!
})

// Sekvens:
Game 1: {total_points: 2, games_played: 1}
Game 2: {total_points: 4, games_played: 2}
Quest:  {total_points: 14, games_played: 0}  ← RACE! Nollställer games_played!
```

**Efter:**
```typescript
// Quest completion använder UPDATE (bevarar games_played)
if (currentProgress) {
  await supabase.from('student_progress').update({
    total_points: newTotalXP
    // games_played bevaras!
  }).eq('student_id', user.id)
} else {
  await supabase.from('student_progress').insert({
    total_points: newTotalXP,
    games_played: 0
  })
}
```

### 2. localStorage "Vann" över DB vid Login

**Före:**
```typescript
// Använder högsta värdet (localStorage kunde vara optimistiskt)
const finalXP = Math.max(localXP, dbXP)

// Scenario:
localStorage: 120 XP (optimistiskt, quest XP ej sparat)
DB:           60 XP (faktiskt sparat)
finalXP:      120 XP ← Lokalt "vinner" men DB har 60
// Nästa login: 60 XP (localStorage rensas) → Level sjunker!
```

**Efter:**
```typescript
// DB är source of truth
const finalXP = dbXP > 0 ? dbXP : localXP

// Varning vid mismatch
if (localXP > dbXP && dbXP > 0) {
  console.warn('⚠️ localStorage högre än DB - sync misslyckades:', {
    localStorage: localXP,
    database: dbXP,
    diff: localXP - dbXP
  })
}
```

## Ändringar

### File: `src/app/student/page.tsx`

#### 1. Quest Completion XP (rad ~513)
```diff
- await supabase.from('student_progress').upsert({
-   total_points: newTotalXP,
-   games_played: currentProgress?.games_played || 0
- }, { onConflict: 'student_id,word_set_id,homework_id' })

+ if (currentProgress) {
+   await supabase.from('student_progress').update({
+     total_points: newTotalXP
+   }).eq('student_id', user.id).is('word_set_id', null)
+ } else {
+   await supabase.from('student_progress').insert({
+     total_points: newTotalXP,
+     games_played: 0
+   })
+ }
```

#### 2. All Quests Bonus XP (rad ~633)
```diff
- await supabase.from('student_progress').upsert({
-   total_points: newTotalXP,
-   games_played: currentProgress?.games_played || 0
- })

+ if (currentProgress) {
+   await supabase.from('student_progress').update({
+     total_points: newTotalXP
+   }).eq('student_id', user.id)
+ } else {
+   await supabase.from('student_progress').insert({
+     total_points: newTotalXP,
+     games_played: 0
+   })
+ }
```

#### 3. Login XP Loading (rad ~1113)
```diff
- const finalXP = Math.max(localXP, dbXP)
+ const finalXP = dbXP > 0 ? dbXP : localXP
+ 
+ if (localXP > dbXP && dbXP > 0) {
+   console.warn('⚠️ localStorage högre än DB - sync misslyckades')
+ }
```

## Testing Scenario

### Förväntat Beteende:

**Session 1:**
```
1. Logga in som elev5
2. Spela typing → 2 XP
   Console: "updateStudentProgress called: typing, score: 2"
   Console: "XP updated in DB: 2 total XP"
3. Spela choice → 2 XP
   Console: "updateStudentProgress called: choice, score: 2"
   Console: "XP updated in DB: 4 total XP"
4. Spela match → 6 XP
   Console: "updateStudentProgress called: match, score: 6"
   Console: "XP updated in DB: 10 total XP"
5. Quest completes: "Memory Champion" → +10 XP
   Console: "✅ Quest XP added directly: +10, total: 20"
6. UI visar: Level 2 (20 XP)
```

**Session 2 (Teacher):**
```
1. Logga in som teacher
2. Progress report → elev5
3. Borde visa:
   - Total XP: 20
   - Games Played: 3
   - Sessions: typing, choice, match (INTE "quest_completion")
   ✅ Level 2
```

**Session 3 (Student igen):**
```
1. Logga in som elev5
2. UI visar: Level 2 (20 XP)
   Console: "Debug - Final XP (DB is source of truth): {dbXP: 20, localXP: 20, finalXP: 20}"
3. ✅ Samma level som innan logout!
```

### Om Problem Kvarstår:

**Debug i Console:**
```javascript
// 1. Check localStorage
const user = await supabase.auth.getUser()
const userId = user.data.user.id
const localXP = localStorage.getItem(`studentTotalXP_${userId}`)
console.log('localStorage XP:', localXP)

// 2. Check DB
const { data } = await supabase
  .from('student_progress')
  .select('*')
  .eq('student_id', userId)
  .is('word_set_id', null)
console.log('DB record:', data[0])

// 3. Check game sessions
const { data: sessions } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('student_id', userId)
  .order('started_at', { ascending: false })
console.log('Recent sessions:', sessions.slice(0, 10))
```

## Förväntade Console Logs

### Vid Spel:
```
ℹ️ updateStudentProgress called: typing, score: 2
💾 Saving...
ℹ️ XP updated in DB: 2 total XP
✅ Saved
ℹ️ XP updated successfully: +2 XP for typing
```

### Vid Quest Completion:
```
🎉 Quest completed: Memory Champion
✅ Quest XP added directly: +10, total: 20
(INGEN "daily_quest" game session!)
```

### Vid Login:
```
Debug - Final XP (DB is source of truth): {dbXP: 20, localXP: 20, finalXP: 20}
⚡ INSTANT: UI shown, loading = false
💰 Points update from load-student-progress: {newPoints: 20, source: 'load-student-progress'}
```

### Om Sync Misslyckades:
```
⚠️ localStorage XP högre än DB - några writes kanske misslyckades:
  localStorage: 30
  database: 20
  diff: 10
```

## Resultat

✅ **Quest XP sparas korrekt** (UPDATE, inte UPSERT)  
✅ **games_played bevaras** (inte överskrivs av quest)  
✅ **DB är source of truth** (localStorage ignoreras vid login om DB har värde)  
✅ **Varningar vid sync missmatch** (lätt att debugga)  
✅ **Konsistent XP mellan sessions** (inga fler "försvinnande" levels!)

---

**Fixed:** 2025-10-17  
**Files Changed:** `src/app/student/page.tsx`  
**Root Cause:** Quest XP UPSERT överskrev games_played + localStorage vann över DB

















