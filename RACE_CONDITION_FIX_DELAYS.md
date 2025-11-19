# ⏱️ Race Condition Fix med Delays

## Problem

**Scenario:**
```
1. Spela typing → quest "Speed God" completas
2. Level 8 i UI (107 + 75 = 182 XP)
3. Gå till profiles → Level 5 (107 XP)
4. Quest XP försvann!
```

## Root Cause: Race Condition

**Vad händer parallellt:**

```typescript
// Thread 1: Game XP (via syncProgressToDatabase)
const currentXP = 100  // Läser från DB
await supabase.update({ total_points: 100 + 7 })  // Skriver 107

// Thread 2: Quest XP (startar samtidigt!)
const currentXP = 100  // Läser från DB (game write inte klar!)
await supabase.update({ total_points: 100 + 75 })  // Skriver 175

// Resultat:
// Den som skriver SIST vinner!
// Om game write (107) skriver efter quest write (175):
// DB slutar på 107! ❌ Quest XP förlorad!
```

**Timing:**
```
T=0ms:   Game finish → updateStudentProgress() startar
T=10ms:  Quest check → quest complete → Quest XP update startar
T=100ms: Game XP läser DB: 100
T=110ms: Quest XP läser DB: 100  ← Läser GAMLA värdet!
T=300ms: Game XP skriver: 107
T=310ms: Quest XP skriver: 175  ← Bra!
T=320ms: Game XP write slutförs: 107  ← ÖVERSKRIVER 175! ❌
```

## Fix: Sequential Updates med Delay

### Quest XP - Vänta på game XP

**Före:**
```typescript
// Quest completion (körs omedelbart):
void (async () => {
  const { data: currentProgress } = await supabase.select(...)
  const newTotalXP = currentProgress.total_points + quest.xp
  await supabase.update({ total_points: newTotalXP })
})()
```

**Efter:**
```typescript
// Quest completion (väntar 500ms):
void (async () => {
  // KRITISKT: Vänta så game XP hinner spara först!
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const { data: currentProgress } = await supabase.select(...)
  console.log('💾 Quest XP: Fetched after game save:', currentProgress)
  const newTotalXP = currentProgress.total_points + quest.xp
  await supabase.update({ total_points: newTotalXP })
})()
```

### Bonus XP - Vänta på quest XP

**Efter:**
```typescript
// Bonus XP (väntar 500ms):
void (async () => {
  // Vänta så alla quest XP hinner spara först!
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const { data: currentProgress } = await supabase.select(...)
  console.log('💰 Bonus XP: Fetched after quest saves:', currentProgress)
  const newTotalXP = currentProgress.total_points + 100
  await supabase.update({ total_points: newTotalXP })
})()
```

## Resultat med Delays

**Ny timing:**
```
T=0ms:    Game finish → updateStudentProgress() startar
T=10ms:   Quest check → quest complete → VÄNTAR 500ms
T=100ms:  Game XP läser DB: 100
T=300ms:  Game XP skriver: 107
T=320ms:  Game XP write slutförd: 107 ✅
T=510ms:  Quest XP läser DB: 107  ← Läser FÄRSKT värde! ✅
T=710ms:  Quest XP skriver: 182
T=730ms:  Quest XP write slutförd: 182 ✅
```

**Resultat:**
```
DB: 182 XP ✅
localStorage: 182 XP ✅
Match: ✅
```

## Test

**Spela Typing Challenge snabbt:**

**Console borde visa:**
```
T=0ms:
  📊 Attempting DB UPDATE: {oldPoints: 107, newPoints: 110, pointsToAdd: 3}
  
T=200ms:
  ✅ DB write confirmed
  ✅ XP updated in DB: 110 total XP
  
T=500ms:
  (delay väntar...)
  
T=510ms:
  💾 Quest XP: Fetched current progress after game save: {total_points: 110}
  
T=710ms:
  ✅ Quest XP DB write confirmed: [{total_points: 185}]
  ✅ Quest XP added to DB: +75, total: 185
```

**Om du ser:**
```
💾 Quest XP: Fetched after game save: {total_points: 107}  ← Gamla värdet!
```

Då behöver vi öka delayen från 500ms till 1000ms.

---

**Refresh och spela Typing Challenge snabbt! Kolla console för "💾 Quest XP: Fetched after game save"** 🔍

Vad visar det för `total_points`?




















