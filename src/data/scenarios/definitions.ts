// Scenario and Goal definitions for Scenario Adventure
// Each scenario has 6 goals with varying difficulty (success rate)

import { ScenarioDefinition } from './types'

export const SCENARIOS: ScenarioDefinition[] = [
  // === BEGINNER FRIENDLY (mostly easy goals) ===
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    description: 'Everyday situations at home',
    goals: [
      { id: 'breakfast', name: 'Make Breakfast', description: 'Help mom or dad make a nice breakfast', successRate: 75, storyId: 'home_breakfast' },
      { id: 'pet', name: 'Care for Pet', description: 'Take good care of your pet for the day', successRate: 70, storyId: 'home_pet' },
      { id: 'chores', name: 'Finish Chores', description: 'Complete all your chores before playtime', successRate: 65, storyId: 'home_chores' },
      { id: 'sibling', name: 'Help Sibling', description: 'Help your little brother or sister with a problem', successRate: 60, storyId: 'home_sibling' },
      { id: 'surprise', name: 'Plan Surprise', description: 'Plan a nice surprise for a family member', successRate: 50, storyId: 'home_surprise' },
      { id: 'lost_item', name: 'Find Lost Item', description: 'Find your lost phone before dinner', successRate: 45, storyId: 'home_lost_item' },
    ]
  },
  {
    id: 'park',
    name: 'Park',
    icon: '🌳',
    description: 'Fun adventures in the park',
    goals: [
      { id: 'picnic', name: 'Perfect Picnic', description: 'Have a wonderful picnic with friends', successRate: 70, storyId: 'park_picnic' },
      { id: 'new_friend', name: 'Make a Friend', description: 'Make a new friend at the playground', successRate: 65, storyId: 'park_new_friend' },
      { id: 'kite', name: 'Fly the Kite', description: 'Successfully fly your new kite', successRate: 60, storyId: 'park_kite' },
      { id: 'lost_dog', name: 'Find the Dog', description: 'Help find a lost dog and return it home', successRate: 55, storyId: 'park_lost_dog' },
      { id: 'hide_seek', name: 'Win Hide & Seek', description: 'Win the big hide and seek game', successRate: 50, storyId: 'park_hide_seek' },
      { id: 'storm', name: 'Beat the Storm', description: 'Get everyone home before the storm hits', successRate: 40, storyId: 'park_storm' },
    ]
  },
  {
    id: 'school',
    name: 'School',
    icon: '🏫',
    description: 'Navigate school life',
    goals: [
      { id: 'friend', name: 'New Student', description: 'Help a new student feel welcome', successRate: 65, storyId: 'school_friend' },
      { id: 'project', name: 'Group Project', description: 'Lead your team to finish the project', successRate: 55, storyId: 'school_project' },
      { id: 'late', name: 'Late for Class', description: 'Convince your teacher you have a good excuse', successRate: 45, storyId: 'school_late' },
      { id: 'exam', name: 'Big Exam', description: 'Prepare for and ace the important test', successRate: 40, storyId: 'school_exam' },
      { id: 'bully', name: 'Stand Up', description: 'Help a friend who is being bullied', successRate: 35, storyId: 'school_bully' },
      { id: 'principal', name: 'Principal\'s Office', description: 'Explain yourself to the principal', successRate: 25, storyId: 'school_principal' },
    ]
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛒',
    description: 'Adventures at the mall',
    goals: [
      { id: 'gift', name: 'Find a Gift', description: 'Find the perfect birthday gift for a friend', successRate: 65, storyId: 'shopping_gift' },
      { id: 'budget', name: 'Stay on Budget', description: 'Buy everything you need without overspending', successRate: 55, storyId: 'shopping_budget' },
      { id: 'lost', name: 'Find Your Way', description: 'Find your parents after getting separated', successRate: 50, storyId: 'shopping_lost' },
      { id: 'deal', name: 'Best Deal', description: 'Negotiate the best price for something special', successRate: 40, storyId: 'shopping_deal' },
      { id: 'return', name: 'Make a Return', description: 'Return a broken item and get your money back', successRate: 35, storyId: 'shopping_return' },
      { id: 'thief', name: 'Catch the Thief', description: 'Help security catch a shoplifter', successRate: 20, storyId: 'shopping_thief' },
    ]
  },
  // === INTERMEDIATE (mixed difficulty) ===
  {
    id: 'sports',
    name: 'Sports',
    icon: '⚽',
    description: 'Compete and play fair',
    goals: [
      { id: 'tryout', name: 'Team Tryouts', description: 'Make it onto the school team', successRate: 55, storyId: 'sports_tryout' },
      { id: 'captain', name: 'Be Captain', description: 'Lead your team as the new captain', successRate: 50, storyId: 'sports_captain' },
      { id: 'injury', name: 'Play Hurt', description: 'Decide whether to play with a small injury', successRate: 45, storyId: 'sports_injury' },
      { id: 'rival', name: 'Big Game', description: 'Win against your biggest rival', successRate: 35, storyId: 'sports_rival' },
      { id: 'fair_play', name: 'Fair Play', description: 'Handle a cheating opponent with honor', successRate: 30, storyId: 'sports_fair_play' },
      { id: 'championship', name: 'Championship', description: 'Lead your team to win the championship', successRate: 15, storyId: 'sports_championship' },
    ]
  },
  {
    id: 'adventure',
    name: 'Adventure',
    icon: '🗺️',
    description: 'Exciting journeys',
    goals: [
      { id: 'camping', name: 'Camping Trip', description: 'Have a successful camping adventure', successRate: 55, storyId: 'adventure_camping' },
      { id: 'rescue', name: 'Rescue Mission', description: 'Save your friend who got lost in the forest', successRate: 45, storyId: 'adventure_rescue' },
      { id: 'mystery', name: 'Solve Mystery', description: 'Uncover the truth behind strange events', successRate: 40, storyId: 'adventure_mystery' },
      { id: 'treasure', name: 'Find Treasure', description: 'Find the legendary hidden treasure', successRate: 30, storyId: 'adventure_treasure' },
      { id: 'escape', name: 'Great Escape', description: 'Find your way out of a tricky situation', successRate: 25, storyId: 'adventure_escape' },
      { id: 'survival', name: 'Survive Alone', description: 'Survive a night alone in the wilderness', successRate: 15, storyId: 'adventure_survival' },
    ]
  },
  {
    id: 'social',
    name: 'Social',
    icon: '👥',
    description: 'Handle social situations',
    goals: [
      { id: 'party', name: 'Party Planning', description: 'Organize the perfect surprise party', successRate: 55, storyId: 'social_party' },
      { id: 'speech', name: 'Big Speech', description: 'Deliver an amazing speech to everyone', successRate: 45, storyId: 'social_speech' },
      { id: 'conflict', name: 'Resolve Conflict', description: 'Help two friends who are fighting', successRate: 40, storyId: 'social_conflict' },
      { id: 'rumor', name: 'Stop Rumor', description: 'Stop a harmful rumor about your friend', successRate: 35, storyId: 'social_rumor' },
      { id: 'interview', name: 'Job Interview', description: 'Impress the interviewer and get the job', successRate: 30, storyId: 'social_interview' },
      { id: 'breakup', name: 'Difficult Talk', description: 'Have a very difficult conversation', successRate: 20, storyId: 'social_breakup' },
    ]
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: '🎨',
    description: 'Express yourself',
    goals: [
      { id: 'art_show', name: 'Art Show', description: 'Get your art displayed in the school show', successRate: 55, storyId: 'creative_art_show' },
      { id: 'band', name: 'Join the Band', description: 'Audition and join the school band', successRate: 50, storyId: 'creative_band' },
      { id: 'play', name: 'School Play', description: 'Get the lead role in the school play', successRate: 40, storyId: 'creative_play' },
      { id: 'contest', name: 'Win Contest', description: 'Win the creative writing contest', successRate: 35, storyId: 'creative_contest' },
      { id: 'viral', name: 'Go Viral', description: 'Make a video that everyone wants to share', successRate: 25, storyId: 'creative_viral' },
      { id: 'gallery', name: 'Real Gallery', description: 'Get your art in a real art gallery', successRate: 15, storyId: 'creative_gallery' },
    ]
  },
  // === ADVANCED (harder goals) ===
  {
    id: 'mystery',
    name: 'Mystery',
    icon: '🔍',
    description: 'Solve puzzling cases',
    goals: [
      { id: 'missing', name: 'Missing Pet', description: 'Find out what happened to your neighbor\'s cat', successRate: 50, storyId: 'mystery_missing' },
      { id: 'theft', name: 'Lunch Thief', description: 'Discover who has been stealing lunches', successRate: 40, storyId: 'mystery_theft' },
      { id: 'ghost', name: 'Ghost Story', description: 'Investigate strange sounds in the old house', successRate: 35, storyId: 'mystery_ghost' },
      { id: 'secret', name: 'Secret Room', description: 'Find and open the secret room in school', successRate: 25, storyId: 'mystery_secret' },
      { id: 'conspiracy', name: 'Big Conspiracy', description: 'Uncover a conspiracy at the local factory', successRate: 15, storyId: 'mystery_conspiracy' },
      { id: 'cold_case', name: 'Cold Case', description: 'Solve a mystery that no one else could', successRate: 10, storyId: 'mystery_cold_case' },
    ]
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    icon: '🧙',
    description: 'Magical worlds',
    goals: [
      { id: 'spell', name: 'Learn Magic', description: 'Master a powerful spell from an ancient wizard', successRate: 50, storyId: 'fantasy_spell' },
      { id: 'dragon', name: 'Befriend Dragon', description: 'Win the trust of a fierce dragon', successRate: 40, storyId: 'fantasy_dragon' },
      { id: 'curse', name: 'Break Curse', description: 'Find a way to break an ancient curse', successRate: 30, storyId: 'fantasy_curse' },
      { id: 'kingdom', name: 'Save Kingdom', description: 'Protect the kingdom from a dark threat', successRate: 20, storyId: 'fantasy_kingdom' },
      { id: 'quest', name: 'Epic Quest', description: 'Complete a legendary quest and become a hero', successRate: 15, storyId: 'fantasy_quest' },
      { id: 'demon', name: 'Defeat Demon', description: 'Face and defeat the demon lord', successRate: 10, storyId: 'fantasy_demon' },
    ]
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    icon: '🚀',
    description: 'Future adventures',
    goals: [
      { id: 'robot', name: 'Fix Robot', description: 'Repair your broken robot companion', successRate: 50, storyId: 'scifi_robot' },
      { id: 'alien', name: 'First Contact', description: 'Successfully communicate with aliens', successRate: 40, storyId: 'scifi_alien' },
      { id: 'hack', name: 'Hack System', description: 'Break into the computer system to save your friend', successRate: 30, storyId: 'scifi_hack' },
      { id: 'asteroid', name: 'Stop Asteroid', description: 'Help stop an asteroid heading for Earth', successRate: 20, storyId: 'scifi_asteroid' },
      { id: 'time', name: 'Fix Timeline', description: 'Repair the timeline after a time travel accident', successRate: 12, storyId: 'scifi_time' },
      { id: 'singularity', name: 'Stop AI', description: 'Prevent a rogue AI from taking over', successRate: 8, storyId: 'scifi_singularity' },
    ]
  },
  {
    id: 'survival',
    name: 'Survival',
    icon: '🏔️',
    description: 'Extreme challenges',
    goals: [
      { id: 'storm', name: 'Weather Storm', description: 'Find shelter and survive a terrible storm', successRate: 45, storyId: 'survival_storm' },
      { id: 'island', name: 'Stranded', description: 'Survive being stranded on a small island', successRate: 35, storyId: 'survival_island' },
      { id: 'arctic', name: 'Arctic Cold', description: 'Survive extreme cold in the arctic', successRate: 25, storyId: 'survival_arctic' },
      { id: 'desert', name: 'Desert Heat', description: 'Cross a dangerous desert with limited water', successRate: 18, storyId: 'survival_desert' },
      { id: 'jungle', name: 'Lost Jungle', description: 'Navigate through a dangerous jungle alone', successRate: 12, storyId: 'survival_jungle' },
      { id: 'apocalypse', name: 'Last Hope', description: 'Lead survivors in an extreme situation', successRate: 8, storyId: 'survival_apocalypse' },
    ]
  }
]

// Helper to get all story IDs
export function getAllStoryIds(): string[] {
  return SCENARIOS.flatMap(scenario => 
    scenario.goals.map(goal => goal.storyId)
  )
}

// Helper to find scenario and goal by story ID
export function findByStoryId(storyId: string): { scenario: ScenarioDefinition; goal: typeof SCENARIOS[0]['goals'][0] } | null {
  for (const scenario of SCENARIOS) {
    const goal = scenario.goals.find(g => g.storyId === storyId)
    if (goal) {
      return { scenario, goal }
    }
  }
  return null
}




