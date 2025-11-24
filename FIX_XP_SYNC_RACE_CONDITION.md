# 🐛 Fix: XP Synk Race Condition

## Problem

**Scenario:**
```
1. Spela spel → UI visar Level 8 (localStorage: 120 XP)
2. Logga ut
3. Teacher ser Level 4 (DB: 60 XP)
4. Logga in igen → Level 3 (45 XP)?!
```

**XP försvinner mellan sessions!** ❌

## Orsaker

### 1. Quest XP Överskriver games_played

```typescript
// Quest completion:
await supabase.from('student_progress').upsert({
  total_points: newTotalXP,
  games_played: 0  // ← ÖVERSKRIVER värde från spel!
})

// Resultat:
Spel 1: {total_points: 2, games_played: 1}
Spel 2: {total_points: 4, games_played: 2}
Quest: {total_points: 14, games_played: 0}  ← RACE! Förstör data
```

### 2. localStorage "Vinner" över DB vid Login

```typescript
// Vid login:
const finalXP = Math.max(localXP, dbXP)
// localStorage: 120 (optimistiskt, kanske inte sparat)
// DB: 60 (faktiskt sparat)
// Resultat: Använder 120 men när DB är 60 → förvirring
```

### 3. UPSERT med Incomplete Data

`UPSERT` med `games_played: 0` överskriver existerande data istället för att bara uppdatera `total_points`.

## Lösningar

### ✅ 1. Använd UPDATE istället för UPSERT för Quest XP

```typescript
// Före (UPSERT - överskriver allt):
await supabase.from('student_progress').upsert({
  total_points: newTotalXP,
  games_played: 0  // ← Dåligt!
})

// Efter (UPDATE - endast specifika fält):
if (currentProgress) {
  await supabase.from('student_progress').update({
    total_points: newTotalXP
    // INTE games_played! Bevaras automatiskt
  }).eq('student_id', user.id).is('word_set_id', null)
}
```

### ✅ 2. DB är Source of Truth vid Login

```typescript
// Före (localStorage kunde vinna):
const finalXP = Math.max(localXP, dbXP)

// Efter (DB vinner):
const finalXP = dbXP > 0 ? dbXP : localXP
// Använd localStorage bara om DB är tom
```

### ✅ 3. Logga Varning vid Mismatch

```typescript
if (localXP > dbXP && dbXP > 0) {
  console.warn('⚠️ localStorage högre än DB - sync misslyckades:', {
    localStorage: localXP,
    database: dbXP,
    diff: localXP - dbXP
  })
}
```

## Resultat

### Före:
```
Play games → localStorage: 120, DB: 60 (quest XP misslyckades)
Logout → 
Login → Använder max(120, 60) = 120 lokalt
Men teacher ser 60
Logout/login igen → Använder max(0, 60) = 60
Level sjunker! ❌
```

### Efter:
```
Play games → localStorage: 120, DB: 120 (allt sparas)
Logout →
Login → Använder DB = 120
Teacher ser 120
✅ Konsistent överallt!
```

## Test

**Scenario:**
```
1. Spela 3 spel + complete 2 quests
2. Console visar:
   - updateStudentProgress: total: 6 (spel)
   - Quest XP: +20 (quests)
   - Total: 26 XP
3. Logga ut
4. Teacher progress report: 26 XP ✅
5. Logga in
6. Student dashboard: 26 XP ✅
7. KONSISTENT!
```

## Debug

Om XP fortfarande försvinner, kör i console vid login:

```javascript
const user = await supabase.auth.getUser()
const userId = user.data.user.id

// Check localStorage
const localXP = localStorage.getItem(`studentTotalXP_${userId}`)
console.log('Local XP:', localXP)

// Check DB
const { data } = await supabase
  .from('student_progress')
  .select('*')
  .eq('student_id', userId)
  .is('word_set_id', null)
  
console.log('DB XP:', data[0])
```

---

*Fixed: 2025-10-16*  
*Root cause: Quest XP överskrev games_played + localStorage vann över DB*





















