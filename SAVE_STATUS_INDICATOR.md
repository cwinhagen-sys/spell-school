# Save Status Indicator - Dokumentation

## Översikt

En alltid-aktiv indikator som visar när det är säkert att logga ut eller navigera bort från sidan. Indikatorn övervakar alla pågående sparoperationer och visar tydligt när all data har sparats till databasen.

## Funktioner

### Status-lägen

1. **Checking** (Grå)
   - Indikatorn kontrollerar pågående operationer
   - Visas bara under initial laddning

2. **Saving** (Blå, spinner)
   - Data sparas just nu till databasen
   - Visar "Sparar..."
   - **⚠️ INTE säkert att logga ut!**

3. **Pending** (Orange, varning)
   - Det finns osparad data som väntar på att sparas
   - Visar antal pågående operationer: "Sparar data (X kvar)... Vänta!"
   - **⚠️ INTE säkert att logga ut!**

4. **Saved** (Grön, bock)
   - All data är sparad
   - Visar "Allt sparat - säkert att logga ut"
   - Visar tidsstämpel när sparningen slutfördes
   - ✅ **Säkert att logga ut eller navigera!**
   - Döljs automatiskt efter 4 sekunder (om ingen ny data finns)

## Vad övervakas?

Indikatorn övervakar följande:

1. **Quest Outbox** (IndexedDB/localStorage)
   - Dagliga quest-framsteg
   - Quest-slutföranden och XP-belöningar
   - Alla event som väntar på att skickas till servern

2. **Pending Game Sessions** (localStorage)
   - Game sessions som inte kunde sparas och väntar på retry
   - Backup-data från misslyckade databasoperationer

3. **Live Database Operations** (via events)
   - XP-uppdateringar från spel
   - Student progress tracking
   - Database write success/failure
   - Alla andra pågående databasoperationer

4. **Database Verification** (direkt query)
   - **NYT!** Verifierar faktiskt att data finns i databasen
   - Jämför localStorage XP med database XP
   - Visar error om det finns mismatch (> 10 poäng skillnad)

## Teknisk implementation

### Events som lyssnas på:

```typescript
// När sync startar
window.dispatchEvent(new CustomEvent('xp-sync-start'))

// När XP har synkats FRAMGÅNGSRIKT (bara om pointsAdded > 0)
window.dispatchEvent(new CustomEvent('xp-synced', {
  detail: { pointsAdded: number, gameType: string }
}))

// **NYT!** När XP sync MISSLYCKAS
window.dispatchEvent(new CustomEvent('xp-sync-error', {
  detail: { error: string, gameType: string }
}))

// När quest sync är klar
window.dispatchEvent(new CustomEvent('quest-sync-complete', {
  detail: { eventsSynced: number }
}))

// När quest data läggs till i outbox
window.dispatchEvent(new CustomEvent('quest-enqueued', {
  detail: { eventId: string }
}))
```

### Kontrollfrekvens

- Kontrollerar pending operationer var **1 sekund**
- Lyssnar aktivt på sync events för omedelbar uppdatering
- **VIKTIGT:** Verifierar mot databasen INNAN "Saved" visas
- Visar "Saved" status i **4 sekunder** innan den döljs
- Visar "Error" status i **10 sekunder** vid database-fel

### Placering

- Fast position i **nedre högra hörnet** (bottom-right)
- Z-index 50 för att alltid vara synlig
- Animeras in/ut med framer-motion

## Användning

### Student Dashboard

```tsx
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

export default function StudentDashboard() {
  return (
    <div>
      {/* Din dashboard kod */}
      
      <SaveStatusIndicator />
    </div>
  )
}
```

### Teacher Dashboard

Samma som ovan - komponenten fungerar universellt för alla användare.

## Bästa praxis för användare

### När det är säkert att logga ut:

✅ Indikatorn visar "Allt sparat - säkert att logga ut" (grön)
✅ Indikatorn är inte synlig (allt redan sparat)

### När det INTE är säkert att logga ut:

❌ Indikatorn visar "Sparar..." (blå)
❌ Indikatorn visar "Sparar data (X kvar)... Vänta!" (orange)
❌ Du ser spinner-ikonen

### Tips för användare:

1. **Efter spel**: Vänta tills du ser grön "Saved" status eller tills indikatorn försvinner
2. **Vid utloggning**: Kolla att indikatorn inte är orange eller blå
3. **Vid navigering**: Om du ser orange/blå status, vänta några sekunder
4. **Offline**: Om du är offline kommer indikatorn visa pending tills du är online igen

## Felsökning

### Indikatorn visar alltid "Pending"

1. Kontrollera browser console för errors
2. Öppna IndexedDB i DevTools och kolla `quest-outbox` databasen
3. Kontrollera localStorage för `quest_outbox_*` och `pendingSession_*` nycklar
4. Kör `await questOutbox.getStatus()` i console för att se status

### Indikatorn visas inte alls

1. Kontrollera att komponenten är renderad i DOM (inspect element)
2. Kolla om det finns CSS-konflikter med z-index
3. Testa att trigga en sync genom att spela ett spel

### Data sparas inte trots grön status

1. **Detta är nu OMÖJLIGT** - indikatorn verifierar mot databasen innan "Saved" visas
2. Om du ändå ser detta problem:
   - Kolla browser console för "XP mismatch" warnings
   - Verifiera localStorage-nyckel: `studentTotalXP_${userId}`
   - Kontrollera database: `SELECT * FROM student_progress WHERE student_id = '...' AND word_set_id IS NULL`
3. Om XP mismatch > 10 poäng kommer indikatorn visa **ERROR** istället för "Saved"

## Framtida förbättringar

Möjliga tillägg:

- [ ] Visa specifika operationer som pågår (inte bara antal)
- [ ] Manual sync-knapp vid behov
- [ ] Offline-mode indikation
- [ ] Retry-knapp vid misslyckad sync
- [ ] Detaljerad sync-historik
- [ ] Settings för att justera position/stil
- [ ] Toast notifications för viktiga händelser

## Integration med befintliga system

### Quest Outbox System
- Automatisk integration via events
- Ingen kod-ändring behövs i `questOutbox.ts` (redan implementerat)

### Tracking System
- Events läggs till i `updateStudentProgress`
- `xp-sync-start` vid start
- `xp-synced` vid slutförande

### Game Sessions
- Använder befintliga localStorage backup-mekanismer
- Kontrollerar `pendingSession_*` nycklar

## Säkerhet och prestanda

### Prestanda
- Minimal overhead (1s polling)
- Använder effektiva localStorage/IndexedDB-operationer
- Memoization där möjligt
- Automatisk cleanup av event listeners

### Säkerhet
- Ingen känslig data exponeras i UI
- Endast status och antal visas
- Logs för debugging kan innehålla IDs men ingen användardata

## Support

Vid problem, kontakta utvecklaren eller öppna en issue i GitHub-repot.

