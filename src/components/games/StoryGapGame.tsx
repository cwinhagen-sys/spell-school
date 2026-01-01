'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { FileText, BookOpen, MapPin, Gauge, Volume2, Play, Pause, ChevronRight, Sparkles } from 'lucide-react'
import { startGameSession, endGameSession, type TrackingContext, updateStudentProgress } from '@/lib/tracking'
import WordSelector from './WordSelector'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateStoryGapScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'
import MagicalProgressBar from '@/components/MagicalProgressBar'

// 50 scenario options for story settings
const STORY_SCENARIOS = [
  { id: 'school', name: 'School', emoji: '🏫', category: 'Education' },
  { id: 'park', name: 'The Park', emoji: '🌳', category: 'Outdoors' },
  { id: 'football', name: 'Football Practice', emoji: '⚽', category: 'Sports' },
  { id: 'beach', name: 'The Beach', emoji: '🏖️', category: 'Outdoors' },
  { id: 'library', name: 'The Library', emoji: '📚', category: 'Education' },
  { id: 'zoo', name: 'The Zoo', emoji: '🦁', category: 'Adventure' },
  { id: 'hospital', name: 'The Hospital', emoji: '🏥', category: 'Community' },
  { id: 'restaurant', name: 'A Restaurant', emoji: '🍽️', category: 'Social' },
  { id: 'supermarket', name: 'The Supermarket', emoji: '🛒', category: 'Daily Life' },
  { id: 'museum', name: 'The Museum', emoji: '🏛️', category: 'Education' },
  { id: 'cinema', name: 'The Cinema', emoji: '🎬', category: 'Entertainment' },
  { id: 'airport', name: 'The Airport', emoji: '✈️', category: 'Travel' },
  { id: 'train_station', name: 'Train Station', emoji: '🚂', category: 'Travel' },
  { id: 'birthday_party', name: 'Birthday Party', emoji: '🎂', category: 'Social' },
  { id: 'camping', name: 'Camping Trip', emoji: '🏕️', category: 'Adventure' },
  { id: 'swimming_pool', name: 'Swimming Pool', emoji: '🏊', category: 'Sports' },
  { id: 'playground', name: 'The Playground', emoji: '🎢', category: 'Outdoors' },
  { id: 'farm', name: 'The Farm', emoji: '🚜', category: 'Nature' },
  { id: 'forest', name: 'The Forest', emoji: '🌲', category: 'Nature' },
  { id: 'mountain', name: 'The Mountain', emoji: '🏔️', category: 'Adventure' },
  { id: 'castle', name: 'A Castle', emoji: '🏰', category: 'Fantasy' },
  { id: 'spaceship', name: 'A Spaceship', emoji: '🚀', category: 'Fantasy' },
  { id: 'underwater', name: 'Underwater World', emoji: '🐠', category: 'Fantasy' },
  { id: 'bakery', name: 'The Bakery', emoji: '🥐', category: 'Daily Life' },
  { id: 'pet_shop', name: 'Pet Shop', emoji: '🐕', category: 'Daily Life' },
  { id: 'circus', name: 'The Circus', emoji: '🎪', category: 'Entertainment' },
  { id: 'amusement_park', name: 'Amusement Park', emoji: '🎡', category: 'Entertainment' },
  { id: 'dentist', name: 'The Dentist', emoji: '🦷', category: 'Community' },
  { id: 'fire_station', name: 'Fire Station', emoji: '🚒', category: 'Community' },
  { id: 'police_station', name: 'Police Station', emoji: '🚔', category: 'Community' },
  { id: 'art_class', name: 'Art Class', emoji: '🎨', category: 'Education' },
  { id: 'music_room', name: 'Music Room', emoji: '🎵', category: 'Education' },
  { id: 'basketball', name: 'Basketball Game', emoji: '🏀', category: 'Sports' },
  { id: 'hockey', name: 'Ice Hockey', emoji: '🏒', category: 'Sports' },
  { id: 'tennis', name: 'Tennis Match', emoji: '🎾', category: 'Sports' },
  { id: 'ski_resort', name: 'Ski Resort', emoji: '⛷️', category: 'Sports' },
  { id: 'treehouse', name: 'The Treehouse', emoji: '🌴', category: 'Adventure' },
  { id: 'pirate_ship', name: 'Pirate Ship', emoji: '🏴‍☠️', category: 'Fantasy' },
  { id: 'haunted_house', name: 'Haunted House', emoji: '👻', category: 'Fantasy' },
  { id: 'candy_store', name: 'Candy Store', emoji: '🍬', category: 'Daily Life' },
  { id: 'toy_store', name: 'Toy Store', emoji: '🧸', category: 'Daily Life' },
  { id: 'garden', name: 'The Garden', emoji: '🌻', category: 'Nature' },
  { id: 'kitchen', name: 'The Kitchen', emoji: '👨‍🍳', category: 'Daily Life' },
  { id: 'bedroom', name: 'The Bedroom', emoji: '🛏️', category: 'Daily Life' },
  { id: 'bus_ride', name: 'Bus Ride', emoji: '🚌', category: 'Travel' },
  { id: 'boat_trip', name: 'Boat Trip', emoji: '⛵', category: 'Travel' },
  { id: 'magic_school', name: 'Magic School', emoji: '🧙', category: 'Fantasy' },
  { id: 'dinosaur_land', name: 'Dinosaur Land', emoji: '🦕', category: 'Fantasy' },
  { id: 'winter_wonderland', name: 'Winter Wonderland', emoji: '❄️', category: 'Seasons' },
  { id: 'summer_camp', name: 'Summer Camp', emoji: '☀️', category: 'Seasons' },
]

// Voice options for text-to-speech
const VOICE_OPTIONS = [
  { id: 'en-US-Journey-D', name: 'David', gender: 'Male', accent: 'American', emoji: '👨' },
  { id: 'en-US-Journey-F', name: 'Sarah', gender: 'Female', accent: 'American', emoji: '👩' },
  { id: 'en-GB-Journey-D', name: 'James', gender: 'Male', accent: 'British', emoji: '🧔' },
  { id: 'en-GB-Journey-F', name: 'Emma', gender: 'Female', accent: 'British', emoji: '👩‍🦰' },
  { id: 'en-AU-Journey-D', name: 'Oliver', gender: 'Male', accent: 'Australian', emoji: '👨‍🦱' },
  { id: 'en-AU-Journey-F', name: 'Olivia', gender: 'Female', accent: 'Australian', emoji: '👱‍♀️' },
]

// Game flow steps
type GameStep = 'rules' | 'scenario' | 'difficulty' | 'voice' | 'playing'

interface StoryGapGameProps {
  words: string[]
  translations?: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (points: number, newTotal?: number, gameType?: string) => void
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
}

type GapMeta = { index: number; correct: string; why_unique: string; rejects: Array<{ word: string; reason: string }> }

