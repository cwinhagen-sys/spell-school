// Story loader for static scenario stories
// Stories are stored as JSON files and loaded on demand

import { StaticStory, Environment, ScenarioInfo } from './types'

// Import all story JSON files
import homeBreakfast from './stories/home_breakfast.json'
import homePet from './stories/home_pet.json'

// Story registry - maps story IDs to their data
const storyRegistry: { [storyId: string]: StaticStory } = {
  'home_breakfast': homeBreakfast as unknown as StaticStory,
  'home_pet': homePet as unknown as StaticStory,
}

// Environment definitions
export const ENVIRONMENTS: Environment[] = [
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    description: 'Cozy adventures at home with family',
    color: 'from-slate-700 to-gray-800',
    isAvailable: true,
    scenarios: [
      {
        id: 'breakfast',
        storyId: 'home_breakfast',
        name: 'Make Breakfast',
        description: 'Help make a delicious breakfast for your family',
        icon: '🍳',
        thumbnail: '/images/scenarios/thumbnails/breakfast.png',
        difficultyStars: 1,
        isAvailable: true,
        maxXp: 50
      },
      {
        id: 'pet',
        storyId: 'home_pet',
        name: 'Care for Pet',
        description: 'Take good care of your pet for the day',
        icon: '🐾',
        thumbnail: '/images/scenarios/thumbnails/pet.png',
        difficultyStars: 1,
        isAvailable: true,
        maxXp: 50
      }
    ]
  },
]

// Get a story by ID
export function getStory(storyId: string): StaticStory | null {
  return storyRegistry[storyId] || null
}

// Check if a story exists
export function hasStory(storyId: string): boolean {
  return storyId in storyRegistry
}

// Get all available story IDs
export function getAvailableStoryIds(): string[] {
  return Object.keys(storyRegistry)
}

// Get story count
export function getStoryCount(): number {
  return Object.keys(storyRegistry).length
}

// Get environment by ID
export function getEnvironment(environmentId: string): Environment | null {
  return ENVIRONMENTS.find(e => e.id === environmentId) || null
}

// Get scenario info
export function getScenarioInfo(environmentId: string, scenarioId: string): ScenarioInfo | null {
  const env = getEnvironment(environmentId)
  if (!env) return null
  return env.scenarios.find(s => s.id === scenarioId) || null
}


