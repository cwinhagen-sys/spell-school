# Word Roulette Perfect Sentence Quests - Implementation Guide

## Overview
This document describes the complete implementation of 3 new daily quests for Word Roulette based on creating perfect sentences with different word counts.

## Quest Details

### 1. Sentence Starter (Easy)
- **Quest ID**: `roulette_perfect_5_words`
- **Title**: Sentence Starter
- **Description**: Create a perfect sentence with 5+ words
- **Target**: 1 perfect sentence
- **XP**: 15
- **Icon**: 📝
- **Category**: Easy (Green)
- **Badge**: Sentence Starter Badge (Common)

### 2. Sentence Expert (Medium)
- **Quest ID**: `roulette_perfect_10_words`
- **Title**: Sentence Expert
- **Description**: Create a perfect sentence with 10+ words
- **Target**: 1 perfect sentence
- **XP**: 45
- **Icon**: 📖
- **Category**: Medium (Yellow)
- **Badge**: Sentence Expert Badge (Rare)

### 3. Sentence Master (Hard)
- **Quest ID**: `roulette_perfect_20_words`
- **Title**: Sentence Master
- **Description**: Create a perfect sentence with 20+ words
- **Target**: 1 perfect sentence
- **XP**: 100
- **Icon**: 📚
- **Category**: Hard (Red)
- **Badge**: Sentence Master Badge (Legendary)

## Implementation Steps

### Step 1: Database Setup
Run the SQL migration to add the badges:
```sql
-- Run: roulette-perfect-quests.sql
```

This will insert 3 new badge entries into the `badges` table with the quest IDs as unique identifiers.

### Step 2: Update Quest Definitions
The quest definitions have already been added to `src/app/student/page.tsx` in the `questDefinitions` object:
- Easy: Added `roulette_perfect_5_words`
- Medium: Added `roulette_perfect_10_words`
- Hard: Added `roulette_perfect_20_words`

### Step 3: Add Quest Progress Tracking
In `src/app/student/page.tsx`, find the `updateQuestProgressSync` function and add the quest tracking logic:

```typescript
case 'roulette_perfect_5_words':
  if (gameType === 'roulette' && score === 100 && wordCount >= 5) {
    quest.progress = Math.min(quest.progress + 1, quest.target)
    console.log('📝 roulette_perfect_5_words quest completed!')
  }
  break
case 'roulette_perfect_10_words':
  if (gameType === 'roulette' && score === 100 && wordCount >= 10) {
    quest.progress = Math.min(quest.progress + 1, quest.target)
    console.log('📖 roulette_perfect_10_words quest completed!')
  }
  break
case 'roulette_perfect_20_words':
  if (gameType === 'roulette' && score === 100 && wordCount >= 20) {
    quest.progress = Math.min(quest.progress + 1, quest.target)
    console.log('📚 roulette_perfect_20_words quest completed!')
  }
  break
```

### Step 4: Pass Word Count from Roulette Game
Update the `handleScoreUpdate` function in `src/app/student/page.tsx` to extract word count from roulette game:

```typescript
// Find the line where handleScoreUpdate is called
const handleScoreUpdate = async (
  accuracy: number, 
  pointsAwarded: number, 
  gameType: string,
  details?: any
) => {
  // ... existing code ...
  
  // Extract word count for roulette games
  let wordCount = 0
  if (gameType === 'roulette' && details) {
    wordCount = details.wordCount || 0
  }
  
  // Update quest progress with word count
  await updateQuestProgress(accuracy, pointsAwarded, gameType, wordCount)
}
```

### Step 5: Update Roulette Game to Pass Word Count
In `src/components/games/RouletteGame.tsx`, update the `onScoreUpdate` call to include word count:

```typescript
// Find the onScoreUpdate call after getting the score result
onScoreUpdate(
  scoreResult.accuracy, 
  scoreResult.pointsAwarded, 
  'roulette',
  { wordCount, isPerfect: result.color === 'green' } // Pass word count
)
```

### Step 6: Update Quest Progress Function
Update the `updateQuestProgress` function signature in `src/app/student/page.tsx`:

