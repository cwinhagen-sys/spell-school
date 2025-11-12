# 🔍 Debug XP Sync Problem

## Problem
XP stämmer inte mellan:
- **Före logout** → **Efter login**
- **Student** → **Teacher progress report**

Console säger "synced" men XP är olika.

## Debug Script - Kör i Browser Console

### 1. Efter att ha spelat spel (INNAN logout)

```javascript
// Öppna console (F12) och kör:
(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  console.log('👤 User ID:', user.id)
  
  // Check localStorage
  const localKey = `studentTotalXP_${user.id}`
  const localXP = localStorage.getItem(localKey)
  console.log('💾 localStorage XP:', localXP)
  
  // Check database (globalt record)
  const { data: globalRec } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', user.id)
    .is('word_set_id', null)
    .is('homework_id', null)
    .maybeSingle()
  
  console.log('🗄️ DB Global Record:', globalRec)
  
  // Check ALL student_progress records
  const { data: allRecs } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', user.id)
    .order('last_played_at', { ascending: false })
  
  console.log('📊 ALL student_progress records:', allRecs)
  console.log('📊 Total records:', allRecs?.length)
  
  // Check game sessions (vad teacher ser)
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('game_type, score, started_at, finished_at')
    .eq('student_id', user.id)
    .order('started_at', { ascending: false })
    .limit(10)
  
  console.log('🎮 Recent game sessions:', sessions)
  
  // SUMMARY
  console.log('\n═══════════ SUMMARY ═══════════')
  console.log('localStorage XP:', localXP)
  console.log('DB Global XP:', globalRec?.total_points || 0)
  console.log('DB Games Played:', globalRec?.games_played || 0)
  console.log('Total DB Records:', allRecs?.length)
  console.log('Recent Sessions:', sessions?.length)
  console.log('═══════════════════════════════\n')
  
  // ALERT if mismatch
  if (parseInt(localXP || '0') !== (globalRec?.total_points || 0)) {
    console.error('⚠️ MISMATCH DETECTED!')
    console.error('localStorage:', localXP)
    console.error('Database:', globalRec?.total_points)
  } else {
    console.log('✅ localStorage and DB match!')
  }
})()
```

### 2. Efter login (för att se vad som laddades)

```javascript
// Kör samma script som ovan IGEN efter login
// Jämför resultaten!
```

## Vad Letar Vi Efter?

### Scenario A: XP sparas till fel record

**Symptom:**
```
localStorage XP: 100
DB Global XP: 0
Total DB Records: 5  // <- Flera records!
```

**Problem:** XP sparas till specifikt word_set record istället för globalt

**Lösning:** Se vilka records som finns:
```javascript
allRecs.forEach(r => {
  console.log(`Record: word_set=${r.word_set_id || 'NULL'}, homework=${r.homework_id || 'NULL'}, XP=${r.total_points}`)
})
```

### Scenario B: XP sparas men läses inte

**Symptom:**
```
FÖRE LOGOUT:
  localStorage XP: 100
  DB Global XP: 100  ✅

EFTER LOGIN:
  localStorage XP: 0   ❌
  DB Global XP: 100   ✅
```

**Problem:** loadStudentProgress läser fel eller cachen nollställs

**Lösning:** Kolla loadStudentProgress console logs vid login

### Scenario C: Race condition

**Symptom:**
```
Console: "XP updated successfully: +10 XP"
DB Global XP: 90  // Inte 100!
```

**Problem:** Quest XP skriver över game XP (eller vice versa)

**Lösning:** Kolla `last_game_type` i DB:
```javascript
console.log('Last game type:', globalRec?.last_game_type)
console.log('Last played at:', globalRec?.last_played_at)
```

## Quick Fix Test

Om du ser att XP sparas till FEL record (word_set_id != NULL), testa detta:

```javascript
// Force update global record
const { data: { user } } = await supabase.auth.getUser()
const currentLocalXP = parseInt(localStorage.getItem(`studentTotalXP_${user.id}`) || '0')

await supabase
  .from('student_progress')
  .update({ total_points: currentLocalXP })
  .eq('student_id', user.id)
  .is('word_set_id', null)
  .is('homework_id', null)

console.log('✅ Forced update global record to:', currentLocalXP)
```

## Report Results

**Kör scriptet och rapportera:**
1. localStorage XP värde
2. DB Global XP värde
3. Antal student_progress records
4. Om de matchar eller inte
5. last_game_type värde

**Exempel:**
```
localStorage: 120
DB Global: 60
Total Records: 3
Match: ❌ NO
Last game type: quest_completion
```

Detta hjälper mig förstå EXAKT var XP försvinner! 🔍














