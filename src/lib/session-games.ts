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
    description: 'Vänd kort och träna ord',
    keywords: ['ordbilder', 'uttal', 'grundläggande'],
    recommendedOrder: 1,
    icon: '📚'
  },
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Välj rätt översättning',
    keywords: ['igenkänning', 'validering', 'snabbhet'],
    recommendedOrder: 2,
    icon: '✅'
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Matcha ord med översättningar',
    keywords: ['association', 'minne', 'visuell inlärning'],
    recommendedOrder: 3,
    icon: '🧠'
  },
  {
    id: 'word_scramble',
    name: 'Word Scramble',
    description: 'Bygg ord från blandade bokstäver',
    keywords: ['stavning', 'bokstavsordning', 'koncentration'],
    recommendedOrder: 4,
    icon: '🔤'
  },
  {
    id: 'sentence_gap',
    name: 'Sentence Gap',
    description: 'Fyll i luckorna i meningar',
    keywords: ['djupare förståelse', 'kontext', 'grammatik'],
    recommendedOrder: 5,
    icon: '📝'
  },
  {
    id: 'translate',
    name: 'Translate',
    description: 'Översätt ord mellan språk',
    keywords: ['översättning', 'stavning', 'precision'],
    recommendedOrder: 6,
    icon: '🌐'
  },
  {
    id: 'flashcards_test',
    name: 'Flashcards Test',
    description: 'Uttala engelska ordet när du ser svenska sidan',
    keywords: ['uttal', 'test'],
    recommendedOrder: 7,
    icon: '🎤'
  },
  {
    id: 'word_roulette',
    name: 'Word Roulette',
    description: 'Skriv meningar med orden',
    keywords: ['kreativitet', 'meningar', 'användning'],
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