export default function StoryGapGame({ words, translations = {}, onClose, trackingContext, themeColor, onScoreUpdate, gridConfig, sessionMode = false }: StoryGapGameProps) {
  // New game flow states - Skip the new flow and go directly to the old game
  const [gameStep, setGameStep] = useState<GameStep>('playing')
  // Auto-select default values to skip the new flow screens
  const [selectedScenario, setSelectedScenario] = useState<string | null>('school') // Default scenario
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-Journey-F') // Default voice
  const [scenarioFilter, setScenarioFilter] = useState<string>('All')
  
  // Text-to-speech states (using Web Speech API - no audio element needed)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  
  // AI Evaluation states
  const [evaluationResult, setEvaluationResult] = useState<{
    coherence: number
    wordChoice: number
    ending: number
    total: number
    feedback: string
    wordEvaluations: Array<{ word: string; correct: string; points: number; comment: string }>
  } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  
  // Original states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gapText, setGapText] = useState('')
  const [solutionText, setSolutionText] = useState('')
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [gapsMeta, setGapsMeta] = useState<GapMeta[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [checked, setChecked] = useState(false)
  const [correctMap, setCorrectMap] = useState<Record<number, boolean>>({})
  const [invalidMap, setInvalidMap] = useState<Record<number, string>>({}) // Track invalid words with reason
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(1)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [selectedGrid, setSelectedGrid] = useState<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] } | null>(null)
  const [difficulty, setDifficulty] = useState<'green' | 'yellow' | 'red' | null>(null)
  // In session mode, show grid selector if there are multiple blocks, otherwise skip it
  // In non-session mode, always show grid selector
  const [showGridSelector, setShowGridSelector] = useState(() => {
    if (sessionMode && gridConfig && gridConfig.length > 1) {
      return true // Show selector in session mode if multiple blocks
    }
    return !sessionMode // Show selector in non-session mode, skip if session mode with 1 or 0 blocks
  })
  const [showWordSelector, setShowWordSelector] = useState(false)
  const [wordsSelected, setWordsSelected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)
  const [isRetrying, setIsRetrying] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatusText, setLoadingStatusText] = useState('Charging spell...')

  // Validate if a word looks like valid English (basic heuristics)
  const looksLikeValidWord = (word: string): boolean => {
    const w = word.trim().toLowerCase()
    if (w.length === 0) return true // Empty is OK (not filled yet)
    if (w.length < 2) return true // Single letters are OK
    
    // Must contain at least one vowel (a, e, i, o, u, y)
    if (!/[aeiouy]/i.test(w)) return false
    
    // No more than 4 consonants in a row (most English words don't have this)
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)) return false
    
    // No more than 3 of the same letter in a row
    if (/(.)\1{2,}/i.test(w)) return false
    
    // Check for obviously random patterns (many uncommon letter combos)
    const uncommonPatterns = /[qx]{2}|[jkqvxz]{3}|^[bcdfghjklmnpqrstvwxz]{4,}|[bcdfghjklmnpqrstvwxz]{4,}$/i
    if (uncommonPatterns.test(w)) return false
    
    return true
  }

  // Check if word is from the word bank
  const isFromWordBank = (word: string): boolean => {
    const normalized = word.trim().toLowerCase()
    return usedWords.some(w => w.trim().toLowerCase() === normalized)
  }

  // Validate answer - must be from word bank or look like valid English
  const validateAnswer = (word: string): { valid: boolean; reason?: string } => {
    const w = word.trim()
    if (!w) return { valid: true } // Empty is OK
    
    // If it's from the word bank, it's valid
    if (isFromWordBank(w)) return { valid: true }
    
    // Otherwise, check if it looks like valid English
    if (!looksLikeValidWord(w)) {
      return { valid: false, reason: 'This does not look like a valid English word' }
    }
    
    return { valid: true }
  }

  const shuffle = (arr: string[]) => {
    const a = [...arr]
    // Use crypto.getRandomValues for better randomness if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomValues = new Uint32Array(a.length)
      crypto.getRandomValues(randomValues)
      for (let i = a.length - 1; i > 0; i--) {
        const j = randomValues[i] % (i + 1)
        ;[a[i], a[j]] = [a[j], a[i]]
      }
    } else {
      // Fallback to Math.random with timestamp seed for better variation
      const seed = Date.now() + Math.random()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor((seed * (i + 1)) % (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      // Additional shuffle pass with Math.random
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
    }
    return a
  }

  const uniquePreserve = (arr: string[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const w of arr) {
      const key = String(w).trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(String(w).trim())
    }
    return out
  }

  // Text-to-speech using Web Speech API (free, built into browser)
  // Vertex AI TTS removed for cost reasons
  const playStoryWithHighlighting = useCallback(async () => {
    if (!solutionText || isPlaying) return
    
    // Get the full story text (with user's answers filled in)
    const fullText = solutionText
    
    // Use Web Speech API instead of Vertex AI TTS
    if ('speechSynthesis' in window) {
      setIsPlaying(true)
      setCurrentWordIndex(0)
      
      // Simple word highlighting - highlight words as they would be spoken
      // (Web Speech API doesn't provide word timings, so we estimate)
      const words = fullText.split(/\s+/).filter(w => w.trim().length > 0)
      const estimatedTimePerWord = 0.5 // Rough estimate: 0.5 seconds per word
      let currentWordIdx = 0
      
      const highlightInterval = setInterval(() => {
        if (currentWordIdx < words.length) {
          setCurrentWordIndex(currentWordIdx)
          currentWordIdx++
        } else {
          clearInterval(highlightInterval)
        }
      }, estimatedTimePerWord * 1000)
      
      const utterance = new SpeechSynthesisUtterance(fullText)
      utterance.lang = 'en-US'
      utterance.rate = 0.9 // Slightly slower for clarity
      utterance.pitch = 1.0
      utterance.volume = 1.0
      
      utterance.onend = () => {
        clearInterval(highlightInterval)
        setIsPlaying(false)
        setCurrentWordIndex(-1)
      }
      
      utterance.onerror = () => {
        clearInterval(highlightInterval)
        setIsPlaying(false)
        setCurrentWordIndex(-1)
      }
      
      speechSynthesis.speak(utterance)
    } else {
      // Browser doesn't support speech synthesis
      console.warn('Browser does not support speech synthesis')
      setIsPlaying(false)
    }
  }, [solutionText, isPlaying])

  const stopPlayback = useCallback(() => {
    // Stop Web Speech API
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setCurrentWordIndex(-1)
  }, [])

  const retryGeneration = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    setError(null)
    setRetryCount(prev => prev + 1)
    
    // Trigger regeneration by resetting wordsSelected and then setting it back
    // This will cause the useEffect to run again
    setWordsSelected(false)
    setTimeout(() => {
      setWordsSelected(true)
      setIsRetrying(false)
    }, 100)
  }

  // Safe fallback templates (never use placeholders)
  // Varied templates for better sentence generation, especially for few words
  const SAFE_TEMPLATES = [
    (w: string) => `I left the ${w} on the kitchen counter.`,
    (w: string) => `Did you remember the ${w} before we left?`,
    (w: string) => `Tomorrow, we will discuss the ${w} in class.`,
    (w: string) => `She whispered the ${w} and closed the door.`,
    (w: string) => `Only the ${w} fits this narrow space.`,
    (w: string) => `Please attach the ${w} to the email.`,
    (w: string) => `They stored the ${w} in the attic.`,
    (w: string) => `What a relief the ${w} brought today.`,
    (w: string) => `The ${w} sat quietly in the corner.`,
    (w: string) => `Can you pass me the ${w}, please?`,
    (w: string) => `I found the ${w} under the table.`,
    (w: string) => `The ${w} looked beautiful in the sunlight.`,
    (w: string) => `My friend gave me the ${w} as a gift.`,
    (w: string) => `We saw the ${w} in the garden yesterday.`,
    (w: string) => `The ${w} made everyone smile.`
  ]

  // Safe fallback generator (only used if server fails completely)
  const makeSafeFallback = (wordSet: string[]): { gap_text: string; solution_text: string; used_words: string[]; gaps_meta: GapMeta[] } | null => {
    if (!wordSet || wordSet.length === 0) return null
    
    const gapLines: string[] = []
    const solLines: string[] = []
    const meta: GapMeta[] = []
    const usedWords: string[] = []
    
    for (let i = 0; i < wordSet.length; i++) {
      const word = wordSet[i]
      if (!word || word.trim().length === 0) continue
      
      const template = SAFE_TEMPLATES[i % SAFE_TEMPLATES.length]
      const solution = template(word)
      const gap = solution.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '______')
      solLines.push(solution)
      gapLines.push(gap)
      meta.push({ index: i + 1, correct: word.toLowerCase(), why_unique: 'fallback', rejects: [] })
      usedWords.push(word)
    }
    
    if (gapLines.length === 0 || solLines.length === 0) return null
    
    return {
      gap_text: gapLines.join('\n'),
      solution_text: solLines.join('\n'),
      used_words: usedWords,
      gaps_meta: meta
    }
  }

  // Handle word selection from WordSelector
  const handleGridSelected = (grids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    if (grids.length === 0) return
    
    // Sentence Gap only allows 1 grid (max 6 words)
    const grid = grids[0]
    setSelectedGrid(grid)
    setSelectedWords(grid.words)
    setShowGridSelector(false)
    setWordsSelected(true)
  }

  const handleWordsSelected = (words: string[]) => {
    setSelectedWords(words)
    setShowWordSelector(false)
    setWordsSelected(true)
  }

  // In session mode, handle grid selection based on number of blocks
  // If only 1 block in gridConfig, use it directly; if multiple, show selector
  useEffect(() => {
    if (sessionMode && gridConfig && gridConfig.length === 1 && !wordsSelected) {
      // Only 1 block - use it directly without showing selector
      const singleBlock = gridConfig[0]
      const blockWords = Array.isArray(singleBlock.words) 
        ? singleBlock.words.map(w => typeof w === 'string' ? w : (w as any).en || '')
        : []
      const pick = shuffle([...blockWords]).slice(0, Math.min(6, blockWords.length))
      
      // Build translations from words if they're objects, otherwise use translations prop
      const blockTranslations: Record<string, string> = {}
      if (Array.isArray(singleBlock.words)) {
        singleBlock.words.forEach(w => {
          if (typeof w === 'object' && w.en && w.sv) {
            blockTranslations[w.sv.toLowerCase()] = w.en
            blockTranslations[w.en.toLowerCase()] = w.sv
          } else if (typeof w === 'string' && translations[w.toLowerCase()]) {
            blockTranslations[w.toLowerCase()] = translations[w.toLowerCase()]
          }
        })
      }
      
      // Find colorScheme from COLOR_GRIDS based on color or index
      const colorScheme = COLOR_GRIDS.find(c => c.id === singleBlock.color) || COLOR_GRIDS[singleBlock.index % COLOR_GRIDS.length] || COLOR_GRIDS[0]
      
      setSelectedWords(pick)
      setSelectedGrid({
        words: pick,
        translations: blockTranslations,
        colorScheme: colorScheme
      })
      setWordsSelected(true)
      setShowGridSelector(false)
      // Don't auto-select difficulty - let user choose
    } else if (sessionMode && gridConfig && gridConfig.length > 1 && !wordsSelected) {
      // Multiple blocks - show selector (already set in useState)
      // Don't auto-select words, wait for user to choose grid
    } else if (sessionMode && words && words.length > 0 && !wordsSelected && (!gridConfig || gridConfig.length === 0)) {
      // Fallback: if no gridConfig but words provided, use words directly
      const pick = shuffle([...words]).slice(0, Math.min(6, words.length))
      setSelectedWords(pick)
      setWordsSelected(true)
      setShowGridSelector(false)
    } else if (!showGridSelector && !wordsSelected && selectedWords.length === 0) {
      // Non-session mode fallback
      const pool = Array.isArray(words) ? uniquePreserve(words) : []
      const pick = shuffle(pool).slice(0, Math.min(8, pool.length))
      setSelectedWords(pick)
      setWordsSelected(true)
    }
  }, [words, showGridSelector, wordsSelected, selectedWords.length, sessionMode, gridConfig])

  useEffect(() => {
    startedAtRef.current = Date.now()
    console.log('🎮 Story Gap: Game started (session will be created server-side)')
    setSessionId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!difficulty || !wordsSelected || selectedWords.length === 0) return
    
    const run = async () => {
      let progressInterval: NodeJS.Timeout | null = null
      let statusInterval: NodeJS.Timeout | null = null
      
      try {
        setLoading(true)
        setError(null)
        setLoadingProgress(0)
        setLoadingStatusText('Charging spell...')
        
        // Simulate progress during loading
        progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 90) return prev // Don't go above 90% until done
            const increment = Math.random() * 8 + 2 // Random increment between 2-10%
            return Math.min(prev + increment, 90)
          })
        }, 300)

        // Update status text based on progress
        statusInterval = setInterval(() => {
          setLoadingStatusText(prev => {
            const statuses = [
              'Charging spell...',
              'Aligning sentences...',
              'Mixing word potions...',
              'Weaving magic...',
              'Casting grammar...'
            ]
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
            return randomStatus !== prev ? randomStatus : prev
          })
        }, 1500)
        
        // No timeout - let generation take as long as needed
        
        // In session mode, selectedWords are already English
        // Otherwise, convert Swedish words to English before sending to API
        let englishWords: string[] = []
        
        if (sessionMode) {
          // In session mode, words are already English
          englishWords = [...selectedWords]
        } else {
          // Convert Swedish words to English before sending to API
          // selectedWords might be Swedish (from gridConfig), but API needs English words
          const allTranslations = selectedGrid?.translations || translations
          
          for (const word of selectedWords) {
            // Check if word is already English (contains common English letters/patterns)
            // or if it's Swedish and needs translation
            const translation = allTranslations[word.toLowerCase()]
            if (translation && translation !== `[${word}]`) {
              // Word is Swedish, use English translation
              englishWords.push(translation)
            } else {
              // Assume word is already English, or no translation found
              englishWords.push(word)
            }
          }
        }
        
        // Shuffle word order for variation in each session
        const shuffledEnglishWords = shuffle(englishWords)
        
        console.log('📝 Story Gap: Converting words for API:', {
          sessionMode,
          original: selectedWords,
          english: englishWords,
          shuffled: shuffledEnglishWords
        })
        
        // Add retry logic with exponential backoff
        let lastError: Error | null = null
        let data: any = null
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Don't show retry attempts to user - just continue silently
            if (attempt > 0) {
              setRetryCount(attempt)
              setIsRetrying(true)
            }
            
            // Get scenario name from selected scenario ID
            const scenarioName = STORY_SCENARIOS.find(s => s.id === selectedScenario)?.name

            const res = await fetch('/api/story-gap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                wordSet: shuffledEnglishWords, 
                difficulty,
                retryAttempt: attempt,
                scenario: scenarioName
              }),
            })
            
            if (!res.ok) {
              // Check if it's a generation failure that we can retry
              let parsedBody: any = null
              try { parsedBody = await res.json() } catch { parsedBody = null }
              
              // Check error type and provide helpful message
              const errorType = parsedBody?.error || 'unknown'
              const errorDetails = parsedBody?.details || 'unknown error'
              
              if (attempt < maxRetries) {
                console.log(`Generation failed (${errorType}), retrying... (${attempt + 1}/${maxRetries})`)
                const delay = Math.pow(2, attempt) * 1000
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
              } else {
                // All retries exhausted - use fallback generator
                console.warn('API failed, using fallback generator', { errorType, errorDetails })
                const fallbackData = makeSafeFallback(shuffledEnglishWords)
                if (fallbackData) {
                  data = fallbackData
                  break
                } else {
                  setError(`Could not generate sentences. Please try again or select different words.`)
                  return
                }
              }
            } else {
              const responseData = await res.json()
              
              // Server now validates everything, so we trust the response structure
              // Split by lines (not punctuation) as per new spec
              const incomingGap = String(responseData.gap_text || '')
              const incomingSolution = String(responseData.solution_text || '')
              const gapLines = incomingGap.split(/\r?\n/).filter(Boolean)
              const solLines = incomingSolution.split(/\r?\n/).filter(Boolean)
              const target = englishWords.length
              
              // Basic validation: line counts should match
              if (gapLines.length !== target || solLines.length !== target) {
                console.warn('Line count mismatch, retrying...', { gapLines: gapLines.length, solLines: solLines.length, target })
                if (attempt < maxRetries) {
                  const delay = Math.pow(2, attempt) * 1000
                  await new Promise(resolve => setTimeout(resolve, delay))
                  continue
                } else {
                  setError('Could not generate sentences for all words. Please try again.')
                  return
                }
              }
              
              // Validation passed, use this data
              data = responseData
              setRetryCount(0) // Reset on success
              setIsRetrying(false)
              if (progressInterval) clearInterval(progressInterval)
              if (statusInterval) clearInterval(statusInterval)
              setLoadingProgress(100)
              setLoadingStatusText('Spell complete!')
              break // Success
            }
          } catch (err) {
            lastError = err as Error
            if (attempt < maxRetries) {
              // Faster exponential backoff: wait 0.3s, 0.6s
              const delay = Math.pow(2, attempt) * 300
              console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`)
              setRetryCount(attempt + 1)
              setIsRetrying(true)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            } else {
              setRetryCount(0)
              setIsRetrying(false)
              if (progressInterval) clearInterval(progressInterval)
              if (statusInterval) clearInterval(statusInterval)
              throw lastError
            }
          }
        }
        
        if (progressInterval) clearInterval(progressInterval)
        if (statusInterval) clearInterval(statusInterval)
        
        if (!data) {
          throw lastError || new Error('No data received')
        }
        
        // Ensure progress is at 100% before finishing
        setLoadingProgress(100)
        setLoadingStatusText('Spell complete!')
        
        // Server provides validated data with line-based structure
        // Trust server-provided gaps_meta (order matches wordSet)
        const incomingGap = String(data.gap_text || '')
        const incomingSolution = String(data.solution_text || '')
        const gapLines = incomingGap.split(/\r?\n/).filter(Boolean)
        const solLines = incomingSolution.split(/\r?\n/).filter(Boolean)
        
        // Use server-provided gaps_meta verbatim (already validated)
        let finalMeta: GapMeta[] = Array.isArray(data.gaps_meta) ? data.gaps_meta.map((m: any) => ({
          index: m.index,
          correct: String(m.correct || '').trim().toLowerCase(),
          why_unique: 'server',
          rejects: []
        })) : []
        
        // Ensure gaps_meta matches wordSet order and length (use shuffled order)
        if (finalMeta.length !== shuffledEnglishWords.length) {
          console.warn('gaps_meta length mismatch, using fallback')
          // Use safe fallback if server meta is invalid
          const fallback = makeSafeFallback(shuffledEnglishWords)
          if (fallback) {
            setGapText(fallback.gap_text)
            setSolutionText(fallback.solution_text)
            finalMeta = fallback.gaps_meta
          } else {
            setError('Could not generate sentences. Please try again.')
            return
          }
        } else {
          // Use server data as-is (line-based)
          setGapText(incomingGap)
          setSolutionText(incomingSolution)
        }
        
        // Add word mapping for answer checking
        // In session mode, selectedWords are already English, so no need to map to Swedish
        const updatedMeta = finalMeta.map((meta, idx) => {
          const engWord = meta.correct
          if (sessionMode) {
            // In session mode, words are already English, no Swedish mapping needed
            return {
              ...meta,
              swedishWord: null
            }
          } else {
            // Map English words back to Swedish for answer checking
            const engIndex = englishWords.findIndex(w => w.trim().toLowerCase() === engWord)
            const swedishWord = engIndex >= 0 ? selectedWords[engIndex] : null
            
            return {
              ...meta,
              swedishWord: swedishWord // Add Swedish for user answer matching
            }
          }
        })
        setGapsMeta(updatedMeta as GapMeta[])
        
        // Show available words in random order (decoupled from sentence order)
        // Shuffle multiple times to ensure different order each session
        let shuffled = shuffle(englishWords)
        shuffled = shuffle(shuffled) // Double shuffle for better randomization
        setUsedWords(shuffled)
        
        // Prepare answer slots: one per line (one blank per line)
        const blanksCount = gapLines.length
        const init: Record<number, string> = {}
        for (let i = 1; i <= blanksCount; i++) init[i] = ''
        setAnswers(init)
        
        console.log('📝 Story Gap - Data loaded', { 
          gapLines: gapLines.length, 
          solLines: solLines.length, 
          metaCount: finalMeta.length,
          blanksCount 
        })
      } catch (e: any) {
        setError(e?.message || 'Failed to generate story.')
        setLoadingProgress(0)
        setLoadingStatusText('Charging spell...')
        if (progressInterval) clearInterval(progressInterval)
        if (statusInterval) clearInterval(statusInterval)
      } finally {
        setLoading(false)
        // Ensure intervals are cleared
        if (progressInterval) clearInterval(progressInterval)
        if (statusInterval) clearInterval(statusInterval)
      }
    }
    if (selectedWords.length >= 1 && difficulty && wordsSelected) run()
  }, [selectedWords, difficulty, wordsSelected])

  // Count blanks: one per line (deterministic structure)
  const blanks = useMemo(() => {
    const gapLines = String(gapText || '').split(/\r?\n/).filter(Boolean)
    return gapLines.length // One blank per line
  }, [gapText])

  const allAnswered = useMemo(() => {
    for (let i = 1; i <= blanks; i++) {
      if (!answers[i] || !answers[i].trim()) return false
    }
    return true
  }, [answers, blanks])

  const allCorrect = useMemo(() => {
    if (!checked) return false
    for (let i = 1; i <= blanks; i++) {
      if (!correctMap[i]) return false
    }
    return true
  }, [checked, correctMap, blanks])

  // Check if any answers are invalid (nonsense words)
  const hasInvalidAnswers = useMemo(() => {
    return Object.keys(invalidMap).length > 0
  }, [invalidMap])

  // Validate all answers before checking
  const validateAllAnswers = (): boolean => {
    const newInvalidMap: Record<number, string> = {}
    for (let i = 1; i <= blanks; i++) {
      const answer = answers[i] || ''
      if (answer.trim()) {
        const validation = validateAnswer(answer)
        if (!validation.valid) {
          newInvalidMap[i] = validation.reason || 'Invalid word'
        }
      }
    }
    setInvalidMap(newInvalidMap)
    return Object.keys(newInvalidMap).length === 0
  }

  // Calculate correct answers and return the map (for use in submit)
  const calculateCorrectAnswers = (): Record<number, boolean> => {
    const map: Record<number, boolean> = {}
    
    // Normalize function for consistent matching
    const normalize = (s: string) => s.trim().toLowerCase()
    
    // Build set of all acceptable answers per gap (English and Swedish)
    // For duplicates: same word can be correct for multiple gaps
    const acceptableAnswers = new Map<number, Set<string>>()
    for (const meta of gapsMeta) {
      const correct = normalize(meta.correct)
      const swedishWord = (meta as any).swedishWord
      const acceptable = new Set([correct])
      if (swedishWord) {
        acceptable.add(normalize(swedishWord))
      }
      acceptableAnswers.set(meta.index, acceptable)
    }
    
    // Strict matching: exact case-insensitive match
    // Duplicate words can match multiple gaps (interchangeable)
    // This works the same way in both session mode and non-session mode
    for (const meta of gapsMeta) {
      const userInput = String(answers[meta.index] || '').trim()
      const normalizedInput = normalize(userInput)
      const acceptable = acceptableAnswers.get(meta.index) || new Set()
      const currentCorrect = normalize(meta.correct)
      
      // For single-word inputs: exact match required
      // For multi-word inputs: exact match of entire phrase OR exact match of first word
      // (but only if no other words in input are correct answers for other gaps)
      let matches = false
      
      if (normalizedInput.length === 0) {
        matches = false
      } else {
        // Check full match first
        matches = acceptable.has(normalizedInput)
        
        // If no full match, check if it matches any duplicate word (same word in other gaps)
        if (!matches) {
          // Check if this input matches the same word used in other gaps (duplicate)
          for (const otherMeta of gapsMeta) {
            if (otherMeta.index === meta.index) continue // Skip current gap
            const otherCorrect = normalize(otherMeta.correct)
            if (otherCorrect === currentCorrect) {
              // Same word (duplicate), check if input matches
              const otherAcceptable = acceptableAnswers.get(otherMeta.index) || new Set()
              if (otherAcceptable.has(normalizedInput)) {
                matches = true
                break
              }
            }
          }
        }
        
        // If no full match and multi-word, check first word
        if (!matches && normalizedInput.includes(' ')) {
          const firstWord = normalizedInput.split(/\s+/)[0]
          if (acceptable.has(firstWord)) {
            // Check if any other word in input is a correct answer for another gap
            // Exception: if it's a duplicate word (same word in multiple gaps), allow it
            const otherWords = normalizedInput.split(/\s+/).slice(1)
            let hasOtherCorrect = false
            for (const word of otherWords) {
              for (const [idx, acc] of acceptableAnswers.entries()) {
                if (idx !== meta.index && acc.has(word)) {
                  // Check if this word is also correct for current gap (duplicate)
                  const otherCorrect = gapsMeta.find(m => m.index === idx)?.correct
                  if (normalize(otherCorrect || '') === currentCorrect) {
                    // Same word (duplicate), allow it
                    continue
                  }
                  hasOtherCorrect = true
                  break
                }
              }
              if (hasOtherCorrect) break
            }
            matches = !hasOtherCorrect
          }
        }
      }
      
      map[meta.index] = matches
    }
    
    return map
  }

  const checkAnswersVisual = () => {
    // First validate all answers
    if (!validateAllAnswers()) {
      // Don't proceed with checking if there are invalid words
      return
    }
    
    const map = calculateCorrectAnswers()
    setCorrectMap(map)
    setChecked(true)
  }

  const submit = async () => {
    if (submitted) return
    
    // Validate all answers first
    if (!validateAllAnswers()) {
      // Don't proceed with submitting if there are invalid words
      return
    }
    
    // Calculate correct answers - use existing checked map if available, otherwise calculate fresh
    let correctMapToUse: Record<number, boolean>
    if (!checked) {
      // Calculate fresh and update state for visual feedback
      correctMapToUse = calculateCorrectAnswers()
      setCorrectMap(correctMapToUse)
      setChecked(true)
    } else {
      // Use existing checked map
      correctMapToUse = correctMap
    }
    
    // Calculate and set score IMMEDIATELY based on correct answers (before AI evaluation)
    const totalGaps = gapsMeta.length
    const correctAnswers = Object.values(correctMapToUse).filter(Boolean).length
    const scoreResult = calculateStoryGapScore(correctAnswers, totalGaps, 0)
    setScore(scoreResult.pointsAwarded)
    
    // Send score update immediately for instant XP
    if (onScoreUpdate) {
      if (sessionMode) {
        onScoreUpdate(correctAnswers, totalGaps, 'story_gap')
        if (correctAnswers === totalGaps) {
          setTimeout(() => {
            onClose()
          }, 500)
        }
      } else {
        onScoreUpdate(scoreResult.pointsAwarded, totalGaps, 'story_gap')
      }
    }
    
    setSubmitted(true)
    setIsEvaluating(true)
    
    // Collect user's answers and correct answers
    const userWords: string[] = []
    const correctWords: string[] = []
    for (const meta of gapsMeta) {
      userWords.push(String(answers[meta.index] || '').trim())
      correctWords.push(meta.correct)
    }
    
    // Build completed story by replacing gaps with user's words
    const gapLines = String(gapText || '').split(/\r?\n/).filter(Boolean)
    const completedLines = gapLines.map((line, idx) => {
      return line.replace(/______+/, userWords[idx] || '______')
    })
    const completedStory = completedLines.join(' ')
    
    // Get scenario name
    const scenarioName = STORY_SCENARIOS.find(s => s.id === selectedScenario)?.name
    
    // AI evaluation runs in background (doesn't affect score)
    try {
      // Call AI evaluation endpoint
      const evalResponse = await fetch('/api/story-gap/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalStory: gapText,
          completedStory,
          correctWords,
          userWords,
          scenario: scenarioName
        })
      })
      
      if (evalResponse.ok) {
        const evalData = await evalResponse.json()
        setEvaluationResult(evalData)
        // Don't use evalData.total for score - it's AI evaluation score (0-100), not points
        // Score is already set above based on correct answers
      }
    } catch (error) {
      console.error('Evaluation error:', error)
      // Score is already set above, so we can ignore evaluation errors
    } finally {
      setIsEvaluating(false)
    }
    
    // BACKGROUND SYNC: Update database in background (non-blocking) - only if not in session mode
    if (!sessionMode) {
      const started = startedAtRef.current
      if (started) {
        const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
        void endGameSession(sessionId, 'story_gap', { 
          score: scoreResult.pointsAwarded, 
          durationSec: duration, 
          accuracyPct: scoreResult.accuracy,
          details: { blanks: totalGaps, correctAnswers, totalGaps } 
        })
      } else {
        void endGameSession(sessionId, 'story_gap', { 
          score: scoreResult.pointsAwarded, 
          accuracyPct: scoreResult.accuracy,
          details: { blanks: totalGaps, correctAnswers, totalGaps } 
        })
      }
    }
  }

  const usedByIndex = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [k, v] of Object.entries(answers)) {
      const val = String(v || '').trim().toLowerCase()
      if (!val) continue
      map[val] = Number(k)
    }
    return map
  }, [answers])

  const handlePickWord = (word: string) => {
    if (!activeIndex) return
    // Keep original case for display, but use lowercase for tracking
    const normalizedWord = String(word).trim().toLowerCase()
    
    // Check if this word is allowed to be used in multiple gaps (duplicate in wordSet)
    const wordCount = usedWords.filter(w => w.trim().toLowerCase() === normalizedWord).length
    const isDuplicate = wordCount > 1
    
    const prevIndex = usedByIndex[normalizedWord]
    setAnswers(prev => {
      const next = { ...prev }
      // Only clear previous usage if word is NOT a duplicate (duplicates can be used multiple times)
      if (!isDuplicate && prevIndex && prevIndex !== activeIndex) {
        next[prevIndex] = ''
      }
      // Store word as-is for display, matching will be case-insensitive
      next[activeIndex] = String(word).trim()
      return next
    })
  }

  // Render completed story with word highlighting during audio playback
  const renderCompletedStoryWithHighlighting = () => {
    if (!solutionText) return null
    
    // Split solution text into words while preserving punctuation
    const words = solutionText.split(/(\s+)/).filter(Boolean)
    let wordCount = 0
    
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-medium">Now Playing</span>
        </div>
        <p className="text-white text-lg leading-relaxed">
          {words.map((word, idx) => {
            // Skip whitespace for word counting
            const isWord = /\S/.test(word)
            if (isWord) {
              const thisWordIdx = wordCount
              wordCount++
              const isHighlighted = thisWordIdx === currentWordIndex
              return (
                <span
                  key={idx}
                  className={`transition-all duration-150 ${
                    isHighlighted 
                      ? 'bg-amber-400 text-black px-1 rounded font-semibold scale-105 inline-block' 
                      : ''
                  }`}
                >
                  {word}
                </span>
              )
            }
            return <span key={idx}>{word}</span>
          })}
        </p>
      </div>
    )
  }

  const renderGapSentences = () => {
    // Split by lines (not punctuation) as per new spec
    const gapLines = String(gapText || '').split(/\r?\n/).filter(Boolean)
    
    return (
      <div className="space-y-3">
        {gapLines.map((line, lineIdx) => {
          const parts = line.split(/(______+)/)
          let rendered: React.ReactNode[] = []
          const gapIndex = lineIdx + 1 // 1-based index
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (/^_{6,}$/.test(part)) {
              // Exactly one blank per line
              const currentValue = answers[gapIndex] || ''
              const isInvalid = !!invalidMap[gapIndex]
              const invalidReason = invalidMap[gapIndex]
              
              // Determine input border color based on validation state
              let inputBorderClass = 'border-white/10 focus:border-amber-500/50'
              if (isInvalid && !checked) {
                inputBorderClass = 'border-amber-500/70 focus:border-amber-400'
              }
              
              rendered.push(
                <span key={`gap-${lineIdx}-${i}`} className="relative inline-block">
                  <input
                    type="text"
                    autoComplete="off"
                    value={currentValue}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setAnswers(prev => ({ ...prev, [gapIndex]: newValue }))
                      // Clear invalid state when typing
                      if (invalidMap[gapIndex]) {
                        setInvalidMap(prev => {
                          const next = { ...prev }
                          delete next[gapIndex]
                          return next
                        })
                      }
                    }}
                    onBlur={() => {
                      // Validate on blur
                      const value = answers[gapIndex] || ''
                      if (value.trim()) {
                        const validation = validateAnswer(value)
                        if (!validation.valid) {
                          setInvalidMap(prev => ({ ...prev, [gapIndex]: validation.reason || 'Invalid word' }))
                        } else {
                          setInvalidMap(prev => {
                            const next = { ...prev }
                            delete next[gapIndex]
                            return next
                          })
                        }
                      }
                    }}
                    onFocus={() => setActiveIndex(gapIndex)}
                    placeholder={`#${gapIndex}`}
                    className={`inline-block align-baseline mx-1 px-2 py-1 rounded-lg bg-white/5 border ${inputBorderClass} focus:ring-2 focus:ring-amber-500/20 text-white placeholder:text-gray-500`}
                    style={{ minWidth: '7ch', maxWidth: '22ch' }}
                  />
                  {isInvalid && !checked && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-xs text-black font-bold cursor-help" 
                      title={invalidReason}
                    >
                      !
                    </span>
                  )}
                </span>
              )
            } else {
              rendered.push(<span key={`t-${lineIdx}-${i}`}>{part}</span>)
            }
          }
          
          // Check correctness for this line
          let isCorrect: boolean | null = null
          if (checked) {
            isCorrect = correctMap[gapIndex] === true
          }
          
          const frameClass = isCorrect === null
            ? ''
            : isCorrect
              ? 'border border-emerald-500/50 bg-emerald-500/10'
              : 'border border-red-500/50 bg-red-500/10'
          
          return (
            <div key={`line-${lineIdx}`} className="flex items-start gap-2">
              <div className="text-xs text-gray-400 pt-1">{lineIdx + 1}.</div>
              <div className={`whitespace-pre-wrap leading-7 flex-1 rounded-lg px-2 text-white ${frameClass}`}>{rendered}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading && difficulty) {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50">
        <div className="relative rounded-2xl p-8 max-w-lg w-full shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div className="text-2xl text-white font-bold mb-2">Spell School</div>
            <div className="text-sm text-gray-400">Preparing your word set...</div>
          </div>
          <MagicalProgressBar progress={loadingProgress} statusText={loadingStatusText} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative rounded-2xl p-8 max-w-2xl w-full shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <div className="text-red-400 mb-4">
            <h3 className="font-semibold mb-2 text-white">Ett fel uppstod vid generering av meningar</h3>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {retryCount < maxRetries && (
              <button 
                onClick={() => {
                  setError(null)
                  setRetryCount(prev => prev + 1)
                }} 
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all"
              >
                Försök igen ({retryCount + 1}/{maxRetries})
              </button>
            )}
            <button 
              onClick={() => {
                setShowWordSelector(true)
                setWordsSelected(false)
                setRetryCount(0)
                setError(null)
              }} 
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all"
            >
              Välj andra ord
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 rounded-xl transition-all">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // In session mode, don't show completion screen - just close automatically if 100% correct
  if (submitted && !sessionMode) {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/10 my-4 text-center">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <h2 className="text-2xl font-bold text-white">Sentence Gap</h2>
              <p className="text-sm text-gray-400">Game complete!</p>
            </div>
          </div>

          {/* Score Display */}
          <div className="bg-amber-500/10 rounded-xl p-6 mb-6 border border-amber-500/30">
            <div className="text-3xl font-bold text-amber-300 mb-2">Score: {score} / {blanks * 2}</div>
            <div className="text-lg text-amber-400">Correct: {Math.floor(score / 2)} / {blanks}</div>
          </div>

          <button 
            onClick={onClose} 
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-3 px-8 rounded-xl font-semibold transition-colors duration-150"
          >
            Stäng
          </button>
        </div>
      </div>
    )
  }
  
  // In session mode, if submitted and 100% correct, don't render anything (will close automatically)
  if (submitted && sessionMode) {
    const totalGaps = gapsMeta.length
    const correctAnswers = Object.values(correctMap).filter(Boolean).length
    if (correctAnswers === totalGaps) {
      return null // Will close automatically
    }
  }

  const sentences = solutionText.split(/(?<=[.!?])\s+/).filter(Boolean)

  // Get unique categories for filtering
  const scenarioCategories = ['All', ...new Set(STORY_SCENARIOS.map(s => s.category))]
  const filteredScenarios = scenarioFilter === 'All' 
    ? STORY_SCENARIOS 
    : STORY_SCENARIOS.filter(s => s.category === scenarioFilter)

  // ============ STEP 1: RULES SCREEN ============
  if (gameStep === 'rules') {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        {/* Aurora background effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Story Gap Adventure</h1>
            <p className="text-amber-300">Complete the story by finding the perfect words!</p>
          </div>

          {/* Rules Section */}
          <div className="space-y-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Your Goal</h3>
                  <p className="text-gray-400 text-sm">Read the story and find the word that fits perfectly in each gap. The story should make sense and flow naturally when complete.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📝</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">How to Play</h3>
                  <p className="text-gray-400 text-sm">Click on a gap and choose a word from the word bank, or type your own word. Each gap needs exactly one word to complete the sentence.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⭐</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Scoring</h3>
                  <p className="text-gray-400 text-sm">Your score is based on how well your words fit the story, how coherent the narrative is, and whether the story reaches a satisfying conclusion.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🔊</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Listen & Learn</h3>
                  <p className="text-gray-400 text-sm">The story will be read aloud to you! Follow along as each word is highlighted while being spoken.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setGameStep('scenario')}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold transition-colors duration-150 flex items-center justify-center gap-2"
            >
              Choose Scenario
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 2: SCENARIO SELECTION ============
  if (gameStep === 'scenario') {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 w-full max-w-4xl shadow-2xl border border-white/10 my-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Your Setting</h2>
            <p className="text-gray-400">Where should your story take place?</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {scenarioCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setScenarioFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  scenarioFilter === cat
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scenario Grid */}
          <div className="flex-1 overflow-y-auto mb-6 pr-2 -mr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredScenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`p-4 rounded-xl border transition-all text-center ${
                    selectedScenario === scenario.id
                      ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-3xl mb-2">{scenario.emoji}</div>
                  <div className="text-white text-sm font-medium">{scenario.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameStep('rules')}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setGameStep('difficulty')}
              disabled={!selectedScenario}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose Difficulty
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 3: DIFFICULTY SELECTION ============
  if (gameStep === 'difficulty') {
    const difficultyOptions = [
      {
        id: 'green' as const,
        name: 'Easy',
        emoji: '🌱',
        color: 'from-emerald-500 to-green-500',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30',
        description: 'Short story, fewer gaps, simple vocabulary',
        details: '3-4 sentences • 3-4 gaps • Basic words'
      },
      {
        id: 'yellow' as const,
        name: 'Medium',
        emoji: '⚡',
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
        description: 'Moderate length, more gaps, varied vocabulary',
        details: '5-6 sentences • 5-6 gaps • Mixed words'
      },
      {
        id: 'red' as const,
        name: 'Hard',
        emoji: '🔥',
        color: 'from-red-500 to-pink-500',
        bgColor: 'bg-red-500/10 border-red-500/30',
        description: 'Long story, many gaps, challenging vocabulary',
        details: '7-8 sentences • 7-8 gaps • Advanced words'
      }
    ]

    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Gauge className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Difficulty</h2>
            <p className="text-gray-400">How challenging do you want the story to be?</p>
          </div>

          {/* Difficulty Options */}
          <div className="space-y-4 mb-8">
            {difficultyOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDifficulty(opt.id)}
                className={`w-full p-5 rounded-2xl border transition-all text-left ${
                  difficulty === opt.id
                    ? `${opt.bgColor} ring-2 ring-offset-2 ring-offset-[#12122a]`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                } ${difficulty === opt.id ? `ring-${opt.id === 'green' ? 'emerald' : opt.id === 'yellow' ? 'amber' : 'red'}-500/50` : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{opt.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-lg">{opt.name}</div>
                    <div className="text-gray-400 text-sm">{opt.description}</div>
                    <div className="text-gray-500 text-xs mt-1">{opt.details}</div>
                  </div>
                  {difficulty === opt.id && (
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameStep('scenario')}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setGameStep('voice')}
              disabled={!difficulty}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose Voice
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 4: VOICE SELECTION ============
  if (gameStep === 'voice') {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Narrator</h2>
            <p className="text-gray-400">Who should read your story aloud?</p>
          </div>

          {/* Voice Options */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {VOICE_OPTIONS.map(voice => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`p-5 rounded-2xl border transition-all text-left ${
                  selectedVoice === voice.id
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{voice.emoji}</div>
                  <div>
                    <div className="text-white font-semibold">{voice.name}</div>
                    <div className="text-gray-400 text-sm">{voice.accent} • {voice.gender}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameStep('difficulty')}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => {
                setGameStep('playing')
                // Start generating the story with selected options
              }}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold transition-colors duration-150 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Generate Story
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING STEP - Show existing game UI ============
  // Color grid selection screen
  if (showGridSelector) {
    // Convert gridConfig to the format ColorGridSelector expects
    // ColorGridSelector expects { color: string, index: number } but we receive { colorScheme: ... }
    const convertedGridConfig = gridConfig?.map((config: any, index: number) => ({
      words: config.words || [],
      color: config.colorScheme?.hex || config.color || COLOR_GRIDS[index % COLOR_GRIDS.length].hex,
      index: config.index !== undefined ? config.index : index,
      translations: config.translations || {}
    })) || undefined
    
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={handleGridSelected}
        onClose={onClose}
        minGrids={1}
        maxGrids={1}
        wordsPerGrid={6}
        title="Select Color Grid"
        description="Choose one color grid to practice with (max 6 words)"
        gridConfig={convertedGridConfig}
      />
    )
  }

  // Difficulty pre-selection screen
  if (!difficulty) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative w-full max-w-2xl">
          <div className="relative rounded-2xl p-8 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
            {/* Header */}
            <div className="mb-8">
              <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Sentence Gap</h2>
              <p className="text-gray-400 text-sm">Choose difficulty level</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-2 text-white">Choose difficulty level</h3>
              <p className="text-gray-400 text-sm mb-6">The text will be generated after you select a level.</p>
              
              <div className="flex items-center justify-center gap-4">
                <button 
                  className="px-8 py-6 rounded-xl border transition-all shadow-lg hover:shadow-xl hover:scale-105 flex flex-col items-center gap-3 bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
                  onClick={() => setDifficulty('green')}
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl font-bold">E</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Easy</span>
                </button>
                <button 
                  className="px-8 py-6 rounded-xl border transition-all shadow-lg hover:shadow-xl hover:scale-105 flex flex-col items-center gap-3 bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
                  onClick={() => setDifficulty('yellow')}
                >
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl font-bold">M</span>
                  </div>
                  <span className="text-amber-400 font-semibold">Medium</span>
                </button>
                <button 
                  className="px-8 py-6 rounded-xl border transition-all shadow-lg hover:shadow-xl hover:scale-105 flex flex-col items-center gap-3 bg-red-500/10 border-red-500/30 hover:border-red-500/50"
                  onClick={() => setDifficulty('red')}
                >
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl font-bold">H</span>
                  </div>
                  <span className="text-red-400 font-semibold">Hard</span>
                </button>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 w-full max-w-6xl shadow-2xl border border-white/10 my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sentence Gap</h2>
              <p className="text-sm text-gray-400">Fill in the missing words</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
          >
            <span className="text-gray-400 text-xl">×</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6 text-center">
              <div className="text-red-400 text-lg mb-3">⚠️</div>
              <div className="text-red-300 font-semibold mb-4">{error}</div>
              <button
                onClick={retryGeneration}
                disabled={isRetrying}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30 hover:shadow-xl disabled:shadow-lg"
              >
                {isRetrying ? 'Retrying...' : 'Try again'}
              </button>
            </div>
          </div>
        )}

        {/* Story Info Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Difficulty Badge */}
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border ${
            difficulty === 'green' ? 'bg-emerald-500/10 border-emerald-500/30' :
            difficulty === 'yellow' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <span className={`text-sm font-medium ${
              difficulty === 'green' ? 'text-emerald-400' :
              difficulty === 'yellow' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {difficulty === 'green' ? '🌱 Easy' : difficulty === 'yellow' ? '⚡ Medium' : '🔥 Hard'}
            </span>
          </div>

          {/* Play/Pause Button */}
          {submitted && (
            <button
              onClick={isPlaying ? stopPlayback : playStoryWithHighlighting}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
                isPlaying 
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' 
                  : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Listen</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Show highlighted story during audio playback */}
        {isPlaying && renderCompletedStoryWithHighlighting()}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl border border-white/10 p-6">
              {renderGapSentences()}
            </div>
            <div className="mt-3 text-sm text-gray-400 font-medium">Active gap: {activeIndex ?? '—'}</div>
            {/* Hints removed per requirements */}
          </div>

          <div>
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <div className="text-lg font-bold mb-4 text-white flex items-center">
                <FileText className="w-5 h-5 mr-2 text-amber-400" />
                Available words
              </div>
              <div className="flex flex-wrap gap-3">
                {usedWords.map((w, i) => {
                  const key = String(w).toLowerCase()
                  const isUsed = !!usedByIndex[key]
                  return (
                    <span
                      key={`${w}-${i}`}
                      className={`select-none px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        isUsed 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-lg' 
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                      }`}
                      title={isUsed ? 'Used in a gap' : 'Not used yet'}
                    >
                      {w}
                    </span>
                  )
                })}
              </div>
              <div className="mt-4 text-sm text-amber-400 font-medium">Write the words in the gaps. Used words will turn orange.</div>
            </div>
          </div>
        </div>

        {/* Progress and Actions */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30">
            <span className="text-sm font-medium text-amber-300">
              Gaps: {blanks} • Filled: {Object.values(answers).filter(v => String(v || '').trim()).length}
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={checkAnswersVisual} 
              disabled={!allAnswered || submitted} 
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold disabled:bg-white/5 disabled:text-gray-600 disabled:border-white/5 transition-all"
            >
              Check
            </button>
            <button 
              onClick={submit} 
              disabled={!allAnswered || submitted} 
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold disabled:bg-white/5 disabled:text-gray-600 transition-colors duration-150"
            >
              Submit
            </button>
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-xl font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Warning for invalid words */}
        {hasInvalidAnswers && !checked && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div>
              <p className="text-amber-300 font-medium text-sm">Några ord ser inte ut som riktiga engelska ord</p>
              <p className="text-amber-400/70 text-xs mt-1">Check the marked fields. Choose words from the word list below or write valid English words.</p>
            </div>
          </div>
        )}

        {submitted && (
          <div className="mt-6 space-y-4">
            {isEvaluating ? (
              <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-400">Evaluating your story...</p>
              </div>
            ) : evaluationResult ? (
              <div className="space-y-4">
                {/* Main Score Display */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/30">
                  <div className="text-center mb-4">
                    <div className="text-5xl font-bold text-white mb-1">{evaluationResult.total}</div>
                    <div className="text-amber-300">Total Score</div>
                  </div>
                  
                  {/* Score Breakdown */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-amber-400">{evaluationResult.coherence}</div>
                      <div className="text-xs text-gray-400">Coherence</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-400">{evaluationResult.wordChoice}</div>
                      <div className="text-xs text-gray-400">Word Choice</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-amber-400">{evaluationResult.ending}</div>
                      <div className="text-xs text-gray-400">Ending</div>
                    </div>
                  </div>
                </div>

                {/* AI Feedback */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💬</span>
                    <p className="text-gray-300">{evaluationResult.feedback}</p>
                  </div>
                </div>

                {/* Word-by-word evaluation (collapsed by default) */}
                {evaluationResult.wordEvaluations && evaluationResult.wordEvaluations.length > 0 && (
                  <details className="bg-white/5 rounded-2xl border border-white/10">
                    <summary className="p-4 cursor-pointer text-gray-300 hover:text-white">
                      📝 View word-by-word feedback
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                      {evaluationResult.wordEvaluations.map((we, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${we.word.toLowerCase() === we.correct.toLowerCase() ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-white">{we.word}</span>
                            <span className={`text-sm ${we.word.toLowerCase() === we.correct.toLowerCase() ? 'text-emerald-400' : 'text-amber-400'}`}>
                              +{we.points}
                            </span>
                          </div>
                          {we.word.toLowerCase() !== we.correct.toLowerCase() && (
                            <div className="text-xs text-gray-400 mt-1">Expected: {we.correct}</div>
                          )}
                          {we.comment && <div className="text-xs text-gray-500 mt-1">{we.comment}</div>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-6 py-3 rounded-2xl border border-emerald-500/30">
                  <span className="text-emerald-400">🎯</span>
                  <span className="font-semibold text-emerald-300">
                    Correct: {Object.values(correctMap).filter(Boolean).length} / {blanks} • Score: {score}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Facit removed per requirements */}
      </div>
    </div>
  )
}


