'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useActivityTracking } from '@/hooks/useActivityTracking'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'
import { BookOpen, Target, Star, Users, ChevronDown, Calendar, LogOut, Trophy, X, Gem } from 'lucide-react'
import Link from 'next/link'
import { levelForXp } from '@/lib/leveling'
import { titleForLevel } from '@/lib/wizardTitles'
import FlashcardGame from '@/components/games/FlashcardGame'
import MemoryGame from '@/components/games/WordMatchingGame'
import TypingChallenge from '@/components/games/TypingChallenge'
import TranslateGame from '@/components/games/TranslateGame'
import LineMatchingGame from '@/components/games/LineMatchingGame'
import LevelUpModal from '@/components/LevelUpModal'
import StoryGapGame from '@/components/games/StoryGapGame'
import QuizGame from '@/components/games/QuizGame'
import MultipleChoiceGame from '@/components/games/MultipleChoiceGame'
import RouletteGame from '@/components/games/RouletteGame'
import StoryBuilderGame from '@/components/games/StoryBuilderGame'
import ScenarioGame from '@/components/games/ScenarioGame'
import ScrambleGame from '@/components/games/ScrambleGame'
import { type TrackingContext, updateStudentProgress as addProgress } from '@/lib/tracking'
import { enqueueQuestProgress, enqueueQuestComplete } from '@/lib/questOutbox'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'
import GameCard from '@/components/GameCard'
import LogoutHandler from '@/components/LogoutHandler'
import { useAccountStreak } from '@/hooks/useAccountStreak'
import BadgeGrid from '@/components/BadgeGrid'
import BadgeNotification from '@/components/BadgeNotification'
import BadgeFlyAnimation from '@/components/BadgeFlyAnimation'
import { useAnimationQueue } from '@/lib/animationQueue'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'
import { COLOR_GRIDS } from '@/components/ColorGridSelector'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface Homework {
  id: string
  title: string
  description: string
  vocabulary_words: string[] // Keep for backward compatibility
  words?: Word[] // New field for word objects with images
  due_date: string | null
  teacher_id: string
  created_at: string
  translations?: { [key: string]: string }
  color?: string
}

interface StudentProgress {
  total_points: number
  games_played: number
  last_played_at: string
  word_set_id: string
  homework_id: string
}

interface ClassLeaderboardPlayer {
  id: string
  displayName?: string | null
  username?: string | null
  name?: string | null
  totalPoints: number
  badgeCount: number
  longestStreak: number
  bestKpm: number
  averageAccuracy: number
  sessionCount: number
}

interface ClassLeaderboardResponse {
  success: boolean
  currentUserId: string
  players: ClassLeaderboardPlayer[]
}

type EnrichedLeaderboardPlayer = ClassLeaderboardPlayer & {
  level: number
  wizardImage: string
}

