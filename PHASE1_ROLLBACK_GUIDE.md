# Phase 1 Rollback Guide

## 🚨 Om Något Går Fel

Det finns **3 sätt** att backa till hur systemet var före Phase 1.

---

## Method 1: Emergency Rollback Flag (SNABBAST - 10 sekunder)

### Steg:
1. Öppna filen: `src/lib/featureFlags.ts`
2. Hitta raden: `export const EMERGENCY_ROLLBACK = false`
3. Ändra till: `export const EMERGENCY_ROLLBACK = true`
4. Spara filen
5. Refresha browsern (Ctrl+F5)

### Resultat:
✅ ALLA nya features stängs av omedelbart  
✅ Systemet fungerar exakt som före Phase 1  
✅ Ingen kod behöver raderas  
✅ Kan aktiveras igen genom att sätta tillbaka till `false`

---

## Method 2: Individuella Feature Flags (FINARE KONTROLL - 30 sekunder)

Om bara EN feature är problemet, stäng av den specifikt:

### Steg:
1. Öppna: `src/lib/featureFlags.ts`
2. Ändra den problematiska flaggan:

```typescript
export const FEATURE_FLAGS = {
  USE_ANIMATION_QUEUE: false,    // ← Sätt till false om animation queue krånglar
  USE_EVENT_COALESCING: true,    // Andra kan vara kvar
  USE_BEACON_API: true,
}
```

3. Spara och refresha

### Resultat:
✅ Problematisk feature inaktiverad  
✅ Andra features fortsätter fungera  
✅ Kan debugga en feature i taget

---

## Method 3: Radera Nya Filer (KOMPLETT RENSNING - 2 minuter)

### Nya Filer Skapade i Phase 1:
Radera dessa för fullständig rollback:

```
src/lib/featureFlags.ts
src/lib/animationQueue.ts
src/lib/eventCoalescer.ts
src/lib/syncManager.ts
src/components/AnimationQueueDisplay.tsx
src/app/api/sync-beacon/route.ts
src/app/test-animation-queue/page.tsx
PHASE1_IMPLEMENTATION_SUMMARY.md
PHASE1_ROLLBACK_GUIDE.md
```

### Ändrade Filer (Kan Återställas):
Om du ändrade dessa under Phase 1:

```
src/app/student/page.tsx
src/lib/questOutbox.ts
```

**Återställ via Git:**
```bash
git checkout src/app/student/page.tsx
git checkout src/lib/questOutbox.ts
```

**Eller:** Se `BACKUP_BEFORE_PHASE1.md` för ursprungligt tillstånd

---

## Verification Efter Rollback

Efter rollback, verifiera att allt fungerar:

### Checklist:
- [ ] Spela ett spel → XP uppdateras
- [ ] Badge sparas korrekt
- [ ] Streak visas i UI
- [ ] Level up animation fungerar
- [ ] Badges page laddar
- [ ] Inga console errors

---

## Common Issues & Solutions

### Issue: "Feature disabled but still running"
**Problem:** Browser cache  
**Solution:** Hard refresh (Ctrl+F5 eller Cmd+Shift+R)

### Issue: "Console errors about missing modules"
**Problem:** Import errors från raderade filer  
**Solution:** 
1. Sätt `EMERGENCY_ROLLBACK = true` först
2. Sedan radera filer
3. Eller använd git för att återställa imports

### Issue: "Build errors"
**Problem:** TypeScript errors från nya filer  
**Solution:**
```bash
# Radera problematiska filer
rm src/lib/animationQueue.ts
# Eller sätt EMERGENCY_ROLLBACK = true
```

---

## Emergency Contact Points

### If Completely Broken:
1. Set `EMERGENCY_ROLLBACK = true`
2. Hard refresh browser
3. Check console for any remaining errors
4. If still broken: Delete all Phase 1 files (see list above)

### If Partially Working:
1. Disable problematic feature flag
2. Test remaining features
3. Report issue for debugging

---

## Testing Checklist Before Going Live

Before enabling Phase 1 in production:

- [ ] Test rapid XP gains → Coalesces correctly
- [ ] Test multiple animation types → Shows in sequence
- [ ] Test event coalescing → Reduces event count
- [ ] Test beacon API → Sends on page hide
- [ ] Test with slow internet → Beacon still works
- [ ] Test closing tab immediately → Data not lost
- [ ] Test on mobile → Touch interactions work
- [ ] Test with multiple tabs → No conflicts

---

## Rollback Decision Tree

```
Something wrong?
│
├─ Is it critical (data loss, crashes)?
│  └─ YES → EMERGENCY_ROLLBACK = true (immediate)
│
├─ Is it a specific feature?
│  └─ YES → Disable that feature flag
│
├─ Is it a minor bug?
│  └─ YES → Keep enabled, fix bug
│
└─ Unsure?
   └─ EMERGENCY_ROLLBACK = true (safe choice)
```

---

## Phase 1 Files Reference

### Core System Files (New):
- `src/lib/featureFlags.ts` - Master control
- `src/lib/animationQueue.ts` - Animation management
- `src/lib/eventCoalescer.ts` - Event optimization
- `src/lib/syncManager.ts` - Beacon API

### API Endpoints (New):
- `src/app/api/sync-beacon/route.ts` - Receives beacon data

### Testing (New):
- `src/app/test-animation-queue/page.tsx` - Test suite

### Documentation (New):
- `BACKUP_BEFORE_PHASE1.md` - Backup reference
- `PHASE1_ROLLBACK_GUIDE.md` - This file
- `PHASE1_IMPLEMENTATION_SUMMARY.md` - Implementation details

---

## Success Criteria

Phase 1 is successful if:
- ✅ Rapid XP gains show as ONE animation
- ✅ Multiple popups show in sequence (no collisions)
- ✅ Closing tab immediately doesn't lose data
- ✅ Database queries reduced by 70%+
- ✅ No regressions in existing features

If ANY of these fail:
- ⚠️ Consider rollback
- 🔧 Or disable specific feature
- 🧪 Debug in test environment

---

**You are safe! Multiple layers of rollback protection.** 🛡️


















