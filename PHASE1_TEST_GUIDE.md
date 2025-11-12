# Phase 1 - Test Guide

## ✅ Vad Är Integrerat Nu

### I Student Dashboard:
1. ✅ **Level Up** → Går genom animation queue
2. ✅ **Streak** → Går genom animation queue  
3. ✅ **XP Gains** → Kombineras till en animation
4. ✅ **Feature Flags** → Kan stängas av när som helst

### Backup/Fallback:
- ✅ Gamla systemet finns kvar
- ✅ Feature flags väljer mellan ny/gammal
- ✅ `EMERGENCY_ROLLBACK = true` → Allt blir som förut

---

## 🧪 Test Nu (På Riktigt!)

### Test 1: Level Up via Queue

1. **Gå till student dashboard:** `/student`
2. **Öppna console** (F12)
3. **Spela spel tills du får level up**
4. **Du ska se:**
   ```
   🎛️ Feature Flags Status:
   ✅ USE_ANIMATION_QUEUE
   ✅ USE_EVENT_COALESCING
   ✅ USE_BEACON_API
   ✅ DEBUG_MODE
   
   [AnimQueue] Enqueued level_up: {...}
   [AnimQueue] Showing level_up: {...}
   ```
5. **Level up animation visas**
6. **Klicka för att dismissa**
7. **Om det finns fler animations (streak, badge) visas de efter!**

---

### Test 2: Streak via Queue

1. **Logga in på nytt konto** (eller använd `/test-streak` för reset)
2. **Spela första spelet för dagen**
3. **Du ska se:**
   ```
   [AnimQueue] Enqueued streak: {streak: 1}
   [AnimQueue] Showing streak: {streak: 1}
   ```
4. **Streak animation visas**
5. **INGEN krock med level up!** ✅

---

### Test 3: Sequence (Flera Animations)

1. **Spela ett spel som ger både level up OCH streak**
2. **Du ska se animationer i ORDNING:**
   - Animation 1: Level up (priority 5)
   - Dismiss →
   - Animation 2: Streak (priority 4)
   - **INGEN overlap!** ✅

---

### Test 4: Rapid Games (XP Coalescing)

1. **Spela 3 spel snabbt efter varandra**
2. **XP ska buffras och visas som EN animation med total**
3. **Console ska visa:**
   ```
   [AnimQueue] Buffering XP: +10 (Total: 10, Count: 1)
   [AnimQueue] Buffering XP: +15 (Total: 25, Count: 2)
   [AnimQueue] Buffering XP: +12 (Total: 37, Count: 3)
   [AnimQueue] Flushing XP buffer: +37 from 3 events
   ```

---

## 🚨 Rollback Om Problem

### Om Level Up Inte Fungerar:

```typescript
// src/lib/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_ANIMATION_QUEUE: false,  // ← Sätt till false
  // ...
}
```

**Refresha → Gamla level up fungerar igen!**

---

### Om Total Katastrof:

```typescript
export const EMERGENCY_ROLLBACK = true  // ← Aktivera
```

**ALLT stängs av omedelbart!**

---

## 📊 Vad Du Ska Se

### I Console (Med DEBUG_MODE):
```
🎛️ Feature Flags Status:
  ✅ USE_ANIMATION_QUEUE
  ✅ USE_EVENT_COALESCING  
  ✅ USE_BEACON_API
  ✅ DEBUG_MODE

[AnimQueue] Enqueued level_up: {level: 15, ...}
[AnimQueue] Showing level_up: {level: 15, ...}
[AnimQueue] Dismissing current animation
[AnimQueue] Showing streak: {streak: 3}
```

### På Skärmen:
- Level up i ny stil (diskret, rundad)
- Streak animation
- Inga kollisioner
- Smooth transitions

---

## 🎯 Success Criteria

Phase 1 är successful om:
- [  ] Level up visas via queue
- [  ] Streak visas via queue
- [  ] Flera animations visas i sekvens (ingen krock)
- [  ] Beacon test fungerar på `/test-animation-queue`
- [  ] Inga regressions (allt annat fungerar som förut)

---

## 🐛 Troubleshooting

### "Animations visas inte alls"
→ Kolla console för `[AnimQueue]` meddelanden  
→ Om de finns: Rendering problem  
→ Om de saknas: Feature flag problem

### "Gamla animations visas fortfarande"
→ Hard refresh (Ctrl+Shift+F5)  
→ Verify feature flags är ON

### "Build errors"
→ Check console för specifika errors  
→ Använd rollback om nödvändigt

---

## ✅ Nästa Steg (Om Allt Fungerar)

1. Integrera badges med queue
2. Integrera quest complete med queue
3. Setup Beacon lifecycle (auto-sync på close)
4. Event coalescing i questOutbox

**Men först: TESTA DETTA!** 🧪

Spela några spel och se om level up + streak fungerar smooth utan kollisioner! 🚀

















