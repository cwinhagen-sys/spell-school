# 🔥 Streak System - Komplett Guide

## Översikt

Ett komplett streak-system som spårar hur många dagar i rad en elev har loggat in OCH spelat minst ett spel. Systemet inkluderar databas-persistens, cool animationer och smart logik för att hantera daggränser.

## Funktioner

### ✅ Core Features
1. **Daglig Räkning** - Räknar endast dagar då eleven spelade minst 1 spel
2. **Streak Bevaras** - Om eleven spelar idag ELLER igår, bevaras streak
3. **Auto-Reset** - Om eleven missar en hel dag (inte spelar idag eller igår), reset till 0
4. **Första Spel Trigger** - Streak ökar endast vid första spelet för dagen
5. **Databas-Persisterad** - Sparas i Supabase för cross-session/cross-device sync
6. **Cool Animation** - Visar "eldig siffra" animation när streak ökar

### 🎨 UI Features
- **Level Grid Display** - Visar 🔥 emoji + streak count
- **Best Streak** - Visar högsta streak någonsin (👑)
- **Milestone Animation** - Full-screen celebration vid streak ökning
- **Adaptive Messaging** - Olika meddelanden beroende på streak-nivå

## Installation

### Steg 1: Database Setup
Kör SQL-filen i din Supabase SQL Editor:

```bash
streak-system-setup.sql
```

Detta skapar:
- ✅ `student_streaks` tabell
- ✅ RLS policies
- ✅ RPC funktioner (`update_streak_after_game`, `get_current_streak`)
- ✅ Indexes för performance

### Steg 2: Verifiera Installation
Efter att ha kört SQL-filen, kör denna query:

```sql
SELECT * FROM pg_policies WHERE tablename = 'student_streaks';
```

Du ska se 3 policies:
- Users can view their own streak
- Users can insert their own streak
- Users can update their own streak

## Hur Det Fungerar

### Streak Logik

```
Dag 1: Elev spelar första spelet → Streak = 1 🎉
Dag 2: Elev spelar första spelet → Streak = 2 🔥
Dag 3: Elev spelar första spelet → Streak = 3 🔥
Dag 3: Elev spelar andra spelet → Streak = 3 (ingen förändring)
Dag 5: Elev spelar (hoppade över dag 4) → Streak = 1 (reset!)
```

### Database Schema

```sql
student_streaks (
  user_id UUID PRIMARY KEY,           -- Student's user ID
  current_streak INTEGER,             -- Current streak count
  longest_streak INTEGER,             -- Best streak ever achieved
  last_play_date DATE,                -- Last day they played
  streak_updated_at TIMESTAMPTZ,      -- When streak was last updated
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### RPC Funktioner

#### `update_streak_after_game(p_user_id UUID)`
Uppdaterar streak efter att ett spel spelats. Returnerar:

```json
{
  "current_streak": 5,
  "longest_streak": 10,
  "last_play_date": "2025-10-08",
  "is_new_streak": false,
  "streak_increased": true,
  "show_animation": true
}
```

**Logik:**
- Om first time → set streak = 1
- Om played today already → no change
- Om played yesterday → increment streak
- Om missed days → reset to 1

#### `get_current_streak(p_user_id UUID)`
Hämtar nuvarande streak. Returnerar:

```json
{
  "current_streak": 5,
  "longest_streak": 10,
  "is_valid": true,
  "last_play_date": "2025-10-08"
}
```

Validerar automatiskt att streak inte är broken (om sista speldag var mer än 1 dag sedan).

## Komponenter

### 1. `useStreakSystem` Hook

Huvudhook för streak management:

```typescript
const {
  currentStreak,      // Current streak count
  longestStreak,      // Best streak ever
  showStreakAnimation,// Show milestone animation
  animationStreak,    // Streak value for animation
  checkAndUpdateStreak, // Call after each game
  dismissAnimation,   // Dismiss animation manually
  loadStreak         // Reload from database
} = useStreakSystem()
```

**Användning:**
```typescript
// After a game finishes
await checkAndUpdateStreak()
```

### 2. `StreakMilestoneAnimation` Component

Visar en full-screen celebration när streak ökar:

```tsx
<StreakMilestoneAnimation
  streak={animationStreak}
  show={showStreakAnimation}
  onDismiss={dismissAnimation}
