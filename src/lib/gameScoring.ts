/**
 * Universal game scoring system
 * Provides consistent and simple scoring across all games
 */

export interface GameScoreResult {
  pointsAwarded: number
  accuracy: number
  details: {
    correctAnswers: number
    totalQuestions: number
    wrongAttempts?: number
    time?: string
    streak?: number
    efficiency?: number
    wordCount?: number
    [key: string]: any
  }
}

/**
 * Calculate points for most games: 1 point per correct answer
 */
export function calculateBasicScore(
  correctAnswers: number,
  totalQuestions: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const pointsAwarded = Math.max(0, correctAnswers) // 1 point per correct answer
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers,
      totalQuestions,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Memory Game: 3 points per correct pair
 */
export function calculateMemoryScore(
  correctPairs: number,
  totalPairs: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const pointsAwarded = Math.max(0, correctPairs * 3) // 3 points per correct pair
  const accuracy = totalPairs > 0 ? Math.round((correctPairs / totalPairs) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: correctPairs,
      totalQuestions: totalPairs,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Story Gap Game: +2 per correct, -1 per wrong click
 */
export function calculateStoryGapScore(
  correctAnswers: number,
  totalQuestions: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const basePoints = (correctAnswers * 2) - (wrongAttempts * 1)
  const pointsAwarded = Math.max(0, basePoints)
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers,
      totalQuestions,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Word Roulette: Points based on sentence quality and word count
 */
export function calculateRouletteScore(
  wordCount: number,
  quality: number, // 0-1 scale
  wrongAttempts: number = 0
): GameScoreResult {
  let pointsAwarded = 0
  
  if (quality === 0) {
    pointsAwarded = 0 // No points for inappropriate content
  } else if (quality >= 0.8) {
    // Grammatically correct sentence - points = number of words
    pointsAwarded = wordCount
  } else {
    // Grammatically incorrect but still a sentence - half points
    pointsAwarded = Math.max(1, Math.floor(wordCount / 2))
  }
  
  const accuracy = quality >= 0.8 ? 100 : quality > 0 ? 50 : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: wordCount,
      totalQuestions: wordCount,
      wrongAttempts,
      wordCount
    }
  }
}

/**
 * Calculate points for Typing Challenge: 1 point per correct word
 */
export function calculateTypingScore(
  correctWords: number,
  totalWords: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const pointsAwarded = Math.max(0, correctWords) // 1 point per correct word
  // Accuracy should be based on total attempts, not total words
  const totalAttempts = correctWords + wrongAttempts
  const accuracy = totalAttempts > 0 ? Math.round((correctWords / totalAttempts) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: correctWords,
      totalQuestions: totalWords,
      totalAttempts,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Multiple Choice: 1 point per correct answer (8-12 points max)
 */
export function calculateMultipleChoiceScore(
  correctAnswers: number,
  totalQuestions: number,
  wrongAttempts: number = 0
): GameScoreResult {
  // Only give points if accuracy is at least 50%
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  const pointsAwarded = accuracy >= 50 ? Math.max(0, correctAnswers) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers,
      totalQuestions,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Quiz: 1 point per 10 quiz points, minimum 5 points
 */
export function calculateQuizScore(
  quizScore: number,
  totalPossible: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const pointsAwarded = Math.max(5, Math.floor(quizScore / 10)) // 1 point per 10 quiz points, minimum 5
  const accuracy = totalPossible > 0 ? Math.round((quizScore / totalPossible) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: Math.floor(quizScore / 2), // Approximate correct answers (2 points each)
      totalQuestions: Math.floor(totalPossible / 2),
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Spell Casting: Based on final score tiers
 */
export function calculateSpellCastingScore(
  finalScore: number,
  wrongAttempts: number = 0
): GameScoreResult {
  let pointsAwarded = 25 // Default minimum
  
  if (finalScore <= 100) {
    pointsAwarded = 25
  } else if (finalScore <= 500) {
    pointsAwarded = 50
  } else if (finalScore <= 1000) {
    pointsAwarded = 75
  } else {
    pointsAwarded = 100
  }
  
  const accuracy = 100 // Spell casting is always 100% if completed
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: Math.floor(finalScore / 10), // Approximate
      totalQuestions: Math.floor(finalScore / 10),
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Line Matching: +2.5/-1 system (halved from +5/-2)
 */
export function calculateLineMatchingScore(
  correctPairs: number,
  totalPairs: number,
  wrongAttempts: number = 0
): GameScoreResult {
  // Halved calculation: 2.5 points per correct pair (rounded), -1 per wrong attempt
  const basePoints = Math.round(correctPairs * 2.5) - (wrongAttempts * 1)
  const pointsAwarded = Math.max(0, basePoints)
  // Accuracy = correct / total attempts (not just total pairs)
  const totalAttempts = correctPairs + wrongAttempts
  const accuracy = totalAttempts > 0 ? Math.round((correctPairs / totalAttempts) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: correctPairs,
      totalQuestions: totalPairs,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Translate Game: +2 per correct, -1 per wrong click
 */
export function calculateTranslateScore(
  correctAnswers: number,
  totalQuestions: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const basePoints = (correctAnswers * 2) - (wrongAttempts * 1)
  const pointsAwarded = Math.max(0, basePoints)
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers,
      totalQuestions,
      wrongAttempts
    }
  }
}

/**
 * Calculate points for Distorted Tale: Based on AI feedback percentage
 * 1 point per 10% score (1-10 points), bonus for using all words
 */
export function calculateDistortedTaleScore(
  scorePercentage: number,
  wordsUsed: number,
  totalWords: number
): GameScoreResult {
  // Base points: 1 point per 10% (minimum 1, maximum 10)
  let basePoints = Math.max(1, Math.floor(scorePercentage / 10))
  
  // Bonus for using all words: +2 points
  if (wordsUsed === totalWords && totalWords > 0) {
    basePoints += 2
  }
  
  const pointsAwarded = Math.min(12, basePoints) // Cap at 12 points
  
  return {
    pointsAwarded,
    accuracy: scorePercentage,
    details: {
      correctAnswers: wordsUsed,
      totalQuestions: totalWords,
      scorePercentage,
      wordCount: totalWords
    }
  }
}

/**
 * Calculate points for Word Scramble: 2 points per correct word
 */
export function calculateScrambleScore(
  correctWords: number,
  totalWords: number,
  wrongAttempts: number = 0
): GameScoreResult {
  const pointsAwarded = Math.max(0, correctWords * 2) // 2 points per correct word
  const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0
  
  return {
    pointsAwarded,
    accuracy,
    details: {
      correctAnswers: correctWords,
      totalQuestions: totalWords,
      wrongAttempts
    }
  }
}
