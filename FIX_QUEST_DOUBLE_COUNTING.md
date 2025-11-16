# 🐛 Fix: Quest Dubbel-Räkning

## Problem

Quests räknades **dubbelt**:
- Memory Champion: Spelade 1 spel → visade 2/2 ❌
- Multi-Game Player: Spelade 1 speltyp → visade 2/4 ❌

## Orsak

**Dubbel-synk till database:**

```typescript
// Flöde när ett spel slutar:
1. Quest progress ökar lokalt: progress = 1
2. saveDailyQuestsToDB(quests) 
   → Skriver progress = 1 till DB
3. enqueueQuestProgress(quest.id, delta=1)
   → Skickar delta som LÄGGS TILL i DB
4. quest-sync API tar emot delta
   → Kör: progress = progress + delta = 1 + 1 = 2
5. Resultat: DB har nu progress = 2! ❌
```

## Lösning

**Ta bort saveDailyQuestsToDB()** - använd bara quest outbox:

```typescript
// Före (dubbel-synk):
localStorage.setItem(...)
saveDailyQuestsToDB(quests)  ← Direkt DB write med progress
enqueueQuestProgress(id, delta)  ← Delta som LÄGGS TILL

// Efter (enbart outbox):
localStorage.setItem(...)
enqueueQuestProgress(id, delta)  ← ENDAST detta!
// Quest outbox hanterar DB-synk med delta-baserat system
```

**Även disabled:**
```typescript
// Disabled vid login för att undvika merge-problem:
// const merged = await syncDailyQuestsFromDB(localQuests)
// setDailyQuests(merged)

// Nu: Bara läs från localStorage
const localQuests = generateDailyQuests(user?.id)
setDailyQuests(localQuests)
```

## Vad Händer Nu

### Vid Spel:
```
1. Quest progress ökar lokalt: 0 → 1
2. Sparas till localStorage (instant backup)
3. enqueueQuestProgress('memory_2', delta=1)
4. Quest outbox batchar och skickar till API
5. API kör: INSERT ... ON CONFLICT DO UPDATE SET progress = progress + 1
6. DB får korrekt progress = 1 ✅
```

### Vid Login:
```
1. Läs från localStorage → progress = 1
2. SKIPPAR DB merge (undviker konflikter)
3. Quest outbox flush:ar pending events
4. localStorage är master, DB uppdateras via outbox ✅
```

## Test

**Scenario 1: Spela Memory**
```
Spel 1 → Memory Champion: 1/2 ✅
Logga ut/in → Memory Champion: 1/2 ✅ (inte 2/2!)
Spel 2 → Memory Champion: 2/2 → Completed! ✅
```

**Scenario 2: Multi-Game Player**
```
Typing → playedGames: ["typing"], progress: 1/4 ✅
Choice → playedGames: ["typing", "choice"], progress: 2/4 ✅
Logga ut/in → progress: 2/4 ✅ (inte 4/4!)
```

## Dokumentation

- localStorage = source of truth för quests
- Quest outbox = robust sync till DB (delta-baserat)
- Ingen merge från DB = undviker dubbel-räkning

---

*Fixed: 2025-10-16*  
*Root cause: Dubbel-synk via saveDailyQuestsToDB + enqueueQuestProgress*

















