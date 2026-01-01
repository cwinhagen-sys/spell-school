// Game metadata for session mode
// Includes keywords describing what each game trains and recommended order

export interface GameMetadata {
  id: string
  name: string
  description: string
  keywords: string[] // Pedagogical keywords describing what the game trains
  recommendedOrder: number // Recommended position in session (1 = first, 2 = second, etc.)
  icon: string
}

export const SESSION_GAMES: GameMetadata[] = [
  {
    id: 'flashcards',
    name: 'Flashcards',
    description: 'Flip cards and practice words',
    keywords: ['word recognition', 'pronunciation', 'foundational'],
    recommendedOrder: 1,
    icon: '📚'
  },
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Choose the correct translation',
    keywords: ['recognition', 'validation', 'speed'],
    recommendedOrder: 2,
    icon: '✅'
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Match words with translations',
    keywords: ['association', 'memory', 'visual learning'],
    recommendedOrder: 3,
    icon: '🧠'
  },
  {
    id: 'word_scramble',
    name: 'Word Scramble',
    description: 'Build words from scrambled letters',
    keywords: ['spelling', 'letter order', 'concentration'],
    recommendedOrder: 4,
    icon: '🔤'
  },
  {
    id: 'sentence_gap',
    name: 'Sentence Gap',
    description: 'Fill in the gaps in sentences',
    keywords: ['deeper understanding', 'context', 'grammar'],
    recommendedOrder: 5,
    icon: '📝'
  },
  {
    id: 'translate',
    name: 'Translate',
    description: 'Translate words between languages',
    keywords: ['translation', 'spelling', 'precision'],
    recommendedOrder: 6,
    icon: '🌐'
  },
  {
    id: 'flashcards_test',
    name: 'Flashcards Test',
    description: 'Pronounce the English word when you see the Swedish side',
    keywords: ['pronunciation', 'test'],
    recommendedOrder: 7,
    icon: '🎤'
  },
  {
    id: 'word_roulette',
    name: 'Word Roulette',
    description: 'Write sentences with the words',
    keywords: ['creativity', 'sentences', 'application'],
    recommendedOrder: 8,
    icon: '🎯'
  }
]

// Helper function to get game metadata by ID
export function getGameMetadata(gameId: string): GameMetadata | undefined {
  return SESSION_GAMES.find(game => game.id === gameId)
}

// Helper function to sort games by recommended order
export function sortGamesByRecommendedOrder(gameIds: string[]): string[] {
  return [...gameIds].sort((a, b) => {
    const gameA = getGameMetadata(a)
    const gameB = getGameMetadata(b)
    const orderA = gameA?.recommendedOrder ?? 999
    const orderB = gameB?.recommendedOrder ?? 999
    return orderA - orderB
  })
}

