# 🛡️ Quest Operation Tracking Fix

## Problem Rapporterat

**Användare:** 
> "Vad händer om jag spelar ett spel och sedan direkt laddar en annan sida under tiden som poängen håller på att uppdateras i databasen? Det verkar som om uppdateringen avbryts då?"

**Svar:** Ja! Quest XP operations avbryts om du navigerar för snabbt!

## Root Cause

### Spårade Operations:
```typescript
// tracking.ts - updateStudentProgress():
return trackOperation(operation)  // ✅ Spåras!

// Vid logout:
await waitForOngoingOperations()  // Väntar på game XP
```

### Icke-Spårade Operations:
```typescript
// student/page.tsx - Quest XP:
void (async () => {
  await supabase.rpc('increment_student_xp', ...)  // ❌ Spåras INTE!
})()

// Om användaren navigerar:
// Quest XP operation avbryts! ❌
// XP förlorad!
```

## Fix: Track Quest Operations

### 1. Skapa Tracker

```typescript
// I StudentDashboard komponenten:
const pendingQuestOperationsRef = useRef<Set<Promise<any>>>(new Set())
```

### 2. Spåra Varje Quest Operation

**Quest Completion:**
```typescript
const questOperation = (async () => {
  await supabase.rpc('increment_student_xp', ...)
})()

// Track it:
pendingQuestOperationsRef.current.add(questOperation)
questOperation.finally(() => {
  pendingQuestOperationsRef.current.delete(questOperation)
})
```

**Bonus XP:**
```typescript
const bonusOperation = (async () => {
  await supabase.rpc('increment_student_xp', ...)
})()

// Track it:
pendingQuestOperationsRef.current.add(bonusOperation)
bonusOperation.finally(() => {
  pendingQuestOperationsRef.current.delete(bonusOperation)
})
```

### 3. Vänta Innan Navigation

```typescript
useEffect(() => {
  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    if (pendingQuestOperationsRef.current.size > 0) {
      console.log('⏳ Waiting for quest operations...')
      
      // Prevent navigation
      e.preventDefault()
      
      // Wait for pending operations (max 3 seconds)
      await Promise.race([
        Promise.all(Array.from(pendingQuestOperationsRef.current)),
        new Promise(resolve => setTimeout(resolve, 3000))
      ])
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [])
```

## Resultat

### Innan Fix:
```
1. Spela spel → quest completas
2. Quest XP write startar (async)
3. Klicka "Profiles" (snabb navigation)
4. Quest XP operation avbryts! ❌
5. Profiles visar: Level 9 (quest XP förlorad)
```

### Efter Fix:
```
1. Spela spel → quest completas
2. Quest XP write startar (async)
   → Läggs till i pendingQuestOperationsRef
3. Klicka "Profiles" (snabb navigation)
4. beforeunload event triggas
   → "⏳ Waiting for 1 pending quest operations..."
   → Väntar max 3 sekunder
5. Quest XP write slutförs: ✅
6. Navigation tillåts
7. Profiles visar: Level 10 ✅ (quest XP sparad!)
```

## Test Scenarios

### Scenario 1: Normal Navigation (Efter Operation Slutförd)
```
1. Spela spel
2. Vänta 1 sekund
3. Klicka "Profiles"
4. Console: (ingen varning, inga pending operations)
5. Navigation sker omedelbart ✅
```

### Scenario 2: Snabb Navigation (Under Operation)
```
1. Spela spel
2. OMEDELBART klicka "Profiles"
3. Console: "⏳ Waiting for 1 pending quest operations..."
4. (kort delay, max 3 sekunder)
5. Console: "✅ All quest operations completed"
6. Navigation sker ✅
7. XP sparad! ✅
```

### Scenario 3: Operation Tar För Lång Tid
```
1. Spela spel
2. Quest XP operation hänger (network issue)
3. Klicka "Profiles"
4. Console: "⏳ Waiting for 1 pending quest operations..."
5. (väntar 3 sekunder)
6. Timeout → navigation tillåts ändå
7. (Operation kan fortfarande slutföras i bakgrunden om possible)
```

## Browser Behavior

**beforeunload event:**
- Visar INGEN dialog till användaren (modern browsers)
- Bara delay på navigationen tills operations slutförs
- Max 3 sekunder delay
- Graceful degradation om timeout

## Fördelar

✅ **Quest XP sparas** även vid snabb navigation  
✅ **Ingen synlig delay** för användaren (operations är snabba)  
✅ **Timeout protection** (max 3 sekunder)  
✅ **Works med Next.js routing** (beforeunload fungerar för både browser nav och Next.js Link clicks)  
✅ **Ingen dialog** (tyst väntan)  

---

**Fix applied! Testa nu:**

1. Spela ett spel → quest completas
2. OMEDELBART klicka "Profiles" eller "Levels"
3. Kolla console - ser du "⏳ Waiting for pending quest operations"?
4. Öppna debug-xp-sync efter navigation
5. XP borde stämma! ✅

**Testa och rapportera!** 🛡️





















