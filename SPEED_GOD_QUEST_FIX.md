# ⚡ Speed God Quest Fix

## Problem

"Speed God" quest triggar inte trots att man får under 25 sekunder på Typing Challenge.

## Root Cause

**Quest Logic:**
```typescript
case 'typing_speed':
  if (gameType === 'typing' && score <= 25) {  // Vill ha duration
    quest.progress = quest.target
  }
```

**Typing Challenge skickade:**
```typescript
onScoreUpdate(accuracyPercentage, points, 'typing')
//            ↑ Accuracy (0-100), inte duration!
```

**Resultat:**
```
Score: 100 (accuracy)
Quest check: 100 <= 25? ❌ NO
Quest triggas inte!
```

## Fix

### TypingChallenge.tsx

**Före:**
```typescript
onScoreUpdate(accuracyPercentage, points, 'typing')
//            ↑ 100 (accuracy)
```

**Efter:**
```typescript
const duration = Math.floor((Date.now() - startedAt) / 1000)
onScoreUpdate(duration, points, 'typing')
//            ↑ 23 (sekunder)
```

### student/page.tsx

**Tillagd logging:**
```typescript
if (gameType === 'typing' && score <= 25) {
  console.log('⚡ Speed God quest triggered!', { duration: score })
  quest.progress = quest.target
} else if (gameType === 'typing') {
  console.log('⏱️ Too slow for Speed God:', { duration: score, target: 25 })
}
```

## Resultat

**Nu när du spelar Typing Challenge under 25 sekunder:**

```
Console:
Calling onScoreUpdate with: {score: 23, points: 2, duration: 23}
⚡ Speed God quest triggered! {duration: 23, target: 25}
Quest completed: Speed God
✅ Quest XP added to DB: +75
```

**Om det tar längre tid:**
```
Console:
Calling onScoreUpdate with: {score: 32, points: 2, duration: 32}
⏱️ Typing duration too slow for Speed God: {duration: 32, target: 25}
```

## Test

1. Spela Typing Challenge
2. Försök få under 25 sekunder
3. Kolla console för:
   - `⚡ Speed God quest triggered!` ✅
   - Eller `⏱️ Too slow` (om över 25 sek)

**Refresh och testa! Spela Typing Challenge snabbt!** ⚡




