```typescript
const updateQuestProgress = async (
  accuracy: number,
  pointsAwarded: number,
  gameType: string,
  wordCount: number = 0
) => {
  // ... existing code ...
  
  // Pass wordCount to updateQuestProgressSync
  await updateQuestProgressSync(quest, accuracy, pointsAwarded, gameType, wordCount)
}
```

And update `updateQuestProgressSync`:

```typescript
const updateQuestProgressSync = async (
  quest: any,
  accuracy: number,
  pointsAwarded: number,
  gameType: string,
  wordCount: number = 0
) => {
  // ... existing switch cases with wordCount parameter ...
}
```

## Testing

### Test Cases

1. **5 Word Sentence (Easy Quest)**:
   - Create sentence: "I like to play games with friends"
   - Should complete `roulette_perfect_5_words` quest
   - Should award 15 XP
   - Should award Sentence Starter Badge

2. **10 Word Sentence (Medium Quest)**:
   - Create sentence: "The cat sat on the mat and looked at the bird"
   - Should complete `roulette_perfect_10_words` quest
   - Should award 45 XP
   - Should award Sentence Expert Badge

3. **20 Word Sentence (Hard Quest)**:
   - Create sentence: "The quick brown fox jumps over the lazy dog and then runs around the house looking for something to eat while everyone watches"
   - Should complete `roulette_perfect_20_words` quest
   - Should award 100 XP
   - Should award Sentence Master Badge

### Manual Testing
1. Open student dashboard
2. Check that new quests appear in the daily quest list
3. Play Word Roulette
4. Create a perfect sentence with appropriate word count
5. Verify quest progress updates
6. Verify badge is awarded (first time only)
7. Verify XP is awarded

## Quest Completion Logic

A quest is completed when:
1. Game type is 'roulette'
2. Accuracy score is 100% (perfect sentence)
3. Word count meets the quest requirement:
   - 5+ words for Sentence Starter
   - 10+ words for Sentence Expert
   - 20+ words for Sentence Master

## Quest Resets

Quests reset at 6 AM every day. Progress is tracked using:
- LocalStorage for immediate updates
- Database for persistent storage
- `quest-sync` system for atomic updates

## Badge Awarding

Badges are awarded through the `useDailyQuestBadges` hook:
1. Quest completion triggers badge check
2. Hook checks if badge already awarded
3. If not awarded, badge is added to user's badge collection
4. Badge notification is shown with animation
5. Badge persists to database

## Files Modified

1. ✅ `roulette-perfect-quests.sql` - Badge definitions (NEW) - COMPLETED
2. ✅ `src/app/student/page.tsx` - Quest definitions and tracking (MODIFIED) - COMPLETED
   - Added quest definitions to `questDefinitions` object
   - Added quest tracking cases in `updateQuestProgressSync` function
   - Quest tracking reads word count from localStorage
3. ✅ `src/components/games/RouletteGame.tsx` - Word count storage (MODIFIED) - COMPLETED
   - Stores word count in localStorage when sentence is submitted
   - Stores isPerfect flag to verify sentence quality

## Implementation Complete! 🎉

All quest tracking is now functional:
1. ✅ Word count is stored in localStorage when sentence is submitted
2. ✅ Quest progress cases check word count requirements (5, 10, 20 words)
3. ✅ Quest completion works automatically for perfect sentences
4. ✅ Badge system is ready to award badges on first completion

### How It Works

1. Player plays Word Roulette and creates a perfect sentence
2. Word count is stored in localStorage: `roulette_word_count_{date}_{userId}`
3. When quest system updates, it reads this value from localStorage
4. If word count matches quest requirement (5, 10, or 20), quest is completed
5. Badge is awarded automatically (first time only)
6. XP is awarded based on quest difficulty

## Future Enhancements

Possible future improvements:
1. Add streak tracking for perfect sentences
2. Add weekly challenges for longest sentence
3. Add combo multipliers for consecutive perfect sentences
4. Add special badges for creative/unique sentences
5. Add daily leaderboard for longest perfect sentence
