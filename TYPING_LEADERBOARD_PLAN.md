# Typing Challenge Leaderboard & Results Implementation Plan

## Overview
Add KPM (Keys Per Minute) calculation, results view showing username, KPM, time, and rank, and a global leaderboard for each wordset.

## Why KPM instead of Time
- Some words are longer than others (e.g., "hello" vs "cat")
- Random word order means some students get easier words
- KPM provides a fairer comparison by measuring typing speed

## Implementation Steps

### 1. Calculate KPM in TypingChallenge
**File**: `src/components/games/TypingChallenge.tsx`

Add calculation when game finishes:
```typescript
// Calculate total characters typed
const totalChars = wordList.reduce((sum, word) => sum + word.length, 0)
const kpm = duration > 0 ? Math.round((totalChars / duration) * 60) : 0

// Save to endGameSession details:
details: { 
  mode: 'time_attack', 
  words_typed: correctAnswers, 
  total_words: wordList.length, 
  timeLeftEnd: timeLeft, 
  awarded_points: points,
  kpm: kpm,           // NEW
  total_chars: totalChars // NEW
}
```

### 2. Create Results View Component
**New File**: `src/components/TypingChallengeResults.tsx`

Features:
- Display username (from profile)
- Display KPM (calculated)
- Display time (durationSec from session)
- Display rank (from leaderboard query)
- Show "Play Again" button
- Show "View Leaderboard" button

### 3. Update UniversalGameCompleteModal
Add support for Typing Challenge with KPM display instead of standard score.

### 4. Create Leaderboard Component
**New File**: `src/components/TypingChallengeLeaderboard.tsx`

Features:
- Query game_sessions for 'typing' game type
- Filter by word_set_id (if provided)
- Group by user and get best KPM per user
- Sort by KPM (descending)
- Display top 10
- Show user's rank highlighted

### 5. Database Schema
**No changes needed** - `game_sessions` table already has:
- `details` JSONB column for storing KPM
- `word_set_id` for filtering by wordset
- `student_id` for grouping by user
- `duration_sec` for time display

### 6. SQL Query for Leaderboard
```sql
WITH user_best_scores AS (
  SELECT 
    student_id,
    word_set_id,
    MAX(CAST(details->>'kpm' AS INTEGER)) as best_kpm,
    MIN(duration_sec) as best_time
  FROM game_sessions
  WHERE game_type = 'typing'
    AND word_set_id = $1  -- Optional filter
    AND details->>'kpm' IS NOT NULL
  GROUP BY student_id, word_set_id
)
SELECT 
  ubs.student_id,
  p.username,
  ubs.best_kpm,
  ubs.best_time,
  ROW_NUMBER() OVER (ORDER BY ubs.best_kpm DESC) as rank
FROM user_best_scores ubs
JOIN profiles p ON p.id = ubs.student_id
ORDER BY ubs.best_kpm DESC
LIMIT 10;
```

## UI/UX Flow

1. User completes Typing Challenge
2. Results modal shows:
   - Their KPM
   - Their time
   - "You are rank #X" (fetched from leaderboard)
3. Two buttons:
   - "Play Again" - restarts game
   - "View Leaderboard" - opens leaderboard modal/page

## Implementation Priority
1. Calculate KPM in TypingChallenge ✅ (High priority)
2. Create Results View component (High priority)
3. Create Leaderboard component (Medium priority)
4. Wire up to UniversalGameCompleteModal (Medium priority)

## Notes
- KPM calculation is simple but must happen on game finish
- Leaderboard should refresh after each game
- Consider caching leaderboard data to avoid excessive queries
- Add index on `word_set_id` in `game_sessions` if not exists



