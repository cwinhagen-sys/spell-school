export const TITLE_STEPS = [
  { 
    at: 10, 
    title: 'Spark Initiate', 
    image: '/assets/wizard/wizard_torch.png',
    description: 'A young wizard holding a glowing torch, symbolizing the first steps in magical learning'
  },
  { 
    at: 20, 
    title: 'Apprentice of Embers', 
    image: '/assets/wizard/wizard_orbs.png',
    description: 'A wizard surrounded by glowing magical orbs with symbols, representing growing magical knowledge'
  },
  { 
    at: 30, 
    title: 'Rune Adept', 
    image: '/assets/wizard/wizard_book.png',
    description: 'A wizard reading a glowing book under a magical star, symbolizing mastery of magical texts'
  },
  { 
    at: 40, 
    title: 'Arcane Scholar', 
    image: '/assets/wizard/wizard_pentagram.png',
    description: 'A wizard casting spells with a pentagram, representing advanced magical studies'
  },
  { 
    at: 50, 
    title: 'Spellblade', 
    image: '/assets/wizard/wizard_sword.png',
    description: 'A wizard wielding a glowing magical sword with runes, symbolizing combat magic mastery'
  },
  { 
    at: 60, 
    title: 'Master of Sigils', 
    image: '/assets/wizard/wizard_staff.png',
    description: 'A wizard with glowing eyes and magical staff, representing mastery of magical symbols'
  },
  { 
    at: 70, 
    title: 'Archmage', 
    image: '/assets/wizard/wizard_powerful.png',
    description: 'A powerful wizard with glowing eyes and magical aura, symbolizing great magical power'
  },
  { 
    at: 80, 
    title: 'Void Conjurer', 
    image: '/assets/wizard/wizard_energy.png',
    description: 'A wizard surrounded by magical energy and stars, representing mastery of space and time magic'
  },
  { 
    at: 90, 
    title: 'Grand Archon', 
    image: '/assets/wizard/wizard_powerful.png',
    description: 'A wizard with a star-topped staff and magical aura, representing supreme magical authority'
  },
  { 
    at: 100, 
    title: 'Elder Chronomancer', 
    image: '/assets/wizard/wizard_time.png',
    description: 'A time-wizard surrounded by clocks and hourglasses, representing mastery over time itself'
  },
]

export function titleForLevel(level: number): { title?: string; image?: string; description?: string } {
  // Find the highest unlocked title (the last title where level >= step.at)
  const unlockedSteps = TITLE_STEPS.filter(s => level >= s.at)
  if (unlockedSteps.length === 0) {
    // Return Novice Learner for levels 1-9
    return {
      title: 'Novice Learner',
      image: '/assets/wizard/wizard_novice.png',
      description: 'A young wizard with a small flame, symbolizing the beginning of magical learning'
    }
  }
  
  // Return the highest unlocked title
  const latestStep = unlockedSteps[unlockedSteps.length - 1]
  return { 
    title: latestStep.title, 
    image: latestStep.image, 
    description: latestStep.description 
  }
}


