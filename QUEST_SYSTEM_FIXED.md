# ✅ Quest System - Dubbel-Räkning Fixad

## Problem Som Fixades

1. ❌ **Memory Champion**: 1 spel → visade 2/2
2. ❌ **Multi-Game Player**: 1 speltyp → visade 2/4  
3. ❌ **Quest progress resetades** vid logout/login

## Orsaker

### 1. Dubbel-Synk
```typescript
// Två synk-metoder körde samtidigt:
saveDailyQuestsToDB(quests)        // Absoluta värden
enqueueQuestProgress(id, delta)    // Delta som LÄGGS TILL
// → Resultat: Dubbel-räkning!
```

### 2. Quest Outbox Delta-System
```typescript
// quest-sync API:
progress = existing.progress + delta
// Om både absolute upsert OCH delta körs → dubblering!
```

## Lösning

### ✅ Använd BARA saveDailyQuestsToDB()

```typescript
// Removed från kod:
❌ enqueueQuestProgress(quest.id, delta)
❌ enqueueQuestComplete(quest.id, xp)

// Behålls:
✅ saveDailyQuestsToDB(quests)  // Absoluta progress-värden
```

### ✅ Rensa Quest Outbox Vid Login

```typescript
// Vid startup:
const pendingEvents = await questOutbox.getPendingEvents()
if (pendingEvents.length > 0) {
  console.log('🧹 Clearing old quest outbox events')
  await questOutbox.clearAll()
}
```

### ✅ DB är Source of Truth Vid Merge

```typescript
// Före (kunde skapa konflikter):
const mergedProgress = Math.max(localProgress, dbProgress)

// Efter (DB vinner):
const mergedProgress = dbProgress
```

## Hur Det Fungerar Nu

### Vid Spel:
```
1. Quest progress ökar lokalt: 0 → 1
2. Sparas till localStorage (instant)
3. saveDailyQuestsToDB() → DB får progress = 1 (absolut värde)
4. ✅ Korrekt progress!
```

### Vid Login:
```
1. Läs från localStorage → progress = 1
2. Merge från DB → progress = 1 (DB är master)
3. ✅ Progress behålls!
```

### Ingen Dubbel-Räkning:
```
LocalStorage: progress = 1
DB: progress = 1
Merge: progress = 1
✅ Konsistent!
```

## Test Efter Fix

**Scenario: Memory Champion (target: 2)**

```bash
# Spel 1:
Memory game → progress: 1/2 ✅
localStorage: {memory_2: {progress: 1}}
DB: progress = 1

# Logga ut och in:
Merge från DB → progress: 1/2 ✅

# Spel 2:
Memory game → progress: 2/2 → Completed! ✅
```

**Scenario: Multi-Game Player (target: 4)**

```bash
# Spel 1 (Typing):
playedGames: ["typing"]
progress: 1/4 ✅

# Spel 2 (Choice):
playedGames: ["typing", "choice"]
progress: 2/4 ✅

# Logga ut och in:
Merge från DB → progress: 2/4 ✅ (inte 4/4!)
```

## Cleanup Needed

**Rensa gamla duplikerade data i DB:**

```sql
-- För varje student, behåll bara senaste progress (högsta värdet)
UPDATE daily_quest_progress dp1
SET progress = (
  SELECT MAX(progress)
  FROM daily_quest_progress dp2
  WHERE dp2.user_id = dp1.user_id
  AND dp2.quest_id = dp1.quest_id
  AND dp2.quest_date = dp1.quest_date
)
WHERE quest_date = CURRENT_DATE;
```

**Eller starta om från scratch:**

```sql
-- Radera dagens progress (startar från 0 igen)
DELETE FROM daily_quest_progress
WHERE quest_date = CURRENT_DATE;
```

---

*Fixed: 2025-10-16*  
*Method: Absoluta progress-värden, disabled delta-baserad quest outbox*















