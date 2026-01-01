// Types for static scenario stories

// A choice within a segment
export interface StoryChoice {
  id: string
  text: string
  leadsTo: string // ID of the next segment
  qualityImpact: number // -1, 0, or +1 - affects final star rating
}

// A segment of the story
export interface StorySegment {
  id: string
  text: string
  imagePath?: string // Path to image for this segment
  audioPath?: string // Path to audio for this segment
  choices?: StoryChoice[] // If no choices, this is an ending
  isEnding?: boolean
  endingType?: 'success' | 'partial' | 'fail' // For endings
  minStars?: number // Minimum stars for this ending (1-3)
  maxStars?: number // Maximum stars for this ending (1-3)
}

// A complete static story
export interface StaticStory {
  id: string
  scenarioId: string
  goalId: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  difficultyStars: 1 | 2 | 3 | 4 | 5 // 5-star difficulty system
  estimatedMinutes: number
  segments: { [id: string]: StorySegment }
  startSegmentId: string
  // Gender-specific intro images
  introImages?: {
    boy?: string
    girl?: string
    neutral?: string
  }
  // Base XP rewards
  xpRewards: {
    oneStar: number
    twoStars: number
    threeStars: number
  }
}

// An environment (e.g., Home, School, Park)
export interface Environment {
  id: string
  name: string
  icon: string
  description: string
  color: string // Gradient color
  isAvailable: boolean // false = "Coming Soon"
  scenarios: ScenarioInfo[]
}

// Scenario info shown in environment view
export interface ScenarioInfo {
  id: string
  storyId: string // ID to load from story loader
  name: string
  description: string
  icon: string
  thumbnail?: string // Path to thumbnail image
  difficultyStars: 1 | 2 // Simple difficulty (1 = easy, 2 = medium)
  isAvailable: boolean
  maxXp: number // Max XP for 3 stars
}

// Player's progress through a story
export interface StoryProgress {
  currentSegmentId: string
  visitedSegments: string[]
  choicesMade: { segmentId: string; choiceId: string; qualityImpact: number }[]
  totalQualityScore: number // Sum of all quality impacts
}

// Calculate final stars based on quality score
export function calculateStars(qualityScore: number, maxQuality: number): 1 | 2 | 3 {
  const percentage = (qualityScore + maxQuality) / (maxQuality * 2) // Normalize to 0-1
  if (percentage >= 0.8) return 3
  if (percentage >= 0.5) return 2
  return 1
}

// Get vocabulary level from success rate (kept for compatibility)
export function getVocabularyLevel(successRate: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (successRate >= 60) return 'beginner'
  if (successRate >= 40) return 'intermediate'
  if (successRate >= 20) return 'advanced'
  return 'expert'
}

// Get difficulty from success rate
export function getDifficultyFromSuccessRate(successRate: number): 'easy' | 'medium' | 'hard' {
  if (successRate >= 60) return 'easy'
  if (successRate >= 35) return 'medium'
  return 'hard'
}