// Dynamic Background Component - Changes based on time of day
function DynamicBackground() {
  const [bgIndex, setBgIndex] = useState(1)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Get background index based on time of day
  const getBackgroundIndex = () => {
    const now = new Date()
    const hour = now.getHours()
    
    // Morning/Forenoon: 6:00 - 11:59 (bild 1)
    if (hour >= 6 && hour < 12) {
      return 1
    }
    // Afternoon (after lunch): 12:00 - 15:59 (bild 2)
    if (hour >= 12 && hour < 16) {
      return 2
    }
    // Late afternoon: 16:00 - 19:59 (bild 3)
    if (hour >= 16 && hour < 20) {
      return 3
    }
    // Evening/Night: 20:00 - 5:59 (bild 4)
    return 4
  }

  // Update background when time changes
  useEffect(() => {
    const updateBackground = () => {
      const newIndex = getBackgroundIndex()
      setBgIndex(newIndex)
    }

    // Set initial background
    updateBackground()

    // Check every minute if we need to change background (when hour changes)
    const interval = setInterval(() => {
      updateBackground()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  // Load image when bgIndex changes
  useEffect(() => {
    const imageUrl = `/assets/spell-school-bg-${bgIndex}.png`
    const img = new Image()
    img.onload = () => {
      setImageLoaded(true)
      console.log('✅ Background image loaded:', imageUrl, `(Time: ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')})`)
    }
    img.onerror = () => {
      console.warn('⚠️ Background image not found:', imageUrl)
      setImageLoaded(false)
    }
    img.src = imageUrl
  }, [bgIndex])

  const imageUrl = `/assets/spell-school-bg-${bgIndex}.png`

  return (
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 z-0"
      style={{
        backgroundImage: imageLoaded ? `url('${imageUrl}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: imageLoaded ? 1 : 0
      }}
    />
  )
}

function StudentDashboardContent() {
  // Track user activity for better "Playing" status
  useActivityTracking()
  
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [initialScenarioEnvironment, setInitialScenarioEnvironment] = useState<string | null>(null)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [oldWordSets, setOldWordSets] = useState<Homework[]>([])
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showFlashcardGame, setShowFlashcardGame] = useState(false)
  const [showWordMatchingGame, setShowWordMatchingGame] = useState(false)
  const [showTypingChallenge, setShowTypingChallenge] = useState(false)
  const [showTranslateGame, setShowTranslateGame] = useState(false)
  const [showStoryGap, setShowStoryGap] = useState(false)
  const [showLineMatchingGame, setShowLineMatchingGame] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [showChoice, setShowChoice] = useState(false)
  const [showRoulette, setShowRoulette] = useState(false)
  const [showDistortedTale, setShowDistortedTale] = useState(false)
  const [showScenarioGame, setShowScenarioGame] = useState(false)
  const [showSpellCasting, setShowSpellCasting] = useState(false)
  const [pendingGame, setPendingGame] = useState<'flashcards' | 'match' | 'typing' | 'translate' | 'connect' | 'quiz' | 'choice' | 'storygap' | 'roulette' | 'distorted_tale' | 'scenario' | 'scramble' | null>(null)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [showHomeworkSelection, setShowHomeworkSelection] = useState(false)
  const [showAllOldWordSets, setShowAllOldWordSets] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title?: string; image?: string; description?: string } | null>(null)
  const [showWizardModal, setShowWizardModal] = useState(false)
  const [showWordSetModal, setShowWordSetModal] = useState(false)
  const [selectedWordSet, setSelectedWordSet] = useState<any>(null)
  const [wordSetTab, setWordSetTab] = useState(0)
  const [classInfo, setClassInfo] = useState<{id: string, name: string} | null>(null)
  const [teacherInfo, setTeacherInfo] = useState<{name: string} | null>(null)
  const [activeSessions, setActiveSessions] = useState<Array<{
    id: string
    session_code: string
    session_name: string | null
    due_date: string
    enabled_games: string[]
    word_set_title: string
  }>>([])
  const [dailyQuests, setDailyQuests] = useState<any[]>([])
  const [questProgress, setQuestProgress] = useState<{[key: string]: number}>({})
  const [showBonusNotification, setShowBonusNotification] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [leaderboardData, setLeaderboardData] = useState<ClassLeaderboardResponse | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Daily quest badges - use original hook but optimized
  const { awardBadgeForQuest, recentBadges, stats: badgeStats, newBadge, setNewBadge, refreshRecentBadges } = useDailyQuestBadges()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [flyingBadgeId, setFlyingBadgeId] = useState<string | null>(null)
  const [highlightedBadgeId, setHighlightedBadgeId] = useState<string | null>(null)
  
  // Animation queue for badge popups
  const { currentAnimation, dismiss } = useAnimationQueue()
  const leveling = levelForXp(points)
  const wizardTitle = titleForLevel(leveling.level)
  const { currentStreak, recomputeStreak } = useAccountStreak()
  const [devMode, setDevMode] = useState(false)


  // Touch/swipe navigation handlers
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    // Touch navigation disabled - no achievements system
  }



  // Daily Quest definitions
  const questDefinitions = {
    easy: [
      { id: 'play_3_games', title: 'Word Warrior', description: 'Complete 3 games of any type', target: 3, xp: 15, icon: '⚔️' },
      { id: 'memory_2', title: 'Memory Champion', description: 'Complete 2 Memory Games', target: 2, xp: 15, icon: '🧠' },
      { id: 'typing_1', title: 'Spelling Bee', description: 'Complete 1 Typing Challenge', target: 1, xp: 10, icon: '⌨️' },
      { id: 'choice_3_perfect', title: 'Choice Master', description: 'Complete 3 perfect games of multiple choice', target: 3, xp: 20, icon: '✅' },
      { id: 'sentence_gap_perfect', title: 'Gap Filler', description: 'Get a perfect result in sentence gap', target: 1, xp: 18, icon: '📝' },
      { id: 'roulette_perfect_5_words', title: 'Sentence Starter', description: 'Create a perfect sentence with 5+ words', target: 1, xp: 15, icon: '📝' }
    ],
    medium: [
      { id: 'sentence_gap_2', title: 'Sentence Builder', description: 'Complete 2 Sentence Gap games', target: 2, xp: 35, icon: '📝' },
      { id: 'roulette_3', title: 'Roulette Master', description: 'Get 3 perfect sentences in Word Roulette', target: 3, xp: 45, icon: '🎯' },
      { id: 'multi_game_4', title: 'Multi-Game Player', description: 'Play 4 different game types today', target: 4, xp: 50, icon: '🎮' },
      { id: 'perfect_score_1', title: 'Perfect Score', description: 'Get 100% accuracy in any game', target: 1, xp: 30, icon: '💯' },
      { id: 'roulette_perfect_10_words', title: 'Sentence Expert', description: 'Create a perfect sentence with 10+ words', target: 1, xp: 45, icon: '📖' }
    ],
    hard: [
      { id: 'sentence_gap_5', title: 'Grammar Guru', description: 'Complete 5 Sentence Gap games perfectly', target: 5, xp: 75, icon: '📖' },
      { id: 'roulette_5', title: 'Roulette Legend', description: 'Get 5 perfect sentences in Word Roulette', target: 5, xp: 90, icon: '👑' },
      { id: 'marathon_10', title: 'Marathon Runner', description: 'Complete 10 games in one day', target: 10, xp: 100, icon: '🏃‍♂️' },
      { id: 'perfect_3', title: 'Perfectionist', description: 'Get 100% accuracy in 3 different games', target: 3, xp: 85, icon: '⭐' },
      { id: 'quiz_perfect', title: 'Quiz God', description: 'Get 100% accuracy in Quiz', target: 1, xp: 70, icon: '🎓' },
      { id: 'typing_speed', title: 'Speed God', description: 'Complete Typing Challenge under 25 seconds', target: 1, xp: 75, icon: '⚡' },
      { id: 'roulette_perfect_20_words', title: 'Sentence Master', description: 'Create a perfect sentence with 20+ words', target: 1, xp: 100, icon: '📚' },
      { id: 'scenario_breakfast_2_stars', title: 'Breakfast Chef', description: 'Complete "Make Breakfast" scenario with 2 stars', target: 1, xp: 50, icon: '👨‍🍳' },
      { id: 'scenario_breakfast_3_stars', title: 'Master Chef', description: 'Complete "Make Breakfast" scenario with 3 stars (perfect!)', target: 1, xp: 75, icon: '🏆' }
    ]
  }

  // Generate daily quests (3 per day: easy, medium, hard)
  const generateDailyQuests = (userId?: string) => {
    const now = new Date()
    const today = now.toDateString()
    // Include user ID in localStorage key to prevent cross-user contamination
    const userKey = userId ? `_${userId}` : ''
    const stored = localStorage.getItem(`dailyQuests_${today}${userKey}`)
    
    // Check if we need to reset quests (at 6 AM every day)
    const resetTime = new Date(now)
    resetTime.setHours(6, 0, 0, 0) // 6 AM
    const shouldReset = now >= resetTime && (!stored || new Date(JSON.parse(stored).resetTime || 0) < resetTime)
    
    if (stored && !shouldReset) {
      const questData = JSON.parse(stored)
      const quests = questData.quests || questData // Handle both old and new format
      
      console.log('Loading quests from localStorage:', {
        today,
        questCount: quests.length,
        quests: quests.map((q: any) => ({ id: q.id, title: q.title, progress: q.progress, completed: q.completed })),
        completedQuests: quests.filter((q: any) => q.completed).map((q: any) => q.id)
      })
      
      // Restore quest progress from localStorage for quests that use separate tracking
      
      // Restore perfect_3 quest progress
      const perfectGamesKey = `perfectGames_${today}${userKey}`
      const perfectGames = JSON.parse(localStorage.getItem(perfectGamesKey) || '[]')
      const perfect3Quest = quests.find((q: any) => q.id === 'perfect_3')
      if (perfect3Quest) {
        const oldProgress = perfect3Quest.progress
        perfect3Quest.progress = Math.min(perfectGames.length, perfect3Quest.target)
        console.log('Restored perfect_3 quest progress:', { oldProgress, newProgress: perfect3Quest.progress, perfectGames })
      }
      
      // Restore multi_game_4 quest progress
      const playedGamesKey = `playedGames_${today}${userKey}`
      const playedGames = JSON.parse(localStorage.getItem(playedGamesKey) || '[]')
      const multiGameQuest = quests.find((q: any) => q.id === 'multi_game_4')
      if (multiGameQuest) {
        const oldProgress = multiGameQuest.progress
        multiGameQuest.progress = Math.min(playedGames.length, multiGameQuest.target)
        console.log('Restored multi_game_4 quest progress:', { oldProgress, newProgress: multiGameQuest.progress, playedGames })
      }
      
      return quests
    }

    // Generate new quests for the day
    console.log('Generating new daily quests for', today)
    
    // Log all available quests for debugging
    console.log('📋 Available Easy Quests:', questDefinitions.easy.map(q => `${q.id}: ${q.title}`))
    console.log('📋 Available Medium Quests:', questDefinitions.medium.map(q => `${q.id}: ${q.title}`))
    console.log('📋 Available Hard Quests:', questDefinitions.hard.map(q => `${q.id}: ${q.title}`))
    
    // Use a seed based on the date to ensure all users get the same quests
    const dateSeed = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }
    
    // Random quest selection using seeded random for consistency across the day
    const easyIndex = Math.floor(seededRandom(dateSeed) * questDefinitions.easy.length)
    const mediumIndex = Math.floor(seededRandom(dateSeed + 1) * questDefinitions.medium.length)
    const hardIndex = Math.floor(seededRandom(dateSeed + 2) * questDefinitions.hard.length)
    
    console.log(`🎲 Quest indices: Easy[${easyIndex}], Medium[${mediumIndex}], Hard[${hardIndex}]`)
    
    const easy = questDefinitions.easy[easyIndex]
    const medium = questDefinitions.medium[mediumIndex]
    const hard = questDefinitions.hard[hardIndex]

    const quests = [easy, medium, hard].map(quest => ({
      ...quest,
      completed: false,
      progress: 0
    }))
    
    console.log('✅ Today\'s Daily Quests:', quests.map(q => `${q.title} (${q.id})`))

    // Store with reset time (06:00 today)
    const resetTimeToday = new Date(now)
    resetTimeToday.setHours(6, 0, 0, 0)
    const questData = {
      quests,
      resetTime: resetTimeToday.getTime()
    }
    localStorage.setItem(`dailyQuests_${today}${userKey}`, JSON.stringify(questData))
    
    // Clean up old data (older than 2 days)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const oldKey = `dailyQuests_${twoDaysAgo.toDateString()}${userKey}`
    localStorage.removeItem(oldKey)
    localStorage.removeItem(`playedGames_${twoDaysAgo.toDateString()}${userKey}`)
    localStorage.removeItem(`perfectGames_${twoDaysAgo.toDateString()}${userKey}`)
    localStorage.removeItem(`dailyQuestsBonus_${twoDaysAgo.toDateString()}${userKey}`)
    
    return quests
  }


  // Update quest progress (synchronous version for instant feedback)
  const updateQuestProgressSync = async (gameType: string, score: number = 1, userId?: string, scenarioInfo?: { scenarioId: string, goalId: string, success: boolean, stars?: number }) => {
    const today = new Date().toDateString()
    const userKey = userId ? `_${userId}` : ''
    
    // Ensure we have quests loaded; fall back to localStorage or generation for instant feedback
    let quests: any[]
    if (dailyQuests.length > 0) {
      quests = [...dailyQuests]
    } else {
      const storedRaw = localStorage.getItem(`dailyQuests_${today}${userKey}`)
      if (storedRaw) {
        try {
          const parsed = JSON.parse(storedRaw)
          const storedQuests = parsed?.quests || parsed
          quests = Array.isArray(storedQuests) ? [...storedQuests] : []
        } catch {
          quests = []
        }
      } else {
        quests = [...generateDailyQuests(userId)]
      }
      // Make sure UI has something to render immediately
      if (quests.length > 0) {
        setDailyQuests(quests)
      }
    }
    let updated = false
    let progressChanged = false

    quests.forEach(async (quest) => {
      if (quest.completed) {
        return
      }

      const oldProgress = quest.progress
      switch (quest.id) {
        case 'play_3_games':
          quest.progress = Math.min(quest.progress + 1, quest.target)
          break
        case 'memory_2':
          if (gameType === 'match') {
            quest.progress = Math.min(quest.progress + 1, quest.target)
          }
          break
        case 'typing_1':
          if (gameType === 'typing') {
            quest.progress = Math.min(quest.progress + 1, quest.target)
          }
          break
        case 'choice_3_perfect':
          if (gameType === 'choice' && score === 100) { // Assuming 100 means perfect score
            console.log('Choice Master quest triggered:', { score, gameType, quest: quest.title })
            quest.progress = Math.min(quest.progress + 1, quest.target)
          }
          break
        case 'sentence_gap_perfect':
          if (gameType === 'story_gap' && score === 100) { // Now score is accuracy percentage
            quest.progress = quest.target
          }
          break
        case 'quiz_perfect':
          if (gameType === 'quiz' && score === 100) { // Assuming 100 means perfect score
            quest.progress = quest.target
          }
          break
        case 'typing_speed':
          // Trigger when typing game is completed with fast time (score <= 25 seconds)
          if (gameType === 'typing' && score <= 25) {
            quest.progress = quest.target
          }
          break
        case 'sentence_gap_2':
          if (gameType === 'story_gap') {
            quest.progress = Math.min(quest.progress + 1, quest.target)
          }
          break
        case 'sentence_gap_5':
          if (gameType === 'story_gap' && score === 100) { // Perfect score in sentence gap
            quest.progress = Math.min(quest.progress + 1, quest.target)
          }
          break
        case 'roulette_3':
        case 'roulette_5':
          if (gameType === 'roulette' && score === 100) { // Perfect score in roulette
            quest.progress = Math.min(quest.progress + 1, quest.target)
          }
          break
        case 'multi_game_4':
          // Track different game types played today
          const playedGamesKey = `playedGames_${today}${userKey}`
          const playedGames = JSON.parse(localStorage.getItem(playedGamesKey) || '[]')
          if (!playedGames.includes(gameType)) {
            playedGames.push(gameType)
            localStorage.setItem(playedGamesKey, JSON.stringify(playedGames))
            quest.progress = Math.min(playedGames.length, quest.target)
          }
          break
        case 'perfect_score':
        case 'perfect_score_1':
          console.log('Perfect Score quest check:', { score, gameType, questId: quest.id, progressBefore: quest.progress, target: quest.target })
          if (score === 100) { // Perfect score in any game
            const target = typeof quest.target === 'number' && Number.isFinite(quest.target) ? quest.target : 1
            const currentProgress = typeof quest.progress === 'number' && Number.isFinite(quest.progress) ? quest.progress : Number(quest.progress) || 0
            if (currentProgress < target) {
            console.log('Perfect Score quest triggered:', { score, gameType, quest: quest.title })
              quest.progress = target
            }
          }
          break
        case 'perfect_3':
          if (score === 100) { // Perfect score in any game
            // Track different game types that achieved perfect scores
            const perfectGamesKey = `perfectGames_${today}${userKey}`
            const perfectGames = JSON.parse(localStorage.getItem(perfectGamesKey) || '[]')
            
            if (!perfectGames.includes(gameType)) {
              perfectGames.push(gameType)
              localStorage.setItem(perfectGamesKey, JSON.stringify(perfectGames))
              quest.progress = Math.min(perfectGames.length, quest.target)
            }
          }
          break
        case 'roulette_perfect_5_words':
          // Perfect sentence with 5+ words in Word Roulette
          if (gameType === 'roulette') {
            // Read word count from localStorage (always check, not just when score === 100)
            const rouletteWordCountKey = `roulette_word_count_${today}${userKey}`
            const rouletteDataStr = localStorage.getItem(rouletteWordCountKey)
            console.log('📝 roulette_perfect_5_words check:', { 
              gameType, 
              score, 
              key: rouletteWordCountKey,
              data: rouletteDataStr 
            })
            
            if (rouletteDataStr) {
              try {
                const rouletteData = JSON.parse(rouletteDataStr)
                console.log('📝 roulette_perfect_5_words data:', rouletteData)
                
                if (rouletteData.isPerfect && rouletteData.wordCount >= 5) {
                  quest.progress = Math.min(quest.progress + 1, quest.target)
                  console.log('📝 roulette_perfect_5_words quest completed!', { wordCount: rouletteData.wordCount })
                } else {
                  console.log('📝 roulette_perfect_5_words not met:', { 
                    isPerfect: rouletteData.isPerfect, 
                    wordCount: rouletteData.wordCount,
                    target: 5 
                  })
                }
              } catch (e) {
                console.error('Error parsing roulette data:', e)
              }
            } else {
              console.log('📝 No roulette data found in localStorage')
            }
          }
          break
        case 'roulette_perfect_10_words':
          // Perfect sentence with 10+ words in Word Roulette
          if (gameType === 'roulette') {
            const rouletteWordCountKey = `roulette_word_count_${today}${userKey}`
            const rouletteDataStr = localStorage.getItem(rouletteWordCountKey)
            console.log('📖 roulette_perfect_10_words check:', { gameType, score, key: rouletteWordCountKey, data: rouletteDataStr })
            
            if (rouletteDataStr) {
              try {
                const rouletteData = JSON.parse(rouletteDataStr)
                console.log('📖 roulette_perfect_10_words data:', rouletteData)
                
                if (rouletteData.isPerfect && rouletteData.wordCount >= 10) {
                  quest.progress = Math.min(quest.progress + 1, quest.target)
                  console.log('📖 roulette_perfect_10_words quest completed!', { wordCount: rouletteData.wordCount })
                } else {
                  console.log('📖 roulette_perfect_10_words not met:', { isPerfect: rouletteData.isPerfect, wordCount: rouletteData.wordCount, target: 10 })
                }
              } catch (e) {
                console.error('Error parsing roulette data:', e)
              }
            } else {
              console.log('📖 No roulette data found in localStorage')
            }
          }
          break
        case 'roulette_perfect_20_words':
          // Perfect sentence with 20+ words in Word Roulette
          if (gameType === 'roulette') {
            const rouletteWordCountKey = `roulette_word_count_${today}${userKey}`
            const rouletteDataStr = localStorage.getItem(rouletteWordCountKey)
            console.log('📚 roulette_perfect_20_words check:', { gameType, score, key: rouletteWordCountKey, data: rouletteDataStr })
            
            if (rouletteDataStr) {
              try {
                const rouletteData = JSON.parse(rouletteDataStr)
                console.log('📚 roulette_perfect_20_words data:', rouletteData)
                
                if (rouletteData.isPerfect && rouletteData.wordCount >= 20) {
                  quest.progress = Math.min(quest.progress + 1, quest.target)
                  console.log('📚 roulette_perfect_20_words quest completed!', { wordCount: rouletteData.wordCount })
                } else {
                  console.log('📚 roulette_perfect_20_words not met:', { isPerfect: rouletteData.isPerfect, wordCount: rouletteData.wordCount, target: 20 })
                }
              } catch (e) {
                console.error('Error parsing roulette data:', e)
              }
            } else {
              console.log('📚 No roulette data found in localStorage')
            }
          }
          break
        case 'marathon_10':
          quest.progress = Math.min(quest.progress + 1, quest.target)
          break
        case 'scenario_breakfast_2_stars':
          if (scenarioInfo && scenarioInfo.scenarioId === 'home' && scenarioInfo.goalId === 'breakfast' && scenarioInfo.success && scenarioInfo.stars !== undefined && scenarioInfo.stars >= 2) {
            quest.progress = quest.target
          }
          break
        case 'scenario_breakfast_3_stars':
          if (scenarioInfo && scenarioInfo.scenarioId === 'home' && scenarioInfo.goalId === 'breakfast' && scenarioInfo.success && scenarioInfo.stars !== undefined && scenarioInfo.stars >= 3) {
            quest.progress = quest.target
          }
          break
      }

      if (quest.progress >= quest.target && !quest.completed) {
        quest.completed = true
        updated = true
        console.log(`🎯 QUEST COMPLETED: ${quest.title} (${quest.id}) - Progress: ${quest.progress}/${quest.target}`)
        
        // INSTANT UI UPDATE: Award XP immediately for instant feedback
        setPoints(prev => {
          const newTotal = prev + quest.xp
          console.log(`Quest completed: ${quest.title}, XP awarded: ${quest.xp}, Total: ${prev} → ${newTotal}`)
          
          // Save to localStorage immediately to prevent data loss on page navigation
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              const userSpecificKey = `studentTotalXP_${user.id}`
              localStorage.setItem(userSpecificKey, newTotal.toString())
              console.log(`💾 Saved XP to localStorage after quest completion: ${newTotal}`)
            }
          }).catch(() => {
            // Fallback if error
            localStorage.setItem('studentTotalXP', newTotal.toString())
          })
          
          return newTotal
        })
        
        // INSTANT UI UPDATE: Award badge immediately for instant animation
        // Only award badge if quest exists in dailyQuests (is an active daily quest)
        const questExists = dailyQuests.some(q => q.id === quest.id)
        if (!questExists) {
          console.log(`⚠️ Quest ${quest.id} (${quest.title}) not found in dailyQuests, skipping badge award`)
          return
        }
        
        console.log(`🎯 Calling awardBadgeForQuest for quest ID: ${quest.id} (${quest.title})`)
        
        // Award badge immediately for instant feedback
        try {
          const badgeAwarded = await awardBadgeForQuest(quest.id)
          if (badgeAwarded) {
            console.log(`🏆 Badge awarded instantly for quest: ${quest.title}`)
          } else {
            console.log(`❌ No badge awarded for quest: ${quest.title}`)
          }
        } catch (error) {
          console.error('Error awarding badge:', error)
        }
        
        // Enqueue quest completion for robust sync (survives tab close/logout)
        // This uses atomic RPC function complete_quest_and_award_xp which prevents race conditions
        enqueueQuestComplete(quest.id, quest.xp)
        
        // Trigger immediate flush of quest outbox to sync XP to database quickly
        // This ensures XP is saved atomically via quest-sync API before user logs out
        void import('@/lib/questOutbox').then(({ questOutbox }) => {
          return questOutbox.flushOutbox()
        }).then(() => {
          // After sync completes, refresh points from database to ensure accuracy
          // Use longer timeout to ensure database has updated (localStorage is already saved above)
          setTimeout(async () => {
            const total = await loadStudentProgress()
            // Use updatePointsSafely to ensure localStorage is synced
            updatePointsSafely(total, 'quest-sync-complete')
          }, 1500)
        })
      }
      
      if (oldProgress !== quest.progress) {
        progressChanged = true
        // Enqueue progress update for robust sync
        const progressDelta = quest.progress - oldProgress
        if (progressDelta > 0) {
          enqueueQuestProgress(quest.id, progressDelta)
        }
      }
    })

    // Award scenario badges when scenario is completed with correct stars
    // But only if corresponding daily quest is active and just completed for the first time
    if (scenarioInfo && scenarioInfo.scenarioId === 'home' && scenarioInfo.goalId === 'breakfast' && scenarioInfo.success && scenarioInfo.stars) {
      await checkScenarioBadges(scenarioInfo.stars)
    }

    if (updated || progressChanged) {
      setDailyQuests(quests)
      
      // Save with the new format (quests + resetTime)
      // resetTime should be 06:00 today, not current time
      const resetTimeToday = new Date()
      resetTimeToday.setHours(6, 0, 0, 0)
      const questData = {
        quests,
        resetTime: resetTimeToday.getTime()
      }
      
      console.log('Saving quests to localStorage:', {
        today,
        updated,
        progressChanged,
        questCount: quests.length,
        quests: quests.map((q: any) => ({ id: q.id, title: q.title, progress: q.progress, completed: q.completed })),
        completedQuests: quests.filter((q: any) => q.completed).map((q: any) => q.id)
      })
      
      localStorage.setItem(`dailyQuests_${today}${userKey}`, JSON.stringify(questData))
      // REMOVED: saveDailyQuestsToDB(quests) - This causes double-counting
      // The enqueueQuestProgress() call above already handles DB sync via quest-sync API
      // saveDailyQuestsToDB should only be used as a fallback when quest-sync API is unavailable
      
      // Check if all quests are completed for bonus (only for new completions)
      if (updated) {
        checkAllQuestsCompleted(quests, userId, true)
      }
    }
    // Background sync: refresh points after a short delay, but never reduce UI value
    window.setTimeout(() => {
      void (async () => {
        const total = await loadStudentProgress()
        // Use updatePointsSafely to ensure localStorage is synced
        updatePointsSafely(total, 'quest-progress-sync')
      })()
    }, 1500)
  }

  const checkAllQuestsCompleted = (quests: any[], userId?: string, isNewCompletion: boolean = false) => {
    const allCompleted = quests.every(quest => quest.completed)
    const today = new Date().toDateString()
    const userKey = userId ? `_${userId}` : ''
    const bonusKey = `dailyQuestsBonus_${today}${userKey}`
    
    // Only trigger bonus if this is a new completion (not loading from DB)
    if (allCompleted && !localStorage.getItem(bonusKey) && isNewCompletion) {
      // Award 100 XP bonus for completing all daily quests
      setPoints(prev => {
        const newTotal = prev + 100
        console.log(`All quests completed bonus: +100 XP, Total: ${prev} → ${newTotal}`)
        
        // Save to localStorage immediately to prevent data loss on page navigation
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            const userSpecificKey = `studentTotalXP_${user.id}`
            localStorage.setItem(userSpecificKey, newTotal.toString())
            console.log(`💾 Saved XP to localStorage after all quests bonus: ${newTotal}`)
          }
        }).catch(() => {
          // Fallback if error
          localStorage.setItem('studentTotalXP', newTotal.toString())
        })
        
        return newTotal
      })
      localStorage.setItem(bonusKey, 'true')
      // Enqueue bonus quest completion for robust sync
      // This uses atomic RPC function complete_quest_and_award_xp which prevents race conditions
      enqueueQuestComplete('all_quests_bonus', 100)
      
      // Trigger immediate flush of quest outbox to sync XP to database quickly
      // This ensures XP is saved atomically via quest-sync API before user logs out
      void import('@/lib/questOutbox').then(({ questOutbox }) => {
        return questOutbox.flushOutbox()
      }).then(() => {
        // After sync completes, refresh points from database to ensure accuracy
        // Use longer timeout to ensure database has updated (localStorage is already saved above)
        setTimeout(async () => {
          const total = await loadStudentProgress()
          setPoints(prev => Math.max(prev, total))
        }, 1500)
      })
      
      // Show bonus notification
      setShowBonusNotification(true)
      setTimeout(() => setShowBonusNotification(false), 5000) // Hide after 5 seconds
    } else if (allCompleted && localStorage.getItem(bonusKey)) {
      console.log('All quests completed, bonus already awarded today')
    }
  }

  // Check and award scenario badges when scenario is completed
  // Badges are only awarded if corresponding daily quest is active and just completed for the first time
  const checkScenarioBadges = async (stars: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Map stars to quest IDs
      const questIdMap: { [stars: number]: string } = {
        2: 'scenario_breakfast_2_stars',
        3: 'scenario_breakfast_3_stars'
      }

      const questId = questIdMap[stars]
      if (!questId) return

      // Check if this quest exists in active dailyQuests
      const quest = dailyQuests.find(q => q.id === questId)
      if (!quest) {
        console.log(`⚠️ Scenario quest ${questId} not found in active dailyQuests, skipping badge award`)
        return
      }

      // Check if quest was just completed (not already completed)
      if (!quest.completed) {
        console.log(`⚠️ Scenario quest ${questId} not completed yet, skipping badge award`)
        return
      }

      // Check if quest was just completed for the first time (progress just reached target)
      // This is handled by the quest completion logic above, so we can award the badge
      console.log(`🎯 Awarding scenario badge for quest: ${questId} (${quest.title})`)
      
      try {
        const badgeAwarded = await awardBadgeForQuest(questId)
        if (badgeAwarded) {
          console.log(`🏆 Scenario badge awarded for quest: ${quest.title}`)
        } else {
          console.log(`❌ No scenario badge awarded for quest: ${quest.title} (probably already earned)`)
        }
      } catch (error) {
        console.error('Error awarding scenario badge:', error)
      }
    } catch (error) {
      console.error('Error checking scenario badges:', error)
    }
  }

  // --- Daily quests persistence in Supabase (per user, per day) ---
  const getQuestDateString = () => {
    const d = new Date()
    // Normalize to local date (midnight) and format YYYY-MM-DD
    d.setHours(0, 0, 0, 0)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const syncDailyQuestsFromDB = async (localQuests: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return localQuests
      const questDate = getQuestDateString()
      const { data, error } = await supabase
        .from('daily_quest_progress')
        .select('quest_id, progress, completed_at, xp_awarded')
        .eq('user_id', user.id)
        .eq('quest_date', questDate)

      if (error) {
        console.error('Error loading daily quest progress from DB:', error)
        return localQuests
      }

      if (!data || data.length === 0) return localQuests

      const byId: Record<string, { progress: number; completed: boolean }> = {}
      for (const row of data) {
        byId[row.quest_id] = { 
          progress: row.progress, 
          completed: row.completed_at !== null 
        }
      }

      // Use the latest in-memory quests as baseline if present to avoid downgrades
      const baseline = (dailyQuests && dailyQuests.length > 0) ? dailyQuests : localQuests

      const merged = baseline.map((q: any) => {
        const db = byId[q.id]
        if (!db) return q
        
        // Use database as source of truth to prevent double-counting
        // Database has the authoritative progress from quest-sync system
        const normalizeProgress = (value: unknown) => {
          const num = Number(value)
          return Number.isFinite(num) ? num : 0
        }

        const target = normalizeProgress(q.target ?? 1) || 1
        const dbProgress = normalizeProgress(db.progress)
        const localProgress = normalizeProgress(q.progress)

        // Never downgrade progress: keep the highest value we've seen locally or from DB
        const mergedProgress = Math.min(Math.max(localProgress, dbProgress), target)
        
        // Quest is completed if marked as completed in DB or progress >= target
        const mergedCompleted = Boolean(db.completed) || mergedProgress >= target
        
        return {
          ...q,
          progress: mergedProgress,
          completed: mergedCompleted,
        }
      })

      // Persist merged to localStorage for faster subsequent loads
      const today = new Date().toDateString()
      const resetTimeToday = new Date()
      resetTimeToday.setHours(6, 0, 0, 0)
      const questData = { quests: merged, resetTime: resetTimeToday.getTime() }
      // Use user-specific key to prevent cross-user data leakage
      const userKey = user?.id ? `_${user.id}` : ''
      localStorage.setItem(`dailyQuests_${today}${userKey}`, JSON.stringify(questData))

      return merged
    } catch (e) {
      console.error('Unexpected error syncing daily quests from DB:', e)
      return localQuests
    }
  }

  const saveDailyQuestsToDB = async (questsToSave: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const questDate = getQuestDateString()
      
      // Try to save using the new daily_quest_progress table first
      try {
        for (const quest of questsToSave) {
          const { error } = await supabase
            .from('daily_quest_progress')
            .upsert({
              user_id: user.id,
              quest_date: questDate,
              quest_id: quest.id,
              progress: quest.progress ?? 0,
              completed_at: quest.completed ? new Date().toISOString() : null,
              xp_awarded: quest.completed,
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            console.warn(`Warning: Could not save quest ${quest.id} progress to daily_quest_progress:`, error.message)
            throw error // Fall through to backup method
          } else {
            console.log(`Successfully saved quest ${quest.id} progress:`, quest.progress)
          }
        }
      } catch (tableError) {
        console.log('daily_quest_progress table not available, using localStorage backup')
        
        // Fallback: save to localStorage with user-specific key
        const userKey = user.id
        const storageKey = `dailyQuests_${questDate}_${userKey}`
        localStorage.setItem(storageKey, JSON.stringify(questsToSave))
        console.log('Daily quests saved to localStorage as backup')
      }
    } catch (e) {
      console.error('Unexpected error saving daily quests to DB:', e)
    }
  }

  // Sign out handler
  const handleSignOut = async () => {
    if (isLoggingOut) return
    
    try {
      setIsLoggingOut(true)
      console.log('Sign out button clicked')
      
      // Final sync before logout
      console.log('Final sync before logout...')
      try {
        await Promise.race([
          syncManager.cleanup(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ])
        console.log('Sync completed successfully')
      } catch (error) {
        console.error('Error syncing before logout:', error)
      }
      
      // Mark as logged out
      markUserAsLoggedOut().catch(err => console.log('Failed to mark as logged out:', err))
      
      // Save persistent logs before clearing
      const persistentLogs = localStorage.getItem('persistentLogs')
      
      localStorage.clear()
      sessionStorage.clear()
      
      // Restore persistent logs
      if (persistentLogs) {
        localStorage.setItem('persistentLogs', persistentLogs)
      }
      
      // Set timeout for force redirect
      const forceRedirect = setTimeout(() => {
        window.location.replace('/')
      }, 1500)
      
      // Try Supabase logout
      try {
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 1000)
        )
        await Promise.race([signOutPromise, timeoutPromise])
      } catch (error) {
        console.log('Supabase signOut failed or timed out:', error)
      }
      
      clearTimeout(forceRedirect)
      window.location.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
      window.location.replace('/')
    }
  }


  // Helper function to get current game data (homework only)
  const getCurrentGameData = () => {
    if (selectedHomework) {
      return {
        words: selectedHomework.vocabulary_words,
        wordObjects: selectedHomework.words,
        translations: selectedHomework.translations || {},
        color: selectedHomework.color,
        title: selectedHomework.title,
        grid_config: (selectedHomework as any).grid_config || undefined
      }
    }
    return null
  }

  useEffect(() => {
    const lvl = levelForXp(points).level
    setCurrentLevel(lvl)
  }, [points])

  // Update quests when they change
  useEffect(() => {
    console.log('Daily quests updated:', dailyQuests)
  }, [dailyQuests])

  useEffect(() => {
    (async () => {
      // Get user ID for localStorage key first
      const { data: { user } } = await supabase.auth.getUser()
      
      // Clear any cross-user data on login to prevent data leakage
      if (user) {
        const today = new Date().toDateString()
        const userKey = `_${user.id}`
        const otherUserKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('dailyQuests_') && !key.includes(userKey) && key.includes('_')
        )
        otherUserKeys.forEach(key => {
          console.log('Clearing cross-user quest data:', key)
          localStorage.removeItem(key)
        })
      }
      
      await loadStudentData()
      
      // Handle scenario URL parameter after data is loaded
      const scenarioParam = searchParams?.get('scenario')
      if (scenarioParam) {
        setInitialScenarioEnvironment(scenarioParam)
        setShowScenarioGame(true)
      }
      
      // Initialize quest outbox for robust synchronization
      const { questOutbox } = await import('@/lib/questOutbox')
      await questOutbox.initialize()
      console.log('Quest outbox initialized for robust sync')
      
      // Flush any pending events from previous sessions (only if there are events)
      const pendingEvents = await questOutbox.getPendingEvents()
      if (pendingEvents.length > 0) {
        // Add a small delay to allow immediate sync to complete first
        setTimeout(async () => {
          await questOutbox.flushOutbox()
          console.log(`Quest outbox flushed ${pendingEvents.length} pending events on login (delayed)`)
        }, 2000)
        console.log(`Found ${pendingEvents.length} pending quest events, will flush in 2 seconds`)
      } else {
        console.log('No pending quest events to flush on login')
      }
      
      // Load daily quests (local) immediately for instant UI, then merge from DB for cross-device persistence
      const localQuests = generateDailyQuests(user?.id)
      setDailyQuests(localQuests)
      const merged = await syncDailyQuestsFromDB(localQuests)
      setDailyQuests(merged)
      // Check if all quests are already completed for bonus (loading from DB, don't trigger bonus)
      checkAllQuestsCompleted(merged, user?.id, false)
    })()
  }, [])

  // Refresh class info on window focus (handles returning from Join Class page)
  useEffect(() => {
    const onFocus = () => { void loadClassInfo() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Subscribe to realtime changes to class membership for this student
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !(supabase as any).channel) return
        const channel = (supabase as any).channel(`class_students_${user.id}`)
        channel
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'class_students',
            filter: `student_id=eq.${user.id}`
          }, () => { void loadClassInfo() })
          .subscribe()
        return () => { try { (supabase as any).removeChannel?.(channel) } catch {} }
      } catch {}
    })()
  }, [])

  // Enable dev mode via query string (?dev=1)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setDevMode(params.get('dev') === '1')
      
      // Auto-start game from URL parameters
      const gameType = params.get('game')
      const homeworkId = params.get('homework')
      const showHomeworkSelection = params.get('showHomeworkSelection') === 'true'
      
      if (gameType) {
        if (showHomeworkSelection) {
          // Show homework selection modal for this game
          setPendingGame(gameType as any)
          setShowHomeworkSelection(true)
          // Clean up URL
          window.history.replaceState({}, '', '/student')
        } else if (homeworkId) {
          // For flashcards, always start directly (color grid selection will handle word set selection)
          if (gameType === 'flashcards') {
            // Find homework or use first available
            const homework = homeworks.find(h => h.id === homeworkId) || oldWordSets.find(h => h.id === homeworkId) || homeworks[0] || oldWordSets[0]
            if (homework) {
              setSelectedHomework(homework)
              setTimeout(() => {
                setShowFlashcardGame(true)
                // Clean up URL
                window.history.replaceState({}, '', '/student')
              }, 100)
            }
          } else if (homeworks.length > 0) {
            // For other games, require homework to be loaded
            const homework = homeworks.find(h => h.id === homeworkId) || oldWordSets.find(h => h.id === homeworkId)
            if (homework) {
              setSelectedHomework(homework)
              // Start the appropriate game
              setTimeout(() => {
                switch (gameType) {
                  case 'match':
                    setShowWordMatchingGame(true)
                    break
                  case 'typing':
                    setShowTypingChallenge(true)
                    break
                  case 'translate':
                    setShowTranslateGame(true)
                    break
                  case 'connect':
                    setShowLineMatchingGame(true)
                    break
                  case 'storygap':
                    setShowStoryGap(true)
                    break
                  case 'choice':
                    setShowChoice(true)
                    break
                  case 'roulette':
                    setShowRoulette(true)
                    break
                }
                // Clean up URL
                window.history.replaceState({}, '', '/student')
              }, 100)
            }
          }
        }
      }
    } catch {}
  }, [homeworks, oldWordSets])

  // Debug: Log when homeworks state changes
  useEffect(() => {
    console.log('homeworks state changed to:', homeworks.length, 'items')
  }, [homeworks])

  useEffect(() => {
    // OPTIMIZATION: Don't auto-load leaderboards on dashboard
    // Leaderboards are now only loaded when user visits /student/leaderboard page
    // This reduces API calls and prevents rate limiting issues
    if (classInfo?.id) {
      // Load teacher info when class info is available
      void loadTeacherInfo(classInfo.id)
      // Clear leaderboard data - user must visit leaderboard page to see it
      setLeaderboardData(null)
    } else {
      setLeaderboardData(null)
    }

  }, [classInfo?.id])

  // Listen to animation queue for badge popups
  useEffect(() => {
    if (currentAnimation && currentAnimation.type === 'badge') {
      console.log('🎬 Animation queue triggered badge popup:', currentAnimation.data)
      setNewBadge(currentAnimation.data)
    }
  }, [currentAnimation, setNewBadge])

  const leaderboardPlayers = useMemo<EnrichedLeaderboardPlayer[]>(() => {
    if (!leaderboardData?.players) return []
    return leaderboardData.players
      .filter(player => {
        // Only show players who have played at least one session
        const sessionCount = player.sessionCount || 0
        return sessionCount > 0
      })
      .map(player => {
        const totalPoints = player.totalPoints || 0
        const levelInfo = levelForXp(totalPoints)
        const wizard = titleForLevel(levelInfo.level)
        const displayName = player.displayName || player.username || player.name || 'Student'
        return {
          ...player,
          displayName,
          totalPoints,
          level: levelInfo.level,
          wizardImage: wizard?.image || '/assets/wizard/wizard_novice.png',
          badgeCount: player.badgeCount || 0,
          longestStreak: player.longestStreak || 0,
          bestKpm: player.bestKpm || 0,
          averageAccuracy: player.averageAccuracy || 0,
          sessionCount: player.sessionCount || 0
        }
      })
  }, [leaderboardData])

  // Handle badge notification dismissal
  const handleBadgeDismiss = () => {
    setNewBadge(null)
    dismiss()
  }

  const loadTeacherInfo = async (classId: string) => {
    try {
      console.log('Loading teacher info for class:', classId)
      
      // First, try to get teacher_id from class_students join (most reliable for students)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found for teacher info')
        return
      }
      
      // Try approach 1: Get teacher info through class_students -> classes -> profiles
      const { data: studentClassData, error: studentClassError } = await supabase
        .from('class_students')
        .select(`
          classes!inner(
            teacher_id,
            profiles:teacher_id(
              displayName,
              username,
              email
            )
          )
        `)
        .eq('student_id', user.id)
        .eq('class_id', classId)
        .maybeSingle()
      
      console.log('Teacher info query result:', { studentClassData, studentClassError })
      
      if (!studentClassError && studentClassData) {
        const data = studentClassData as any
        if (data.classes) {
          const classes = data.classes
          // Check if profiles is an array or object
          let profile = null
          if (Array.isArray(classes.profiles) && classes.profiles.length > 0) {
            profile = classes.profiles[0]
          } else if (classes.profiles && typeof classes.profiles === 'object') {
            profile = classes.profiles
          }
          
          if (profile) {
            const teacherName = profile.displayName || profile.username || profile.email?.split('@')[0] || 'Teacher'
            console.log('Found teacher name:', teacherName)
            setTeacherInfo({ name: teacherName })
            return
          }
        }
      }
      
      // Fallback: Try to get teacher_id directly and then fetch profile
      if (studentClassData && (studentClassData as any).classes?.teacher_id) {
        const teacherId = (studentClassData as any).classes.teacher_id
        console.log('Trying to fetch teacher profile directly for teacher_id:', teacherId)
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('displayName, username, email')
          .eq('id', teacherId)
          .maybeSingle()
        
        console.log('Direct profile query result:', { profileData, profileError })
        
        if (!profileError && profileData) {
          const teacherName = profileData.displayName || profileData.username || profileData.email?.split('@')[0] || 'Teacher'
          console.log('Found teacher name from direct query:', teacherName)
          setTeacherInfo({ name: teacherName })
          return
        }
      }
      
      console.log('Could not load teacher info')
    } catch (error) {
      console.error('Error loading teacher info:', error)
    }
  }

  const loadClassInfo = async () => {
    try {
      console.log('Debug - loadClassInfo started')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Debug - No user found in loadClassInfo')
        return
      }
      
      console.log('Debug - User ID for class lookup:', user.id)

      // First, let's see what's in the class_students table for this user
      const { data: allClassStudents, error: allError } = await supabase
        .from('class_students')
        .select('*')
        .eq('student_id', user.id)

      console.log('Debug - All class_students records for user:', allClassStudents)
      console.log('Debug - All class_students error:', allError)

      if (allError) {
        console.log('Debug - Error loading all class_students:', allError)
        setClassInfo(null)
        return
      }

      if (!allClassStudents || allClassStudents.length === 0) {
        console.log('Debug - No class_students records found for user')
        setClassInfo(null)
        return
      }

      // Get the first class record
      const firstClassRecord = allClassStudents[0]
      console.log('Debug - First class record:', firstClassRecord)

      // Try to get the real class name using a simpler approach
      // We'll try to read from the classes table with a different method
      
      if (firstClassRecord.class_id) {
        console.log('Debug - Attempting to get real class name for:', firstClassRecord.class_id)
        
        // Try approach 1: Simple direct query to classes table
        try {
          console.log('Debug - Attempting direct query to classes table...')
          
          // Try to read the actual class name from the classes table
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('name')
            .eq('id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!classError && classData && classData.name) {
            console.log('Debug - SUCCESS! Got real class name from classes table:', classData.name)
            setClassInfo({
              id: firstClassRecord.class_id,
              name: classData.name  // This should be "6A", "6B", "6C" etc.
            })
            // Load teacher info
            void loadTeacherInfo(firstClassRecord.class_id)
            return
          } else {
            console.log('Debug - Direct query failed or no data:', classError, classData)
            
            // If direct query fails, let's try to see what the actual error is
            if (classError) {
              console.log('Debug - RLS Error details:', classError.message, classError.code)
            }
          }
        } catch (e) {
          console.log('Debug - Direct query approach failed:', e)
        }
        
        // Try approach 2: Use a join query to get class name from class_students
        try {
          console.log('Debug - Attempting join query approach...')
          
          // Try to get class name through a join query
          // This might work better with RLS policies than direct access
          const { data: joinData, error: joinError } = await supabase
            .from('class_students')
            .select(`
              class_id,
              classes!inner (
                id,
                name
              )
            `)
            .eq('student_id', user.id)
            .eq('class_id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!joinError && joinData && joinData.classes) {
            const classInfo = joinData.classes as any
            console.log('Debug - SUCCESS! Got class name from join query:', classInfo.name)
            setClassInfo({
              id: firstClassRecord.class_id,
              name: classInfo.name  // This should be "6A", "6B", "6C" etc.
            })
            // Load teacher info
            void loadTeacherInfo(firstClassRecord.class_id)
            return
          } else {
            console.log('Debug - Join query failed or no data:', joinError, joinData)
            
            // If join query fails, let's try a different approach
            if (joinError) {
              console.log('Debug - Join query error details:', joinError.message, joinError.code)
            }
          }
        } catch (e) {
          console.log('Debug - Join query approach failed:', e)
        }
        
        // Try approach 2b: Use a different join syntax
        try {
          console.log('Debug - Attempting alternative join syntax...')
          
          // Try a different join approach that might work better
          const { data: altJoinData, error: altJoinError } = await supabase
            .from('class_students')
            .select(`
              class_id,
              classes (
                id,
                name
              )
            `)
            .eq('student_id', user.id)
            .eq('class_id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!altJoinError && altJoinData && altJoinData.classes) {
            const classInfo = altJoinData.classes as any
            console.log('Debug - SUCCESS! Got class name from alternative join:', classInfo.name)
            setClassInfo({
              id: firstClassRecord.class_id,
              name: classInfo.name  // This should be "6A", "6B", "6C" etc.
            })
            // Load teacher info
            void loadTeacherInfo(firstClassRecord.class_id)
            return
          } else {
            console.log('Debug - Alternative join failed or no data:', altJoinError, altJoinData)
          }
        } catch (e) {
          console.log('Debug - Alternative join approach failed:', e)
        }
        
        // Try approach 3: Try to get class name through a different table or method
        try {
          console.log('Debug - Attempting alternative table approach...')
          
          // Since we can't access the classes table directly due to RLS,
          // let's try to find the class name through other means
          
          // Let's check if we can get any information from the class_students table
          const { data: classStudentInfo, error: classStudentError } = await supabase
            .from('class_students')
            .select('*')
            .eq('student_id', user.id)
            .eq('class_id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!classStudentError && classStudentInfo) {
            console.log('Debug - Found class_student record:', classStudentInfo)
            
            // Maybe we can find the class name in other accessible data
            // For now, let's create a temporary name that's at least consistent
            const classId = firstClassRecord.class_id
            
            // IMPORTANT: This is just a fallback - we really need the real class name!
            // The real class name should be "6A", "6B", "6C" etc. from the classes table
            let className = 'Class'
            
            // Extract the first number for a simple name
            const numbers = classId.match(/\d+/g)
            if (numbers && numbers.length > 0) {
              className = `Class ${numbers[0]}`
            } else {
              className = `Class ${classId.slice(0, 4)}`
            }
            
            console.log('Debug - Found class_student record, but continuing to RPC approach...')
            // Don't return here - let's continue to try the RPC function approach
            
          } else {
            console.log('Debug - No class_student info found:', classStudentError)
          }
          
        } catch (e) {
          console.log('Debug - Alternative table approach failed:', e)
        }
        
        // SOLUTION: Create a simple RPC function call
        try {
          console.log('Debug - Attempting RPC function solution...')
          
          // This is the REAL solution - we need an RPC function that bypasses RLS
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('get_student_class_name', { 
              student_id: user.id,
              class_id: firstClassRecord.class_id 
            })
          
          if (!rpcError && rpcResult) {
            console.log('Debug - RPC function returned data:', rpcResult)
            
            // RPC function returns an array, so we need to handle that
            let className = null
            if (Array.isArray(rpcResult) && rpcResult.length > 0) {
              className = rpcResult[0].class_name
            } else if (rpcResult && typeof rpcResult === 'object' && rpcResult.class_name) {
              className = rpcResult.class_name
            }
            
            if (className) {
              console.log('Debug - SUCCESS! Got real class name from RPC:', className)
              setClassInfo({
                id: firstClassRecord.class_id,
                name: className  // This should be "6A", "6B", "6C" etc.
              })
              // Load teacher info
              void loadTeacherInfo(firstClassRecord.class_id)
              return
            } else {
              console.log('Debug - RPC function returned data but no class_name found:', rpcResult)
            }
          } else {
            console.log('Debug - RPC function failed:', rpcError, rpcResult)
          }
        } catch (e) {
          console.log('Debug - RPC function approach failed:', e)
        }
        
        // REMOVED: Duplicated code that was causing the issue
        
        // FINAL FALLBACK: Show a clear message about what's needed
        console.log('Debug - FINAL FALLBACK: Cannot get real class name due to RLS policies')
        console.log('Debug - SOLUTION: Create RPC function in Supabase to bypass RLS')
        console.log('Debug - Expected result: Student should see "6A", "6B", "6C" etc.')
        
        const classId = firstClassRecord.class_id
        
        // For now, show a placeholder that makes it clear this is not the real name
        const className = 'Class Name Unavailable'
        
        console.log('Debug - Using placeholder class name:', className)
        console.log('Debug - This indicates the RPC function needs to be created')
        
        setClassInfo({
          id: classId,
          name: className
        })
        // Load teacher info
        void loadTeacherInfo(classId)
      } else {
        console.log('Debug - No class_id available')
        setClassInfo(null)
      }
    } catch (error) {
      console.error('Error loading class info:', error)
      setClassInfo(null)
    }
  }

  const loadStudentData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      }
      
      // Load assigned word sets
      await fetchHomeworks()
      console.log('After fetchHomeworks, homeworks.length:', homeworks.length)
      
      // Load permanent progress data
      const total = await loadStudentProgress()
      // Ensure UI reads the same total immediately (updatePointsSafely already called in loadStudentProgress)
      // But call it again here to ensure state is updated
      updatePointsSafely(total, 'load-student-data')
      
      // Load class information
      await loadClassInfo()
      
      // Load active sessions
      await loadActiveSessions()
      
    } catch (error) {
      console.error('Error loading student data:', error)
      setMessage('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadActiveSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get student's classes
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', user.id)

      if (!classStudents || classStudents.length === 0) {
        setActiveSessions([])
        return
      }

      const classIds = classStudents.map(cs => cs.class_id)

      // Get active sessions linked to these classes
      // First, get session IDs from session_classes
      const { data: sessionClassLinks, error: linkError } = await supabase
        .from('session_classes')
        .select('session_id')
        .in('class_id', classIds)

      if (linkError) {
        console.error('Error loading session-class links:', linkError)
        setActiveSessions([])
        return
      }

      if (!sessionClassLinks || sessionClassLinks.length === 0) {
        setActiveSessions([])
        return
      }

      const sessionIds = [...new Set(sessionClassLinks.map(sc => sc.session_id))]

      // Then, get the sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          session_name,
          due_date,
          enabled_games,
          is_active,
          word_set_id
        `)
        .in('id', sessionIds)
        .eq('is_active', true)
        .gte('due_date', new Date().toISOString())

      if (sessionError) {
        console.error('Error loading sessions:', sessionError)
        setActiveSessions([])
        return
      }

      if (!sessions || sessions.length === 0) {
        setActiveSessions([])
        return
      }

      // Fetch word set titles separately
      const wordSetIds = [...new Set(sessions.map((s: any) => s.word_set_id).filter(Boolean))]
      const wordSetTitles: Record<string, string> = {}
      
      if (wordSetIds.length > 0) {
        const { data: wordSets } = await supabase
          .from('word_sets')
          .select('id, title')
          .in('id', wordSetIds)

        if (wordSets) {
          wordSets.forEach((ws: any) => {
            wordSetTitles[ws.id] = ws.title
          })
        }
      }

      // Transform sessions data
      const activeSessionList = sessions.map((session: any) => ({
        id: session.id,
        session_code: session.session_code,
        session_name: session.session_name,
        due_date: session.due_date,
        enabled_games: session.enabled_games || [],
        word_set_title: session.word_set_id ? (wordSetTitles[session.word_set_id] || 'Session') : 'Session'
      })) as Array<{
        id: string
        session_code: string
        session_name: string | null
        due_date: string
        enabled_games: string[]
        word_set_title: string
      }>

      setActiveSessions(activeSessionList)
    } catch (error) {
      console.error('Error loading active sessions:', error)
    }
  }

  const loadClassLeaderboards = async (classId: string) => {
    try {
      setLeaderboardLoading(true)
      setLeaderboardError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLeaderboardError('You are not logged in')
        setLeaderboardData(null)
        return
      }

      const response = await fetch('/api/student/leaderboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ classId })
      })

      const data: ClassLeaderboardResponse & { error?: string } = await response.json()

      if (!response.ok) {
        setLeaderboardError(data.error || 'Could not load leaderboards')
        setLeaderboardData(null)
        return
      }

      setLeaderboardData(data)
    } catch (error) {
      console.error('Error loading class leaderboards:', error)
      setLeaderboardError('Could not load leaderboards')
      setLeaderboardData(null)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  const loadStudentProgress = async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      console.log('Debug - Loading progress for user:', user.id)

      // CRITICAL FIX: Use user-specific localStorage key to prevent data leakage between students with same username
      const userSpecificKey = `studentTotalXP_${user.id}`
      const legacyKey = 'studentTotalXP' // For backward compatibility
      
      // Load both user-specific and legacy localStorage data (for migration)
      const localPoints = localStorage.getItem(userSpecificKey) || localStorage.getItem(legacyKey)
      const localXP = localPoints ? parseInt(localPoints, 10) : 0

      // Load from database (global progress record)
      console.log('Debug - Loading from database')
      const { data: globalProgress, error: globalError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', user.id)
        .is('word_set_id', null)
        .is('homework_id', null)
        .limit(1)
        .maybeSingle()

      if (globalError) {
        console.log('Debug - Error loading global progress:', globalError)
      }

      console.log('Debug - Global progress record:', globalProgress)
      console.log('Debug - localStorage XP:', localXP)

      const dbXP = globalProgress?.total_points || 0

      // CRITICAL FIX: Use the HIGHEST value between localStorage and database to prevent XP loss
      // This handles cases where XP was added but not yet synced to database
      const finalXP = Math.max(localXP, dbXP)
      console.log('Debug - Final XP (max of localStorage and database):', finalXP, { localXP, dbXP })

      // Always update localStorage and state with the highest value
      localStorage.setItem(userSpecificKey, finalXP.toString())
      updatePointsSafely(finalXP, 'load-student-progress')

      // If localStorage was higher, sync to database in background (to prevent XP loss)
      if (localXP > dbXP && localXP > 0) {
        console.log('Debug - localStorage XP is higher, syncing to database in background')
        // Sync in background without waiting (non-blocking)
        void syncLocalXPToDatabase(localXP, user.id)
      }

      return finalXP
    } catch (error) {
      console.error('Error loading student progress:', error)
      // Try to load from localStorage as fallback
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userSpecificKey = `studentTotalXP_${user.id}`
        const legacyKey = 'studentTotalXP'
        const localPoints = localStorage.getItem(userSpecificKey) || localStorage.getItem(legacyKey)
        if (localPoints) {
          const points = parseInt(localPoints, 10)
          if (!isNaN(points) && points >= 0) {
            console.log('Debug - Fallback to localStorage XP:', points)
            updatePointsSafely(points, 'load-student-progress-fallback')
            return points
          }
        }
      }
      updatePointsSafely(0, 'load-student-progress-error')
      return 0
    }
  }

  const fetchHomeworks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Fetching word sets for user:', user.id)

      // Find classes for this student
      const { data: classLinks, error: classError } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', user.id)

      if (classError) {
        console.error('Error fetching classes:', classError)
      }

      const classIds = (classLinks || []).map((r: any) => r.class_id)
      console.log('Student class IDs:', classIds)

      // Assigned directly to the student
      const { data: direct, error: directError } = await supabase
        .from('assigned_word_sets')
        .select('id, created_at, due_date, quiz_unlocked, word_sets ( id, title, words, color, grid_config )')
        .eq('student_id', user.id)

      if (directError) {
        console.error('Error fetching direct assignments:', directError)
        console.error('Error details:', JSON.stringify(directError, null, 2))
        console.error('Error code:', directError?.code)
        console.error('Error message:', directError?.message)
        console.error('Error hint:', directError?.hint)
      }

      console.log('Direct assignments:', direct)

      // Assigned to any of the student's classes
      let byClass: any[] = []
      if (classIds.length > 0) {
        const { data: cls, error: classAssignError } = await supabase
          .from('assigned_word_sets')
          .select('id, created_at, due_date, quiz_unlocked, word_sets ( id, title, words, color, grid_config )')
          .in('class_id', classIds)
          .is('student_id', null) // Only get class assignments, not individual ones
        
        if (classAssignError) {
          console.error('Error fetching class assignments:', classAssignError)
          console.error('Class assignment error details:', JSON.stringify(classAssignError, null, 2))
        }
        
        byClass = (cls as any[]) || []
        console.log('Class assignments:', byClass)
      }

      const combined = ([...(direct as any[] || []), ...byClass]).filter(r => r.word_sets)
      console.log('Combined assignments:', combined)

      // Per-set quiz unlocking deprecated; rely on global lock instead

      // Unique by word set id for listing, prefer earliest due_date (display only)
      const byWordSetId = new Map<string, any>()
      for (const rec of combined) {
        const wsid = rec.word_sets?.id
        if (!wsid) continue
        const existing = byWordSetId.get(wsid)
        if (!existing) {
          byWordSetId.set(wsid, rec)
        } else {
          const a = rec.due_date ? new Date(rec.due_date).getTime() : Infinity
          const b = existing.due_date ? new Date(existing.due_date).getTime() : Infinity
          if (a < b) byWordSetId.set(wsid, rec)
        }
      }
      const unique = Array.from(byWordSetId.values())

      console.log('Unique word sets:', unique)
      console.log('First unique item:', unique[0])
      console.log('First unique item word_sets:', unique[0]?.word_sets)

      // No per-set flags applied

      const extractEnglishWords = (words: any): string[] => {
        if (!Array.isArray(words)) return []
        const out: string[] = []
        for (const item of words) {
          if (typeof item === 'string') {
            out.push(item)
          } else if (item && typeof item === 'object') {
            // Handle item.en - must be a non-empty string
            if (typeof item.en === 'string' && item.en.trim() !== '') {
              out.push(item.en)
            } 
            // Fallback to item.word if item.en is missing/empty
            else if (typeof item.word === 'string' && item.word.trim() !== '') {
              out.push(item.word)
            }
            // If neither en nor word exists, skip (but log for debugging)
            else {
              console.warn('Skipping word item with no valid en/word field:', item)
            }
          }
        }
        console.log(`extractEnglishWords: extracted ${out.length} words from ${words.length} items`)
        return out
      }

      const extractTranslations = (words: any): { [key: string]: string } => {
        if (!Array.isArray(words)) return {}
        const translations: { [key: string]: string } = {}
        for (const item of words) {
          if (typeof item === 'string') {
            // If it's just a string, we can't determine translation
            continue
          } else if (item && typeof item === 'object') {
            if (item.en && item.sv) {
              // Both directions: en->sv and sv->en
              translations[item.en.toLowerCase()] = item.sv
              translations[item.sv.toLowerCase()] = item.en
            } else if (item.word && item.translation) {
              translations[item.word.toLowerCase()] = item.translation
              translations[item.translation.toLowerCase()] = item.word
            }
          }
        }
        return translations
      }

      // Map to Homework shape used by games
      console.log('Starting mapping of', unique.length, 'unique items')
      const mapped: Homework[] = unique.map((rec: any, index: number) => {
        console.log(`Mapping item ${index}:`, rec)
        console.log(`Item ${index} word_sets:`, rec.word_sets)
        console.log(`Item ${index} due_date:`, rec.due_date)
        console.log(`Item ${index} created_at:`, rec.created_at)
        const result = {
          id: rec.word_sets.id,
          title: rec.word_sets.title,
          description: 'Vocabulary set',
          due_date: rec.due_date ? new Date(rec.due_date).toISOString() : null, // Only set due_date if it exists
          vocabulary_words: extractEnglishWords(rec.word_sets.words), // Keep for backward compatibility
          words: rec.word_sets.words || [], // New field with full word objects
          teacher_id: '' as any,
          created_at: rec.created_at || new Date().toISOString(), // Use actual created_at for sorting
          translations: extractTranslations(rec.word_sets.words), // Add translations
          color: rec.word_sets.color || undefined,
          grid_config: rec.word_sets.grid_config || undefined, // Add grid configuration
        }
        console.log(`Mapped item ${index} result:`, result)
        return result
      })

      // Separate assignments into active and old (past due)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      console.log('Before filtering, mapped.length:', mapped.length)
      console.log('Today:', today)
      
      const active: Homework[] = []
      const old: Homework[] = []
      
      mapped.forEach(homework => {
        console.log('Filtering homework:', homework.title, 'due_date:', homework.due_date)
        if (!homework.due_date) {
          console.log('No due date, keeping as active:', homework.title)
          active.push(homework) // Keep assignments without due date as active
        } else {
          const dueDate = new Date(homework.due_date)
          const isNotPastDue = dueDate >= today
          console.log('Due date check:', homework.title, 'dueDate:', dueDate, 'isNotPastDue:', isNotPastDue)
          if (isNotPastDue) {
            active.push(homework)
          } else {
            old.push(homework)
          }
        }
      })
      
      console.log('After filtering, active.length:', active.length, 'old.length:', old.length)

      // Sort by created_at (newest first) for dashboard display
      const sortedActive = active.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA // Newest first
      })
      
      const sortedOld = old
        .sort((a, b) => {
          // Sort by due_date descending (newest first)
          const dateA = a.due_date ? new Date(a.due_date).getTime() : 0
          const dateB = b.due_date ? new Date(b.due_date).getTime() : 0
          return dateB - dateA
        })

      console.log('Mapped homeworks (sorted by newest):', sortedActive)
      console.log('Setting homeworks to:', sortedActive.length, 'items')
      console.log('Setting oldWordSets to:', sortedOld.length, 'items')
      setHomeworks(sortedActive)
      setOldWordSets(sortedOld)
      console.log('setHomeworks called with:', sortedActive.length, 'items')
      console.log('setOldWordSets called with:', sortedOld.length, 'items')
    } catch (error) {
      console.error('Error fetching assigned word sets:', error)
    }
  }

  const startFlashcardGame = () => {
    if (homeworks.length === 0 && oldWordSets.length === 0) {
      setMessage('No vocabulary sets available. Please wait for your teacher to assign vocabulary.')
      return
    }
    // If only one word set, start directly
    if (homeworks.length === 1 && oldWordSets.length === 0) {
      setSelectedHomework(homeworks[0])
      setShowFlashcardGame(true)
    } else {
      // Show homework selection modal
      setPendingGame('flashcards')
      setShowHomeworkSelection(true)
    }
  }


  const startWordMatchingGame = () => {
    if (homeworks.length === 0 && oldWordSets.length === 0) {
      setMessage('No vocabulary sets available. Please wait for your teacher to assign vocabulary.')
      return
    }
    if (homeworks.length === 1 && oldWordSets.length === 0) {
      setSelectedHomework(homeworks[0])
      setShowWordMatchingGame(true)
    } else {
      setPendingGame('match')
      setShowHomeworkSelection(true)
    }
  }

  const startTypingChallenge = () => {
    if (homeworks.length === 0 && oldWordSets.length === 0) {
      alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
      return
    }
    if (homeworks.length === 1 && oldWordSets.length === 0) {
      setSelectedHomework(homeworks[0])
      setShowTypingChallenge(true)
    } else {
      setPendingGame('typing')
      setShowHomeworkSelection(true)
    }
  }

  // Background sync function for database updates
  const syncProgressToDatabase = async (gameType: string, score: number, pointsToAdd: number) => {
    try {
      console.log('Background sync: Updating database for', { gameType, score, pointsToAdd })
      
      // Update student progress in database
      const newTotal = await addProgress(pointsToAdd, gameType as any, getTrackingContext())
      
      // Update quest progress in database (already handled by updateQuestProgress)
      // The quest progress is saved to localStorage and synced to DB automatically
      
      console.log('Background sync: Database updated successfully', { newTotal })
      return newTotal
    } catch (error) {
      console.error('Background sync failed:', error)
      // Could implement retry logic here if needed
      return null
    }
  }

  // Async wrapper for updateQuestProgress (for backward compatibility)
  const updateQuestProgress = async (gameType: string, score: number = 1) => {
    const { data: { user } } = await supabase.auth.getUser()
    // Don't await to avoid delay - let it run in background
    updateQuestProgressSync(gameType, score, user?.id).catch(error => {
      console.error('Quest progress sync error:', error)
    })
  }

  // Background sync function to update database with local XP
  const syncLocalXPToDatabase = async (localXP: number, userId: string) => {
    try {
      console.log('Background sync: Updating database with local XP:', localXP)
      
      // Get current database value to calculate delta
      const { data: currentProgress } = await supabase
        .from('student_progress')
        .select('total_points')
        .eq('student_id', userId)
        .is('word_set_id', null)
        .is('homework_id', null)
        .maybeSingle()
      
      const currentDBXP = currentProgress?.total_points || 0
      const delta = localXP - currentDBXP
      
      if (delta <= 0) {
        console.log('Background sync: No sync needed, database already has correct or higher value')
        return
      }
      
      // Use increment_student_xp RPC function to add the difference
      // This is safer than setting absolute value as it handles conflicts correctly
      const { error } = await supabase.rpc('increment_student_xp', {
        p_student_id: userId,
        p_xp_delta: delta,
        p_game_type: 'local_sync'
      })
      
      if (error) {
        console.error('Background sync failed:', error)
        // Fallback to direct update if RPC fails
        const { error: updateError } = await supabase
          .from('student_progress')
          .update({
            total_points: localXP,
            last_played_at: new Date().toISOString(),
          })
          .eq('student_id', userId)
          .is('word_set_id', null)
          .is('homework_id', null)
        
        if (updateError) {
          console.error('Background sync fallback also failed:', updateError)
        } else {
          console.log('Background sync: Database updated successfully with local XP (fallback)')
        }
      } else {
        console.log('Background sync: Database updated successfully with local XP')
      }
    } catch (error) {
      console.error('Background sync error:', error)
    }
  }

  // Safe points update function that prevents race conditions and saves to localStorage
  const updatePointsSafely = (newPoints: number, source: string) => {
    setPoints(prevPoints => {
      console.log(`💰 Points update from ${source}:`, { prevPoints, newPoints, difference: newPoints - prevPoints })
      
      // Always use the higher value to prevent downgrades
      const finalPoints = Math.max(prevPoints, newPoints)
      
      if (finalPoints !== prevPoints) {
        console.log(`Points updated from ${source}: ${prevPoints} → ${finalPoints}`)
      }
      
      // CRITICAL FIX: Use user-specific localStorage key to prevent data leakage
      // Get user synchronously (cached session check)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const userSpecificKey = `studentTotalXP_${user.id}`
          localStorage.setItem(userSpecificKey, finalPoints.toString())
        }
        // Always keep legacy key for backward compatibility during migration
        localStorage.setItem('studentTotalXP', finalPoints.toString())
        localStorage.setItem('currentPoints', finalPoints.toString()) // Keep old key for compatibility
      }).catch(() => {
        // Fallback to legacy key if error (should not happen, but safe fallback)
        localStorage.setItem('studentTotalXP', finalPoints.toString())
        localStorage.setItem('currentPoints', finalPoints.toString())
      })
      
      return finalPoints
    })
  }

  const handleScoreUpdate = (newScore: number, newTotal?: number, gameType?: string, metadata?: { scenarioId: string, goalId: string, success: boolean, stars?: number }) => {
    console.log('🎯 handleScoreUpdate called:', { newScore, newTotal, gameType, metadata, currentPoints: points })
    
    // OPTIMISTIC UI UPDATE: Update quest progress immediately for instant feedback
    if (gameType) {
      // Normalize accuracy to integer and treat >=99% as perfect for quests
      const rounded = Number.isFinite(newScore) ? Math.round(newScore) : 0
      const questScore = rounded >= 99 ? 100 : rounded
      
      // INSTANT: Update quest progress synchronously for immediate UI feedback (no await!)
      // Get user ID from current user state for instant quest updates
      void updateQuestProgressSync(gameType, questScore, user?.id, metadata)
      
      // BACKGROUND: Update streak in background (non-blocking)
      void recomputeStreak()
      window.setTimeout(() => { void recomputeStreak() }, 750)
    }
    
    // OPTIMISTIC UI UPDATE: Handle points based on game type
    if (typeof newTotal === 'number' && Number.isFinite(newTotal)) {
      if (gameType === 'choice' || gameType === 'match' || gameType === 'translate' || gameType === 'connect' || gameType === 'story_gap' || gameType === 'roulette' || gameType === 'typing' || gameType === 'flashcards' || gameType === 'scenario_adventure' || gameType === 'scramble') {
        // For games using new scoring system, newTotal represents points to ADD, not total points
        const currentPoints = points
        const totalAfterGame = currentPoints + newTotal
        console.log(`🎮 ${gameType} points calculation:`, { 
          currentPoints, 
          pointsToAdd: newTotal, 
          totalAfterGame 
        })
        updatePointsSafely(totalAfterGame, `game-${gameType}`)
        
        // IMMEDIATE SYNC: Sync with database immediately (synchronous)
        if (newTotal > 0) {
          void syncProgressToDatabase(gameType, newScore, newTotal)
        }
        
        // INSTANT LEVEL UP CHECK: Check for level up immediately
        const before = levelForXp(currentPoints).level
        const after = levelForXp(totalAfterGame).level
        if (after > before) {
          const t = titleForLevel(after)
          setShowLevelUp({ level: after, title: t.title, image: t.image, description: t.description })
        }
      } else {
        // For other games, newTotal represents total points
        updatePointsSafely(newTotal, `game-${gameType}`)
        
        // IMMEDIATE SYNC: Sync with database immediately (synchronous)
        const pointsToAdd = newTotal - points
        if (pointsToAdd > 0 && gameType) {
          void syncProgressToDatabase(gameType, newScore, pointsToAdd)
        }
        
        // INSTANT LEVEL UP CHECK: Check for level up immediately
        const currentPoints = points
        const before = levelForXp(currentPoints).level
        const after = levelForXp(newTotal).level
    if (after > before) {
      const t = titleForLevel(after)
      setShowLevelUp({ level: after, title: t.title, image: t.image, description: t.description })
        }
      }
    }
  }

  // Update student progress with XP
  const updateStudentProgress = async (wordSetId: string, score: number, gameType: string, studentId: string) => {
    try {
      // Calculate XP based on game type and score
      let xpAward = 10 // Default XP
      
      if (gameType === 'spellcasting') {
        if (score >= 0 && score <= 100) xpAward = 25
        else if (score >= 101 && score <= 500) xpAward = 50
        else if (score >= 501 && score <= 1000) xpAward = 75
        else if (score > 1000) xpAward = 100
      }

      // Update student progress in database
      const { error } = await supabase
        .from('student_progress')
        .upsert({
          student_id: studentId,
          word_set_id: wordSetId,
          homework_id: wordSetId,
          total_points: xpAward,
          last_played_at: new Date().toISOString()
        }, { onConflict: 'student_id,word_set_id,homework_id' })

      if (error) {
        console.error('Error updating student progress:', error)
      }
    } catch (error) {
      console.error('Error in updateStudentProgress:', error)
    }
  }

  // Wrapper for tracking context
  const getTrackingContext = () => {
    const baseContext = {
      studentId: null as string | null,
      wordSetId: selectedHomework?.id,
      homeworkId: selectedHomework?.id,
      isWordBundle: false
    }

    return baseContext
  }



  // Homework selection modal state
  const selectHomeworkForGame = async (homework: Homework) => {
    setSelectedHomework(homework)
    setShowHomeworkSelection(false)
    setShowAllOldWordSets(false)

    // Start the pending game with the selected homework
    if (pendingGame === 'flashcards') {
      setShowFlashcardGame(true)
    } else if (pendingGame === 'match') {
      setShowWordMatchingGame(true)
    } else if (pendingGame === 'typing') {
      setShowTypingChallenge(true)
    } else if (pendingGame === 'scramble') {
      setShowSpellCasting(true)
    } else if (pendingGame === 'translate') {
      setShowTranslateGame(true)
    } else if (pendingGame === 'connect') {
      setShowLineMatchingGame(true)
    } else if (pendingGame === 'quiz') {
      // Temporarily allow multiple attempts for testing
      setShowQuiz(true)
    } else if (pendingGame === 'choice') {
      setShowChoice(true)
    } else if (pendingGame === 'storygap') {
      setShowStoryGap(true)
    } else if (pendingGame === 'roulette') {
      setShowRoulette(true)
    } else if (pendingGame === 'distorted_tale') {
      setShowDistortedTale(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">
      <LogoutHandler />
      <SaveStatusIndicator />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Hero Section - Welcome & Summary */}
        <div className="mb-8">
          <div className="relative rounded-3xl p-8 text-white shadow-2xl overflow-hidden border border-white/10">
            {/* Magical gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-rose-600/30 z-0" />
            <div className="absolute inset-0 backdrop-blur-sm z-0" />
            {/* Dynamic Background Image - Changes every minute */}
            <DynamicBackground />
            <div className="absolute inset-0 bg-black/40 z-0" />
            <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Welcome, {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Student'}!
                </h1>
                <p className="text-gray-200 text-lg">
                  {wizardTitle?.title || 'Apprentice'} • Level {leveling.level}
                </p>
                {teacherInfo && classInfo && (
                  <p className="text-gray-300 text-sm mt-2">
                    {teacherInfo.name} • {classInfo.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="flex items-center justify-center gap-2">
                    <Gem className="w-5 h-5 text-amber-400" />
                    <div className="text-3xl font-bold text-amber-400">{points.toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-gray-300">Arcane Points</div>
                </div>
                {currentStreak > 0 && (
                  <div className="text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <div className="text-3xl font-bold text-orange-400">🔥 {currentStreak}</div>
                    <div className="text-sm text-gray-300">Day streak</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* AP Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-300">Progress to Level {leveling.level + 1}</span>
                <span className="font-semibold text-white">
                  {leveling.nextDelta > 0 
                    ? `${Math.round(leveling.progressToNext * leveling.nextDelta)} / ${leveling.nextDelta} AP`
                    : 'Max level reached!'
                  }
                </span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${leveling.progressToNext * 100}%` }}
                />
              </div>
              {leveling.nextDelta > 0 && (
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {leveling.nextDelta - Math.round(leveling.progressToNext * leveling.nextDelta)} AP left to next level
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Quest Highlight */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Daily Quests
              </h2>
              <Link 
                href="/student/quests"
                className="text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {dailyQuests.slice(0, 2).map((quest, index) => {
                const difficulty = index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'
                const progressPercent = (quest.progress / quest.target) * 100
                const isCompleted = quest.completed
                
                // Map quest ID to badge background image
                const getQuestBackgroundImage = (questId: string): string | null => {
                  const backgroundMap: { [key: string]: string } = {
                    'play_3_games': 'word_warrior.png',
                    'memory_2': 'memory_champion.png',
                    'typing_1': 'spelling_bee.png',
                    'choice_3_perfect': 'choice_master.png',
                    'sentence_gap_perfect': 'gap_filler.png',
                    'spell_slinger_100': 'spell_slinger_novice.png',
                    'sentence_gap_2': 'sentence_builder.png',
                    'roulette_3': 'roulette_master.png',
                    'multi_game_4': 'multi_game_player.png',
                    'perfect_score_1': 'perfect_score.png',
                    'spell_slinger_1200': 'spell_slinger_expert.png',
                    'sentence_gap_5': 'grammar_guru.png',
                    'roulette_5': 'roulette_legend.png',
                    'marathon_10': 'marathon_runner.png',
                    'perfect_3': 'perfectionist.png',
                    'quiz_perfect': 'quiz_god.png',
                    'typing_speed': 'speed_god.png',
                    'roulette_perfect_5_words': 'sentence_starter.png',
                    'roulette_perfect_10_words': 'sentence_expert.png',
                    'roulette_perfect_20_words': 'sentence_master.png',
                    'scenario_breakfast_2_stars': 'breakfast_chef.png',
                    'scenario_breakfast_3_stars': 'master_chef.png'
                  }
                  
                  const filename = backgroundMap[questId]
                  return filename ? `/images/badges/backgrounds/${filename}` : null
                }
                
                const backgroundImage = getQuestBackgroundImage(quest.id)
                
                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/30'
                        : 'bg-white/5 border-white/10 hover:border-amber-500/30'
                    }`}
                  >
                    {/* Background image */}
                    {backgroundImage && (
                      <div 
                        className={`absolute inset-0 transition-opacity duration-300 ${
                          isCompleted 
                            ? 'opacity-30' 
                            : 'opacity-20'
                        }`}
                        style={{
                          backgroundImage: `url(${backgroundImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                    
                    {/* Dark overlay for readability */}
                    {backgroundImage && (
                      <div className={`absolute inset-0 transition-opacity duration-300 ${
                        isCompleted 
                          ? 'bg-gradient-to-br from-black/60 via-black/50 to-black/60' 
                          : 'bg-gradient-to-br from-black/70 via-black/60 to-black/70'
                      }`} />
                    )}
                    
                    {/* Content */}
                    <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-white">{quest.title}</div>
                          <div className="text-xs text-gray-400">{quest.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-bold text-lg">✓</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Gem className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-sm font-semibold text-white">+{quest.xp} AP</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!isCompleted && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>Progress: {quest.progress}/{quest.target}</span>
                          <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 text-gray-300">
                            {difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              difficulty === 'easy'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                : difficulty === 'medium'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-rose-500 to-pink-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                )
              })}
              {dailyQuests.every(q => q.completed) && (
                <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <div className="font-bold text-amber-400">All quests completed!</div>
                      <div className="flex items-center gap-1 text-sm text-amber-300/80">
                        <Gem className="w-3.5 h-3.5 text-amber-300/80" />
                        +100 AP Bonus earned
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Snapshot */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Your Progress
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <span className="text-sm text-gray-300">Badges earned</span>
                <span className="text-2xl font-bold text-amber-400">{badgeStats?.earned || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <span className="text-sm text-gray-300">Total badges</span>
                <span className="text-2xl font-bold text-orange-400">{badgeStats?.total || 0}</span>
              </div>
              <Link
                href="/student/badges"
                className="block w-full text-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all text-sm font-semibold shadow-lg shadow-amber-500/20"
              >
                View collection →
              </Link>
            </div>
          </div>
        </div>
                      
        {/* Active Assignments */}
        <div className="mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                Active Word Sets
              </h2>
              <Link 
                href="/student/word-sets"
                className="text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(() => {
                // Filter out past due assignments for the assignments section
                const today = new Date()
                today.setHours(23, 59, 59, 999) // End of today
                const activeAssignments = homeworks.filter(homework => {
                  if (!homework.due_date) return true // No due date = always active
                  return new Date(homework.due_date) >= today
                })
                
                if (activeAssignments.length === 0) {
                  return (
                    <div className="col-span-full text-center py-12">
                      <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <BookOpen className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400 text-lg">No active word sets</p>
                      <p className="text-gray-500 text-sm mt-2">All are completed or have passed</p>
                    </div>
                  )
                }
                
                return activeAssignments.slice(0, 4).map((homework) => (
                  <div 
                    key={homework.id} 
                    className="border border-white/10 bg-white/5 rounded-xl p-4 hover:bg-white/10 hover:border-amber-500/30 transition-all cursor-pointer group"
                    onClick={() => {
                      console.log('Clicked homework:', homework)
                      console.log('Homework words:', homework.words)
                      setSelectedWordSet(homework)
                      setShowWordSetModal(true)
                    }}
                  >
                    <div className="mb-3">
                      <span className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors block">{homework.title}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {homework.due_date ? (
                        new Date(homework.due_date) < new Date() ? (
                          <span className="text-red-400">Expired: {new Date(homework.due_date).toLocaleDateString('en-US')}</span>
                        ) : (
                          <span className="text-emerald-400">Deadline: {new Date(homework.due_date).toLocaleDateString('en-US')}</span>
                        )
                      ) : (
                        'No deadline'
                      )}
                    </div>
                  </div>
                ))
              })()}
              {homeworks.length > 4 && (
                <div className="col-span-full text-center pt-4">
                  <Link href="/student/word-sets" className="text-sm text-amber-400 hover:text-amber-300 underline">
                    View all active word sets ({homeworks.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Old Word Sets - Separate Section */}
        {oldWordSets.length > 0 && (
          <div className="mb-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  Previous Word Sets
                </h2>
                <span className="text-sm text-gray-500">
                  {oldWordSets.length} set{oldWordSets.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {oldWordSets.slice(0, 4).map((homework) => (
                  <div 
                    key={homework.id} 
                    className="border border-white/10 bg-white/5 rounded-xl p-4 hover:bg-white/10 hover:border-gray-500/30 transition-all cursor-pointer group opacity-70"
                    onClick={() => {
                      setSelectedWordSet(homework)
                      setShowWordSetModal(true)
                    }}
                  >
                    <div className="mb-3">
                      <span className="text-sm font-semibold text-gray-300 truncate group-hover:text-white transition-colors block">{homework.title}</span>
                    </div>
                    <div className="text-xs text-red-400">
                      Expired{homework.due_date ? `: ${new Date(homework.due_date).toLocaleDateString('en-US')}` : ''}
                    </div>
                  </div>
                ))}
              </div>
              {oldWordSets.length > 4 && (
                <div className="text-center pt-4">
                  <Link href="/student/word-sets" className="text-sm text-gray-400 hover:text-gray-300 underline">
                    View all previous word sets ({oldWordSets.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Games Recommendation & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Games Recommendation */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Practice Games
              </h2>
              <Link 
                href="/student/games"
                className="text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                View all →
              </Link>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Ready to practice? Choose a game to improve your vocabulary.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <GameCard
                title="Flashcards"
                color="blue"
                icon={<span className="text-2xl">🃏</span>}
                onClick={startFlashcardGame}
              />
              <GameCard
                title="Memory"
                color="orange"
                icon={<span className="text-2xl">🧠</span>}
                onClick={startWordMatchingGame}
              />
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Active Sessions</h2>
            </div>
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                No active sessions. Sessions assigned to your classes will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/session/${session.id}/play?autoJoin=true`}
                    className="block p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-amber-500/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">
                          {session.session_name || `Session ${session.session_code}`}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">
                          {session.word_set_title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{session.enabled_games.length} games</span>
                          <span>•</span>
                          <span>
                            Due: {new Date(session.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-mono font-semibold">
                          {session.session_code}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>



          {/* Games Section */}
          <div className="space-y-8" data-section="games">
          {/* Games */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8">
            <div className="flex items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Spel</h2>
                <p className="text-sm text-gray-400">Practice vocabulary with engaging games</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Flashcards (blue) */}
              <GameCard
                title="Flashcards"
                color="blue"
                icon={<span className="text-3xl">🃏</span>}
                onClick={startFlashcardGame}
              />

              {/* Multiple Choice (green) */}
              <GameCard
                title="Multiple Choice"
                color="green"
                icon={<span className="text-3xl">✅</span>}
                locked={false}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowChoice(true)
                  } else {
                    setPendingGame('choice')
                    setShowHomeworkSelection(true)
                  }
                }}
              />

              {/* Memory Game (orange) */}
              <GameCard
                title="Memory Game"
                color="orange"
                icon={<span className="text-3xl">🧠</span>}
                onClick={startWordMatchingGame}
              />

              {/* Word Scramble (orange) */}
              <GameCard
                title="Word Scramble"
                color="orange"
                icon={<span className="text-3xl">🔀</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowSpellCasting(true)
                  } else {
                    setPendingGame('scramble')
                    setShowHomeworkSelection(true)
                  }
                }}
              />
              {/* Typing Challenge (pink) */}
              <GameCard
                title="Typing Challenge"
                color="pink"
                icon={<span className="text-3xl">⌨️</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowTypingChallenge(true)
                  } else {
                    setPendingGame('typing')
                    setShowHomeworkSelection(true)
                  }
                }}
              />
              {/* Translate (yellow) */}
              <GameCard
                title="Translate"
                color="yellow"
                icon={<span className="text-3xl">🌐</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowTranslateGame(true)
                  } else {
                    setPendingGame('translate')
                    setShowHomeworkSelection(true)
                  }
                }}
              />

              {/* Sentence Gap (teal) */}
              <GameCard
                title="Sentence Gap"
                color="teal"
                icon={<span className="text-3xl">📖</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowStoryGap(true)
                  } else {
                    setPendingGame('storygap')
                    setShowHomeworkSelection(true)
                  }
                }}
              />

              {/* Word Roulette (red) */}
              <GameCard
                title="Word Roulette"
                color="red"
                icon={<span className="text-3xl">🎰</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    const only = homeworks[0]
                    if (!selectedHomework) setSelectedHomework(only)
                    setShowRoulette(true)
                  } else {
                    setPendingGame('roulette')
                    setShowHomeworkSelection(true)
                  }
                }}
              />

              {/* Quiz (indigo) */}
              <GameCard
                title="Quiz"
                color="indigo"
                icon={<span className="text-3xl">📝</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowQuiz(true)
                  } else {
                    setPendingGame('quiz')
                    setShowHomeworkSelection(true)
                  }
                }}
              />


              {/* Distorted Tale (fuchsia) - HIDDEN FOR NOW */}
              {/* <GameCard
                title="Distorted Tale"
                color="fuchsia"
                icon={<span className="text-3xl">📖</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    setSelectedHomework(homeworks[0])
                    setShowDistortedTale(true)
                  } else {
                    setPendingGame('distorted_tale')
                    setShowHomeworkSelection(true)
                  }
                }}
              /> */}

            </div>
          </div>

          {/* Class Leaderboards */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8 shadow-xl" data-section="leaderboard">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Leaderboard</h2>
                  <p className="text-sm text-gray-400">
                    See which classmates lead in different categories
                  </p>
                </div>
              </div>
            </div>

            {!classInfo?.id ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-sm text-gray-400">
                Join a class to unlock leaderboards.
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">View leaderboard</h3>
                <p className="text-sm text-gray-400 mb-6">
                  See which classmates lead in different categories
                </p>
                <Link
                  href="/student/leaderboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white font-semibold rounded-xl transition-all"
                >
                  <Trophy className="w-5 h-5" />
                  Open leaderboard
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Message Display */}
      {message && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700">{message}</p>
            <button
              onClick={() => setMessage('')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Game Modals */}
        {showFlashcardGame && getCurrentGameData() && (
          <FlashcardGame
            words={getCurrentGameData()!.words}
            wordObjects={getCurrentGameData()!.wordObjects}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowFlashcardGame(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'flashcards')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}

        {showWordMatchingGame && getCurrentGameData() && (
          <MemoryGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowWordMatchingGame(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'match')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}

        {showTypingChallenge && getCurrentGameData() && (
          <TypingChallenge
            words={getCurrentGameData()!.words}
            onClose={() => setShowTypingChallenge(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'typing')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showTranslateGame && getCurrentGameData() && (
          <TranslateGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowTranslateGame(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'translate')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}

        {showStoryGap && getCurrentGameData() && (
          <StoryGapGame
            translations={getCurrentGameData()!.translations}
            words={getCurrentGameData()!.words}
            onClose={() => setShowStoryGap(false)}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'story_gap')}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}

        {showLineMatchingGame && getCurrentGameData() && (
          <LineMatchingGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowLineMatchingGame(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'connect')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}


        {showRoulette && getCurrentGameData() && (
          <RouletteGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowRoulette(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'roulette')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}

        {showScenarioGame && (
          <ScenarioGame
            onClose={() => setShowScenarioGame(false)}
            trackingContext={getTrackingContext()}
            onScoreUpdate={(points, newTotal, gameType, metadata) => {
              handleScoreUpdate(points, newTotal, gameType || 'scenario_adventure', metadata)
            }}
            initialEnvironmentId={initialScenarioEnvironment || undefined}
          />
        )}

        {showSpellCasting && getCurrentGameData() && (
          <ScrambleGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowSpellCasting(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'scramble')}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )}

        {/* Distorted Tale - HIDDEN FOR NOW */}
        {/* {showDistortedTale && getCurrentGameData() && (
          <StoryBuilderGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowDistortedTale(false)}
            onScoreUpdate={(score: number, total?: number) => handleScoreUpdate(score, total, 'distorted_tale')}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
          />
        )} */}

        {showQuiz && getCurrentGameData() && (
          <QuizGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowQuiz(false)}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
            onSubmitScore={async (quizScore, total, evaluations) => {
              console.log('Quiz onSubmitScore called:', { quizScore, total, evaluations })
              
              if (!user) return
              
              const gameData = getCurrentGameData()
              const trackingContext = getTrackingContext()
              const wordSetId = trackingContext?.wordSetId || selectedHomework?.id || null
              const homeworkId = trackingContext?.homeworkId || null
              
              // Calculate accuracy percentage for quest system
              const accuracyPercentage = total > 0 ? Math.round((quizScore / total) * 100) : 0
              console.log('Quiz accuracy calculation:', { quizScore, total, accuracyPercentage })
              
              // INSTANT: Update quest progress immediately - no async, no delay
              updateQuestProgressSync('quiz', accuracyPercentage, user?.id).catch(error => {
                console.error('Quest progress sync error:', error)
              })
              
              // BACKGROUND: Store quiz result in student_progress and game_sessions (non-blocking)
              void (async () => {
                try {
                  const now = new Date().toISOString()
                  
                  // Save to student_progress
                  const progressData: any = {
                    student_id: user.id,
                    word_set_id: wordSetId,
                    homework_id: homeworkId,
                    last_quiz_score: quizScore,
                    last_quiz_total: total,
                    last_quiz_at: now,
                    last_game_type: 'quiz'
                  }
                  
                  // Remove null values for unique constraint
                  if (!homeworkId) delete progressData.homework_id
                  if (!wordSetId) delete progressData.word_set_id
                  
                  // Use appropriate onConflict based on what we have
                  let onConflictValue = 'student_id'
                  if (wordSetId && homeworkId) {
                    onConflictValue = 'student_id,word_set_id,homework_id'
                  } else if (wordSetId) {
                    onConflictValue = 'student_id,word_set_id'
                  }
                  
                  const { error: progressError } = await supabase
                    .from('student_progress')
                    .upsert(progressData, { 
                      onConflict: onConflictValue
                    })
                  
                  if (progressError) {
                    console.error('Error saving quiz to student_progress:', progressError)
                  } else {
                    console.log('✅ Quiz saved to student_progress:', progressData)
                  }
                  
                  // Note: game_sessions is saved by QuizGame via endGameSession, so we don't need to save it here
                  // This prevents duplicate sessions
                  console.log('✅ Quiz session will be saved by QuizGame via endGameSession')
                } catch (e) {
                  console.error('Quiz score save failed:', e)
                }
              })()
            }}
          />
        )}

        {showChoice && getCurrentGameData() && (
          <MultipleChoiceGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowChoice(false)}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            gridConfig={getCurrentGameData()!.grid_config}
            onScoreUpdate={(score, newTotal) => {
              console.log('Multiple Choice onScoreUpdate called:', { score, newTotal })
              handleScoreUpdate(score, newTotal, 'choice')
            }}
          />
        )}


        {/* Homework Selection Modal */}
        <AnimatePresence>
          {showHomeworkSelection && (
            <motion.div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="relative w-full max-w-md"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Select Word Set</h3>
                    <button
                      onClick={() => {
                        setShowHomeworkSelection(false)
                        setPendingGame(null)
                        setShowAllOldWordSets(false)
                      }}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {homeworks.map((hw) => (
                      <button
                        key={hw.id}
                        onClick={() => selectHomeworkForGame(hw)}
                        className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-white group-hover:text-amber-400 transition-colors">{hw.title}</span>
                          {hw.due_date && (
                            <span className="text-xs italic text-gray-400">
                              Due: {new Date(hw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {oldWordSets.length > 0 && (
                      <>
                        <div className="flex items-center justify-between pt-4 pb-2 border-t border-white/10 mt-4">
                          <div className="text-xs text-gray-500">Older Word Sets</div>
                          {oldWordSets.length > 10 && !showAllOldWordSets && (
                            <button
                              onClick={() => setShowAllOldWordSets(true)}
                              className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                            >
                              Show all ({oldWordSets.length})
                            </button>
                          )}
                          {showAllOldWordSets && oldWordSets.length > 10 && (
                            <button
                              onClick={() => setShowAllOldWordSets(false)}
                              className="text-xs text-gray-400 hover:text-gray-300 font-medium"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                        {(showAllOldWordSets ? oldWordSets : oldWordSets.slice(0, 10)).map((hw) => (
                          <button
                            key={hw.id}
                            onClick={() => selectHomeworkForGame(hw)}
                            className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all opacity-70 group"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-gray-400 group-hover:text-amber-400 transition-colors">{hw.title}</span>
                              {hw.due_date && (
                                <span className="text-xs italic text-gray-500">
                                  Was due: {new Date(hw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {showLevelUp && (
        <LevelUpModal
          level={showLevelUp.level}
          title={showLevelUp.title}
          image={showLevelUp.image}
          description={showLevelUp.description}
          onClose={() => setShowLevelUp(null)}
        />
      )}

      {showWizardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowWizardModal(false)}>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-full blur-2xl" />
            <div className="relative w-80 h-80 rounded-full border-4 border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center overflow-hidden shadow-2xl">
              {wizardTitle.image ? (
                <img src={wizardTitle.image} alt={wizardTitle.title} className="w-72 h-72 rounded-full object-cover" />
              ) : (
                <Star className="w-32 h-32 text-amber-400" />
              )}
            </div>
            <button 
              className="absolute top-4 right-4 w-10 h-10 bg-[#12122a] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors"
              onClick={() => setShowWizardModal(false)}
            >
              ×
            </button>
            {/* Title below */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
              <div className="text-xl font-bold text-white">{wizardTitle.title}</div>
              <div className="text-sm text-gray-400">Level {leveling.level}</div>
            </div>
          </div>
        </div>
      )}

      {showWordSetModal && selectedWordSet && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWordSetModal(false)}>
          <div className="relative w-full max-w-4xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-3xl blur-xl" />
            <div className="relative bg-[#12122a] rounded-2xl overflow-hidden shadow-xl border border-white/10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">{selectedWordSet.title}</h2>
              <button 
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 text-2xl transition-colors"
                onClick={() => setShowWordSetModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {(() => {
                console.log('Modal selectedWordSet:', selectedWordSet)
                console.log('Modal words array:', selectedWordSet.words)
                
                // Get color scheme based on index (use COLOR_GRIDS for consistency)
                const getBlockColor = (blockIdx: number) => {
                  return COLOR_GRIDS[blockIdx % COLOR_GRIDS.length]
                }
                
                // Use grid_config if available, otherwise use default splitting
                const gridConfig = (selectedWordSet as any).grid_config as Array<{words: string[] | Array<{ en: string; sv: string }>, color: string, index: number}> | undefined
                const wordsPerGrid = 6
                
                let grids: Array<Array<{ en: string; sv: string }>> = []
                let gridColors: string[] = []
                
                if (gridConfig && gridConfig.length > 0) {
                  // Use configured grids - handle both string arrays (backward compatibility) and word object arrays
                  grids = gridConfig.map(g => {
                    // Convert word objects to array format expected by the display
                    if (g.words && g.words.length > 0 && typeof g.words[0] === 'object' && 'en' in g.words[0]) {
                      // Word objects already exist - but we need to ensure they have proper en values
                      return (g.words as unknown as Array<{ en: string; sv: string }>).map(w => {
                        // If en is empty, try to find it from the original word set
                        if (!w.en && w.sv && selectedWordSet.words) {
                          const originalWord = selectedWordSet.words.find((ow: any) => 
                            (typeof ow === 'object' && ow.sv === w.sv) ||
                            (typeof ow === 'string' && ow === w.sv)
                          )
                          if (originalWord && typeof originalWord === 'object' && originalWord.en) {
                            return { en: originalWord.en, sv: w.sv }
                          }
                        }
                        return w
                      })
                    } else {
                      // Backward compatibility: convert string array to word objects by finding them in the original word set
                      const wordsAsStrings = g.words as unknown as string[]
                      return wordsAsStrings.map(w => {
                        // Try to find the full word object from the original word set
                        const originalWord = selectedWordSet.words?.find((ow: any) => 
                          (typeof ow === 'object' && ow.sv === w) ||
                          (typeof ow === 'string' && ow === w)
                        )
                        if (originalWord && typeof originalWord === 'object' && originalWord.en) {
                          return { en: originalWord.en, sv: originalWord.sv || w }
                        }
                        return { en: '', sv: w }
                      })
                    }
                  })
                  gridColors = gridConfig.map(g => g.color)
                } else {
                  // Default: split words into grids
                  const totalGrids = Math.ceil((selectedWordSet.words?.length || 0) / wordsPerGrid)
                  for (let i = 0; i < totalGrids; i++) {
                    const startIdx = i * wordsPerGrid
                    const endIdx = startIdx + wordsPerGrid
                    grids.push(selectedWordSet.words?.slice(startIdx, endIdx) || [])
                    const colorScheme = COLOR_GRIDS[i % COLOR_GRIDS.length]
                    gridColors.push(colorScheme.hex)
                  }
                }
                
                const totalGrids = grids.length
                
                // Reset tab when word set changes
                if (wordSetTab >= totalGrids) {
                  setWordSetTab(0)
                }
                
                if (totalGrids === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <BookOpen className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-gray-400 text-lg">No words available</p>
                      <p className="text-gray-500 text-sm mt-2">This word set has no words yet</p>
                    </div>
                  )
                }
                
                return (
                  <div>
                    {/* Tabs - minimalist colored blocks */}
                    {totalGrids > 1 && (
                      <div className="flex flex-wrap gap-3 mb-6">
                        {grids.map((grid, idx) => {
                          const colorHex = gridColors[idx] || COLOR_GRIDS[idx % COLOR_GRIDS.length].hex
                          const isActive = wordSetTab === idx
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setWordSetTab(idx)}
                              className={`
                                relative w-16 h-16 rounded-xl transition-all transform
                                ${isActive 
                                  ? 'scale-110 ring-2 ring-white/50' 
                                  : 'opacity-60 hover:opacity-100 hover:scale-105'
                                }
                                cursor-pointer
                              `}
                              style={{
                                backgroundColor: colorHex,
                                boxShadow: isActive 
                                  ? `0 0 30px ${colorHex}60`
                                  : `0 4px 15px ${colorHex}30`
                              }}
                            >
                              {/* Grid number */}
                              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#12122a] text-white px-2.5 py-0.5 rounded-full text-xs font-bold border border-white/20">
                                {idx + 1}
                              </div>
                              {isActive && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#12122a]">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* Words for active tab - scrollable grid to ensure all words are visible */}
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto min-h-0">
                      {grids[wordSetTab]?.map((word: { en: string; sv: string }, index: number) => {
                        const globalIndex = wordSetTab * wordsPerGrid + index
                        const colorHex = gridColors[wordSetTab] || COLOR_GRIDS[wordSetTab % COLOR_GRIDS.length].hex
                        const colorScheme = COLOR_GRIDS.find(c => c.hex === colorHex) || COLOR_GRIDS[wordSetTab % COLOR_GRIDS.length]
                        
                        // Handle different word formats - now grids contains word objects with en and sv
                        const english = word.en || ''
                        const swedish = word.sv || ''
                        // Try to find the original word object from selectedWordSet.words to get image and example
                        const originalWord = selectedWordSet.words?.find((w: any) => 
                          (typeof w === 'object' && w.en === word.en && w.sv === word.sv) ||
                          (typeof w === 'string' && w === word.sv)
                        )
                        const image = originalWord?.image || originalWord?.img || ''
                        const example = originalWord?.example || originalWord?.sentence || ''
                      
                        return (
                          <div 
                            key={globalIndex} 
                            className="rounded-lg p-4 hover:shadow-md transition-all border-2 border-white flex flex-col min-h-0"
                            style={{ backgroundColor: colorScheme.hex }}
                          >
                            <div className="flex items-center gap-3 mb-2 flex-shrink-0">
                              {image && (
                                <img 
                                  src={image} 
                                  alt={english} 
                                  className="w-12 h-12 rounded-lg object-cover border-2 border-white/50 flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white text-lg drop-shadow-sm">{english}</div>
                                <div className="text-white/90 text-sm drop-shadow-sm">{swedish}</div>
                              </div>
                            </div>
                            {example && (
                              <div className="text-sm text-white/80 italic mt-2 drop-shadow-sm line-clamp-2 flex-1 min-h-0">
                                "{example}"
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              
              {(!selectedWordSet.words || selectedWordSet.words.length === 0) && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <BookOpen className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-lg">No words available</p>
                  <p className="text-gray-500 text-sm mt-2">This word set has no words yet</p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Daily Quest Bonus Notification */}
      {showBonusNotification && (
        <div className="fixed top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-lg shadow-amber-500/30 z-50 animate-bounce border border-amber-400/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-bold text-lg">All quests completed!</div>
              <div className="flex items-center gap-1 text-sm opacity-90">
                <Gem className="w-3.5 h-3.5" />
                +100 AP Bonus earned!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Notification */}
      {newBadge && (
        <BadgeNotification
          badge={newBadge}
          onClose={handleBadgeDismiss}
          onFlyToGrid={(badgeId) => {
            setFlyingBadgeId(badgeId)
            setHighlightedBadgeId(badgeId)
            // Clear highlight after animation
            setTimeout(() => setHighlightedBadgeId(null), 2000)
          }}
          duration={6000}
        />
      )}

      {/* Badge Fly Animation */}
      <BadgeFlyAnimation
        badgeId={flyingBadgeId}
        onAnimationComplete={() => {
          setFlyingBadgeId(null)
          setNewBadge(null)
          // Force a refresh of recent badges to ensure they're displayed correctly
          setTimeout(() => {
            refreshRecentBadges()
            console.log('🎖️ Fly animation complete, recent badges refreshed')
          }, 100)
        }}
      />
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  )
}
