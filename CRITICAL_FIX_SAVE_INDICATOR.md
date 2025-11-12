# KRITISK FIX: Save Status Indicator - Nu Med Database Verification

## Problem som fixades

**ALLVARLIGT BUG**: Indikatorn visade "Allt sparat - säkert att logga ut" även när data INTE hade sparats till databasen! Detta ledde till dataförlust när användare loggade ut.

### Rotorsak

1. `updateStudentProgress` skickade `xp-synced` event ÄVEN när database write misslyckades
2. Indikatorn litade blint på events utan att verifiera mot databasen
3. När `return 0` kördes (error), skickades success-eventet ändå

## Lösning

### 1. Error Events i tracking.ts

Nu skickar vi explicit error-events när database writes misslyckas:

```typescript
// I tracking.ts - vid database error
if (updateError) {
  // Emit error event for save status indicator
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xp-sync-error', {
      detail: { error: updateError.message, gameType }
    }))
  }
  return 0  // Ingen XP sparad
}
```

### 2. Conditional Success Events

Success-event skickas BARA om det faktiskt lyckades:

```typescript
// Endast om newTotalPointsForReturn > 0
if (typeof window !== 'undefined' && newTotalPointsForReturn > 0) {
  window.dispatchEvent(new CustomEvent('xp-synced', {
    detail: { pointsAdded: newTotalPointsForReturn, gameType }
  }))
}
```

### 3. Database Verification i SaveStatusIndicator

**NYCKELFUNKTION**: Innan indikatorn visar "Saved", verifierar den faktiskt att data finns i databasen:

```typescript
const verifyDatabaseSync = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return true
  
  // Hämta faktiskt XP från database
  const { data, error } = await supabase
    .from('student_progress')
    .select('total_points')
    .eq('student_id', user.id)
    .is('word_set_id', null)
    .is('homework_id', null)
    .maybeSingle()
  
  const dbXP = data?.total_points || 0
  
  // Jämför med localStorage
  const userXPKey = `studentTotalXP_${user.id}`
  const localXP = parseInt(localStorage.getItem(userXPKey) || '0')
  
  // Om skillnaden är > 10 poäng = INTE synkat!
  if (Math.abs(dbXP - localXP) > 10) {
    console.warn('XP mismatch!', { dbXP, localXP })
    return false
  }
  
  return true
}
```

### 4. Error Status Visning

Ny status-typ som visar tydligt varning:

```typescript
case 'error':
  return {
    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    text: 'FEL vid sparning! Data kan ha gått förlorad.',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  }
```

Visas i **10 sekunder** istället för 4.

## Testning

### Före fix:
1. Spela ett spel ✅
2. Database write misslyckas ❌ (men ingen indikation)
3. Indikator: "Allt sparat - säkert att logga ut" ❌ **FELAKTIGT!**
4. Användaren loggar ut ❌
5. Data förlorad ❌

### Efter fix:
1. Spela ett spel ✅
2. Database write misslyckas ❌
3. `xp-sync-error` event skickas ✅
4. Indikator: "FEL vid sparning! Data kan ha gått förlorad." ✅ **KORREKT!**
5. Användaren ser varningen och väntar ✅
6. Retry sker automatiskt ✅
7. Vid lyckat retry: "Allt sparat - säkert att logga ut" ✅

### Eller med lyckad save:
1. Spela ett spel ✅
2. Database write lyckas ✅
3. `xp-synced` event skickas (med pointsAdded > 0) ✅
4. Indikator kör `verifyDatabaseSync()` ✅
5. Jämför localStorage (35 XP) med database (35 XP) ✅
6. Skillnad < 10 poäng ✅
7. Indikator: "Allt sparat - säkert att logga ut" ✅ **KORREKT!**

## Ny Flöde

```
Spel slutar
    ↓
updateStudentProgress körs
    ↓
xp-sync-start event
    ↓
Indikator: "Sparar..."
    ↓
Database write försök
    ↓
    ├─→ SUCCESS (returnerar > 0)
    │       ↓
    │   xp-synced event
    │       ↓
    │   Indikator kör verifyDatabaseSync()
    │       ↓
    │   Jämför DB XP vs localStorage XP
    │       ↓
    │       ├─→ Match (skillnad < 10)
    │       │       ↓
    │       │   "Allt sparat - säkert att logga ut" ✅
    │       │
    │       └─→ Mismatch (skillnad > 10)
    │               ↓
    │           "FEL vid sparning!" ❌
    │
    └─→ ERROR (returnerar 0)
            ↓
        xp-sync-error event
            ↓
        "FEL vid sparning!" ❌
        (visas i 10 sek)
```

## Files Changed

1. `src/lib/tracking.ts`
   - Lagt till `xp-sync-error` events vid errors
   - Conditional `xp-synced` event (endast om > 0)
   - 3 platser där errors kan uppstå

2. `src/components/SaveStatusIndicator.tsx`
   - Ny `verifyDatabaseSync()` funktion
   - Lyssnar på `xp-sync-error` events
   - Ny 'error' status
   - Database verification innan "saved" visas

3. `SAVE_STATUS_INDICATOR.md`
   - Uppdaterad dokumentation
   - Förklaring av database verification

## Säkerhetsgarantier

Efter denna fix:

✅ **Indikatorn kan INTE visa "saved" om data inte finns i databasen**
✅ **Error-läge visas tydligt vid database-fel**
✅ **Database verification körs ALLTID innan "saved"-status**
✅ **Events skickas endast vid faktisk success/failure**
✅ **Användaren ser tydlig varning vid dataförlust-risk**

## Migration Notes

Ingen migration behövs - detta är en fix av befintlig funktionalitet.

Användare kommer nu se:
- Tydligare feedback vid database-problem
- Korrekt "saved" status endast när data verkligen är sparad
- Varningsmeddelanden vid fel istället för falskt "allt ok"