/>
```

**Features:**
- 🔥 Animated flames and sparkles
- 📈 Pulsating streak number
- 💬 Adaptive messages based on streak level
- 👆 Tap-to-dismiss

### 3. UI Display

I level grid:

```tsx
{currentStreak > 0 && (
  <div className="text-center mt-3 space-y-2">
    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 rounded-full text-base font-bold shadow-sm">
      🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
    </div>
    {longestStreak > currentStreak && (
      <div className="text-xs text-gray-500">
        Best: {longestStreak} days 👑
      </div>
    )}
  </div>
)}
```

## Animation Milestones

Olika meddelanden beroende på streak:

- **Day 1:** "Started your streak! 🎉"
- **Days 2-6:** "X days strong! 💪"
- **Days 7-29:** "On fire! X days! 🔥"
- **Days 30+:** "Unstoppable! X days! 👑"

## Integration i Student Dashboard

### Imports

```typescript
import { useStreakSystem } from '@/hooks/useStreakSystem'
import StreakMilestoneAnimation from '@/components/StreakMilestoneAnimation'
```

### Setup

```typescript
const { 
  currentStreak, 
  longestStreak,
  showStreakAnimation, 
  animationStreak,
  checkAndUpdateStreak,
  dismissAnimation 
} = useStreakSystem()
```

### Trigger After Game

I `handleScoreUpdate`:

```typescript
// After updating quest progress
void checkAndUpdateStreak()
window.setTimeout(() => { void checkAndUpdateStreak() }, 750)
```

### Render Animation

```tsx
<StreakMilestoneAnimation
  streak={animationStreak}
  show={showStreakAnimation}
  onDismiss={dismissAnimation}
/>
```

## Testning

### Test 1: First Day
1. Logga in som elev
2. Spela ett spel
3. **Förväntad:** 
   - Animation visas med "🔥 1"
   - UI visar "🔥 1 day streak"

### Test 2: Second Day (Consecutive)
1. Logga in nästa dag
2. Spela ett spel
3. **Förväntad:**
   - Animation visas med "🔥 2"
   - UI visar "🔥 2 days streak"

### Test 3: Same Day (No Increase)
1. Spela ett till spel samma dag
2. **Förväntad:**
   - INGEN animation
   - Streak förblir samma (t.ex. "🔥 2 days streak")

### Test 4: Streak Break
1. Vänta 2 dagar utan att spela
2. Logga in och spela ett spel
3. **Förväntad:**
   - Animation visas med "🔥 1" (reset!)
   - UI visar "🔥 1 day streak"
   - Om du hade longest_streak > 1, visas fortfarande "Best: X days 👑"

### Test 5: Database Persistence
1. Spela ett spel (streak = 3)
2. Logga ut
3. Stäng browsern
4. Öppna igen och logga in
5. **Förväntad:**
   - UI visar "🔥 3 days streak" (sparad från database)
6. Spela ett spel
7. **Förväntad:**
   - Ingen animation (redan spelat idag)

## Debugging

### Console Logs

När allt fungerar ska du se:

```
🔥 Updating streak after game...
✅ Streak updated: {current_streak: 5, streak_increased: true, show_animation: true}
🎬 Showing streak animation for: 5
```

### Database Queries

Kontrollera streak i databasen:

```sql
SELECT 
  user_id,
  current_streak,
  longest_streak,
  last_play_date,
  streak_updated_at
FROM student_streaks
WHERE user_id = 'YOUR_USER_ID';
```

### Common Issues

#### Problem: Animation visas inte
**Lösning:**
- Kontrollera console logs
- Verifiera att `show_animation: true` returneras från RPC
- Kontrollera att komponenten renderas korrekt

#### Problem: Streak resetas felaktigt
**Lösning:**
- Kontrollera `last_play_date` i databas
- Kolla RPC funktionens logik
- Verifiera timezone-hantering

#### Problem: RLS error
**Lösning:**
- Kör `streak-system-setup.sql` igen
- Verifiera att policies finns:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'student_streaks';
  ```

## Performance

- ✅ **Atomic Updates** - RPC funktioner är atomiska
- ✅ **Indexes** - Query på user_id är O(1)
- ✅ **Caching** - Streak laddas en gång vid login, sedan hålls i state
- ✅ **Non-Blocking** - Updates görs i background efter spel

## Framtida Förbättringar

Möjliga förbättringar:

1. **Streak Badges** - Award badges för milestones (7 days, 30 days, 100 days)
2. **Leaderboard** - Visa top streaks bland alla elever
3. **Streak Freeze** - Ge möjlighet att "frysa" streak en dag (köpbar med XP?)
4. **Push Notifications** - Påminn elever att spela för att behålla streak
5. **Weekly/Monthly Streaks** - Olika typer av streaks

## Filer Skapade

1. ✅ `streak-system-setup.sql` - Database setup
2. ✅ `src/hooks/useStreakSystem.ts` - React hook
3. ✅ `src/components/StreakMilestoneAnimation.tsx` - Animation component
4. ✅ `STREAK_SYSTEM_GUIDE.md` - Denna guide

## Summary

Nu har du ett komplett, production-ready streak system med:
- 🔥 Database persistens
- 🎨 Cool animationer
- 📊 UI integration
- ✅ RLS säkerhet
- 🚀 Performance optimering

Kör SQL-filen, testa systemet, och njut av dina streaks! 🎉




















