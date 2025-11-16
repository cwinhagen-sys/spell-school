'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useActivityTracking } from '@/hooks/useActivityTracking'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'
import { BookOpen, Target, Star, Users, ChevronDown, Calendar, LogOut, Trophy } from 'lucide-react'
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

export default function StudentDashboard() {
  // Track user activity for better "Playing" status
  useActivityTracking()
  
  const [user, setUser] = useState<any>(null)
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
  const [pendingGame, setPendingGame] = useState<'flashcards' | 'match' | 'typing' | 'translate' | 'connect' | 'quiz' | 'choice' | 'storygap' | 'roulette' | null>(null)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [showHomeworkSelection, setShowHomeworkSelection] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'old'>('active')
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title?: string; image?: string; description?: string } | null>(null)
  const [showWizardModal, setShowWizardModal] = useState(false)
  const [showWordSetModal, setShowWordSetModal] = useState(false)
  const [selectedWordSet, setSelectedWordSet] = useState<any>(null)
  const [wordSetTab, setWordSetTab] = useState(0)
  const [classInfo, setClassInfo] = useState<{id: string, name: string} | null>(null)
  const [teacherInfo, setTeacherInfo] = useState<{name: string} | null>(null)
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
      { id: 'roulette_perfect_20_words', title: 'Sentence Master', description: 'Create a perfect sentence with 20+ words', target: 1, xp: 100, icon: '📚' }
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


  // Update quest progress (synkron version för instant feedback)
  const updateQuestProgressSync = async (gameType: string, score: number = 1, userId?: string) => {
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
      }

      if (quest.progress >= quest.target && !quest.completed) {
        quest.completed = true
        updated = true
        console.log(`🎯 QUEST COMPLETED: ${quest.title} (${quest.id}) - Progress: ${quest.progress}/${quest.target}`)
        
        // INSTANT UI UPDATE: Award XP immediately for instant feedback
        setPoints(prev => {
          const newTotal = prev + quest.xp
          console.log(`Quest completed: ${quest.title}, XP awarded: ${quest.xp}, Total: ${prev} → ${newTotal}`)
          return newTotal
        })
        
        // INSTANT UI UPDATE: Award badge immediately for instant animation
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
          setTimeout(async () => {
            const total = await loadStudentProgress()
            setPoints(prev => Math.max(prev, total))
          }, 500)
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
        setPoints(prev => Math.max(prev, total))
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
        setTimeout(async () => {
          const total = await loadStudentProgress()
          setPoints(prev => Math.max(prev, total))
        }, 500)
      })
      
      // Show bonus notification
      setShowBonusNotification(true)
      setTimeout(() => setShowBonusNotification(false), 5000) // Hide after 5 seconds
    } else if (allCompleted && localStorage.getItem(bonusKey)) {
      console.log('All quests completed, bonus already awarded today')
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
    if (classInfo?.id) {
      void loadClassLeaderboards(classInfo.id)
      // Load teacher info when class info is available
      void loadTeacherInfo(classInfo.id)
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
        const displayName = player.displayName || player.username || player.name || 'Elev'
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
      // Ensure UI reads the same total immediately
      setPoints(total)
      
      // Load class information
      await loadClassInfo()
      
    } catch (error) {
      console.error('Error loading student data:', error)
      setMessage('Failed to load data')
    } finally {
      setLoading(false)
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

      // Always use database value as source of truth for display
      // But sync to database if localStorage is higher (to prevent XP loss)
      const finalXP = dbXP
      console.log('Debug - Final XP (from database):', finalXP)

      // Update localStorage with database value to keep them in sync
      localStorage.setItem(userSpecificKey, finalXP.toString())
      updatePointsSafely(finalXP, 'load-student-progress')

      // If localStorage was higher, sync to database (one-time sync to prevent XP loss)
      if (localXP > dbXP && localXP > 0) {
        console.log('Debug - localStorage XP is higher, syncing to database')
        syncLocalXPToDatabase(localXP, user.id)
        // After syncing, reload from database to get the updated value
        const { data: updatedProgress } = await supabase
          .from('student_progress')
          .select('total_points')
          .eq('student_id', user.id)
          .is('word_set_id', null)
          .is('homework_id', null)
          .limit(1)
          .maybeSingle()
        
        if (updatedProgress?.total_points) {
          const syncedXP = updatedProgress.total_points
          localStorage.setItem(userSpecificKey, syncedXP.toString())
          updatePointsSafely(syncedXP, 'load-student-progress-after-sync')
          return syncedXP
        }
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
            setPoints(points)
            return points
          }
        }
      }
      setPoints(0)
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
          if (typeof item === 'string') out.push(item)
          else if (item && typeof item === 'object') {
            if (typeof item.en === 'string') out.push(item.en)
            else if (typeof item.word === 'string') out.push(item.word)
          }
        }
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
      
      const sortedOld = old.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA // Newest first
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
    // For flashcards, always start directly - color grid selection will handle word set selection
    // Use first available homework or old word set
    const homework = homeworks[0] || oldWordSets[0]
    if (homework) {
      setSelectedHomework(homework)
      setShowFlashcardGame(true)
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
      // Skip addProgress call since we're directly updating the database
      // Force update the global record with the local XP total
      const { error } = await supabase
        .from('student_progress')
        .upsert({
          student_id: userId,
          word_set_id: null,
          homework_id: null,
          total_points: localXP,
          games_played: 0, // Don't overwrite games_played
          last_played_at: new Date().toISOString(),
        }, { onConflict: 'student_id,word_set_id,homework_id' })
      
      if (error) {
        console.log('Background sync failed:', error)
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

  const handleScoreUpdate = (newScore: number, newTotal?: number, gameType?: string) => {
    console.log('🎯 handleScoreUpdate called:', { newScore, newTotal, gameType, currentPoints: points })
    
    // OPTIMISTIC UI UPDATE: Update quest progress immediately for instant feedback
    if (gameType) {
      // Normalize accuracy to integer and treat >=99% as perfect for quests
      const rounded = Number.isFinite(newScore) ? Math.round(newScore) : 0
      const questScore = rounded >= 99 ? 100 : rounded
      
      // INSTANT: Update quest progress synchronously for immediate UI feedback (no await!)
      // Get user ID from current user state for instant quest updates
      void updateQuestProgressSync(gameType, questScore, user?.id)
      
      // BACKGROUND: Update streak in background (non-blocking)
      void recomputeStreak()
      window.setTimeout(() => { void recomputeStreak() }, 750)
    }
    
    // OPTIMISTIC UI UPDATE: Handle points based on game type
    if (typeof newTotal === 'number' && Number.isFinite(newTotal)) {
      if (gameType === 'choice' || gameType === 'match' || gameType === 'translate' || gameType === 'connect' || gameType === 'story_gap' || gameType === 'roulette' || gameType === 'typing' || gameType === 'flashcards') {
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
    
    // Start the pending game with the selected homework
    if (pendingGame === 'flashcards') {
      setShowFlashcardGame(true)
    } else if (pendingGame === 'match') {
      setShowWordMatchingGame(true)
    } else if (pendingGame === 'typing') {
      setShowTypingChallenge(true)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <LogoutHandler />
      <SaveStatusIndicator />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Hero Section - Welcome & Summary */}
        <div className="mb-8">
          <div className="relative rounded-2xl p-8 text-white shadow-xl overflow-hidden">
            {/* Dynamic Background Image - Changes every minute */}
            <DynamicBackground />
            {/* Very subtle dark overlay only for text readability if needed */}
            <div className="absolute inset-0 bg-black/10 z-0" />
            <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Welcome back, {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Student'}!
                </h1>
                <p className="text-purple-100 text-lg">
                  {wizardTitle?.title || 'Novice Learner'} • Level {leveling.level}
                </p>
                {teacherInfo && classInfo && (
                  <p className="text-purple-100 text-sm mt-2">
                    {teacherInfo.name} • {classInfo.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{points.toLocaleString()}</div>
                  <div className="text-sm text-purple-100">Total XP</div>
                </div>
                {currentStreak > 0 && (
                  <>
                    <div className="w-px h-12 bg-white/30"></div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">🔥 {currentStreak}</div>
                      <div className="text-sm text-purple-100">Day Streak</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* XP Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-purple-100">Progress to Level {leveling.level + 1}</span>
                <span className="font-semibold">
                  {leveling.nextDelta > 0 
                    ? `${Math.round(leveling.progressToNext * leveling.nextDelta)} / ${leveling.nextDelta} XP`
                    : 'Max level reached!'
                  }
                </span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${leveling.progressToNext * 100}%` }}
                />
              </div>
              {leveling.nextDelta > 0 && (
                <div className="text-xs text-purple-100 mt-1 text-right">
                  {leveling.nextDelta - Math.round(leveling.progressToNext * leveling.nextDelta)} XP to next level
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Quest Highlight */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Today's Focus
              </h2>
              <Link 
                href="/student/quests"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {dailyQuests.slice(0, 2).map((quest, index) => {
                const difficulty = index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'
                const progressPercent = (quest.progress / quest.target) * 100
                const isCompleted = quest.completed
                
                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{quest.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-800">{quest.title}</div>
                          <div className="text-xs text-gray-600">{quest.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isCompleted ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-sm font-semibold text-purple-600">+{quest.xp} XP</span>
                        )}
                      </div>
                    </div>
                    {!isCompleted && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress: {quest.progress}/{quest.target}</span>
                          <span className="capitalize">{difficulty}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              difficulty === 'easy'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : difficulty === 'medium'
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                : 'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {dailyQuests.every(q => q.completed) && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <div className="font-bold text-purple-800">All Quests Complete!</div>
                      <div className="text-sm text-purple-600">+100 XP Bonus earned</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Snapshot */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Progress Snapshot
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-700">Badges Earned</span>
                <span className="text-lg font-bold text-purple-600">{badgeStats?.earned || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm text-gray-700">Total Badges</span>
                <span className="text-lg font-bold text-indigo-600">{badgeStats?.total || 0}</span>
              </div>
              <Link
                href="/student/badges"
                className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                View Collection →
              </Link>
            </div>
          </div>
        </div>
                      
        {/* Active Assignments */}
        <div className="mb-8">
          <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Active Assignments
              </h2>
              <Link 
                href="/student/word-sets"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
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
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-lg">No active assignments</p>
                      <p className="text-gray-400 text-sm mt-2">All assignments are completed or past due</p>
                    </div>
                  )
                }
                
                return activeAssignments.slice(0, 10).map((homework) => (
                  <div 
                    key={homework.id} 
                    className="border border-gray-200 bg-white/60 rounded-lg p-4 hover:bg-white/80 transition-colors cursor-pointer"
                    onClick={() => {
                      console.log('Clicked homework:', homework)
                      console.log('Homework words:', homework.words)
                      setSelectedWordSet(homework)
                      setShowWordSetModal(true)
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: homework.color || '#6b7280' }} />
                      <span className="text-sm font-semibold text-gray-800 truncate">{homework.title}</span>
                        </div>
                    <div className="text-xs text-gray-500">
                      Due: {homework.due_date ? new Date(homework.due_date).toLocaleDateString('en-US') : 'No due date'}
                        </div>
                      </div>
                ))
              })()}
              {homeworks.length > 10 && (
                <div className="col-span-full text-center pt-4">
                  <a href="/student/word-sets" className="text-sm text-indigo-600 hover:text-indigo-800 underline">
                    View all assignments ({homeworks.length})
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Games Recommendation & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Games Recommendation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                Practice Games
              </h2>
              <Link 
                href="/student/games"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View all →
              </Link>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ready to practice? Choose a game to improve your vocabulary skills.
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

          {/* Leaderboard Snippet - Level Leaderboard Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Leaderboard
              </h2>
              <Link 
                href="/student/leaderboard"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View all →
              </Link>
            </div>
            {leaderboardPlayers && leaderboardPlayers.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-gray-50 p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Highest Level</h3>
                  <p className="text-xs text-gray-500">Total XP levels</p>
                </div>
                <div className="space-y-2">
                  {leaderboardPlayers
                    .slice()
                    .sort((a, b) => (b.level || 0) - (a.level || 0))
                    .slice(0, Math.min(5, leaderboardPlayers.length))
                    .map((player, index) => {
                      const rank = index + 1
                      const isTopThree = rank <= 3
                      const isCurrentUser = player.id === leaderboardData?.currentUserId
                      
                      // Medal colors and styles
                      const medalStyles = {
                        1: {
                          badge: 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-500/50',
                          border: 'border-yellow-300',
                          bg: 'bg-gradient-to-r from-yellow-50/80 to-yellow-100/40',
                          glow: 'shadow-lg shadow-yellow-500/30'
                        },
                        2: {
                          badge: 'bg-gradient-to-br from-gray-300 to-gray-500 border-gray-400 text-white shadow-lg shadow-gray-400/50',
                          border: 'border-gray-300',
                          bg: 'bg-gradient-to-r from-gray-50/80 to-gray-100/40',
                          glow: 'shadow-lg shadow-gray-400/30'
                        },
                        3: {
                          badge: 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-700 text-white shadow-lg shadow-amber-600/50',
                          border: 'border-amber-400',
                          bg: 'bg-gradient-to-r from-amber-50/80 to-amber-100/40',
                          glow: 'shadow-lg shadow-amber-500/30'
                        }
                      }
                      
                      const medalStyle = isTopThree ? medalStyles[rank as 1 | 2 | 3] : null
                      
                      return (
                        <div
                          key={`level-${player.id}`}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                            isCurrentUser
                              ? isTopThree
                                ? `${medalStyle?.border} ${medalStyle?.bg} ${medalStyle?.glow}`
                                : 'border-indigo-200 bg-indigo-50/60'
                              : isTopThree
                                ? `${medalStyle?.border} ${medalStyle?.bg} ${medalStyle?.glow}`
                                : 'border-gray-200 bg-white'
                          } ${isTopThree ? 'shadow-md' : 'shadow-sm'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <img
                                src={player.wizardImage}
                                alt={player.displayName || 'Student'}
                                className={`w-10 h-10 rounded-full object-cover border-2 shadow ${
                                  isTopThree ? 'border-white shadow-lg' : 'border-white'
                                }`}
                              />
                              <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isTopThree 
                                  ? medalStyle?.badge 
                                  : 'bg-white border border-gray-200 text-gray-600'
                              }`}>
                                {rank}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                {player.displayName || 'Student'}
                                {isCurrentUser && (
                                  <span className="text-xs font-semibold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {player.totalPoints.toLocaleString()} XP
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${
                              isTopThree ? 'text-gray-900' : 'text-gray-900'
                            }`}>
                              Lv {player.level}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No leaderboard data yet</p>
                <p className="text-xs text-gray-400 mt-1">Start playing to appear on the leaderboard!</p>
              </div>
            )}
          </div>
        </div>



          {/* Games Section */}
          <div className="space-y-8" data-section="games">
          {/* Games */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Games</h2>
                <p className="text-sm text-gray-600">Practice vocabulary with engaging games</p>
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

              {/* Matching Pairs (purple) */}
              <GameCard
                title="Matching Pairs"
                color="purple"
                icon={<span className="text-3xl">🔗</span>}
                onClick={() => {
                  if (homeworks.length === 0 && oldWordSets.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1 && oldWordSets.length === 0) {
                    const only = homeworks[0]
                    if (!selectedHomework) setSelectedHomework(only)
                    setShowLineMatchingGame(true)
                  } else {
                    setPendingGame('connect')
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
            </div>
          </div>

          {/* Class Leaderboards */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg" data-section="leaderboard">
            <div className="flex items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Leaderboard</h2>
                <p className="text-sm text-gray-600">
                  See which classmates lead in different categories
                </p>
              </div>
            </div>

            {!classInfo?.id ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                Join a class to unlock leaderboards.
              </div>
            ) : leaderboardLoading ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                Loading leaderboards...
              </div>
            ) : leaderboardError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">
                {leaderboardError}
              </div>
            ) : leaderboardPlayers.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                No results yet – play some games to kickstart the leaderboards!
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    key: 'level',
                    title: 'Highest Level',
                    description: 'Total XP levels',
                    metric: (player: any) => player.level,
                    renderValue: (player: any) => `Lv ${player.level}`
                  },
                  {
                    key: 'badges',
                    title: 'Most Badges',
                    description: 'Collector\'s favorite',
                    metric: (player: any) => player.badgeCount,
                    renderValue: (player: any) => `${player.badgeCount} badges`
                  },
                  {
                    key: 'streak',
                    title: 'Current Streak',
                    description: 'Days in a row right now',
                    metric: (player: any) => player.longestStreak,
                    renderValue: (player: any) => `${player.longestStreak} days`
                  },
                  {
                    key: 'sessions',
                    title: 'Games Played',
                    description: 'Total number of games',
                    metric: (player: any) => player.sessionCount,
                    renderValue: (player: any) => `${player.sessionCount} games`
                  },
                  {
                    key: 'kpm',
                    title: 'Fastest Typist',
                    description: 'Best Typing Challenge KPM',
                    metric: (player: any) => player.bestKpm,
                    renderValue: (player: any) => `${Math.round(player.bestKpm)} KPM`
                  },
                  {
                    key: 'accuracy',
                    title: 'Best Accuracy',
                    description: 'Highest average accuracy',
                    metric: (player: any) => player.averageAccuracy,
                    renderValue: (player: any) => `${Math.round(player.averageAccuracy)}%`
                  }
                ].map(category => {
                  const topPlayers = leaderboardPlayers
                    .slice()
                    .sort((a, b) => (category.metric(b) || 0) - (category.metric(a) || 0))
                    .slice(0, 5)

                  return (
                    <div key={category.key} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-gray-50 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            {category.title}
                          </h3>
                          <p className="text-xs text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {topPlayers.map((player, index) => {
                          const rank = index + 1
                          const isTopThree = rank <= 3
                          
                          // Medal colors and styles
                          const medalStyles = {
                            1: {
                              badge: 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-500/50',
                              border: 'border-yellow-300',
                              bg: 'bg-gradient-to-r from-yellow-50/80 to-yellow-100/40',
                              glow: 'shadow-lg shadow-yellow-500/30'
                            },
                            2: {
                              badge: 'bg-gradient-to-br from-gray-300 to-gray-500 border-gray-400 text-white shadow-lg shadow-gray-400/50',
                              border: 'border-gray-300',
                              bg: 'bg-gradient-to-r from-gray-50/80 to-gray-100/40',
                              glow: 'shadow-lg shadow-gray-400/30'
                            },
                            3: {
                              badge: 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-700 text-white shadow-lg shadow-amber-600/50',
                              border: 'border-amber-400',
                              bg: 'bg-gradient-to-r from-amber-50/80 to-amber-100/40',
                              glow: 'shadow-lg shadow-amber-500/30'
                            }
                          }
                          
                          const medalStyle = isTopThree ? medalStyles[rank as 1 | 2 | 3] : null
                          
                          return (
                            <div
                              key={`${category.key}-${player.id}`}
                              className={`flex items-center justify-between rounded-xl border px-3 py-3 transition-all ${
                                player.id === leaderboardData?.currentUserId
                                  ? isTopThree
                                    ? `${medalStyle?.border} ${medalStyle?.bg} ${medalStyle?.glow}`
                                    : 'border-indigo-200 bg-indigo-50/60'
                                  : isTopThree
                                    ? `${medalStyle?.border} ${medalStyle?.bg} ${medalStyle?.glow}`
                                    : 'border-gray-200 bg-white'
                              } ${isTopThree ? 'shadow-md' : 'shadow-sm'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img
                                    src={player.wizardImage}
                                    alt={player.displayName || 'Student'}
                                    className={`w-12 h-12 rounded-full object-cover border-2 shadow ${
                                      isTopThree ? 'border-white shadow-lg' : 'border-white'
                                    }`}
                                  />
                                  <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isTopThree 
                                      ? medalStyle?.badge 
                                      : 'bg-white border border-gray-200 text-gray-600'
                                  }`}>
                                    {rank}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                    {player.displayName || 'Student'}
                                    {player.id === leaderboardData?.currentUserId && (
                                      <span className="text-xs font-semibold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Level {player.level} · {player.totalPoints} XP
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-base font-bold ${
                                  isTopThree ? 'text-gray-900' : 'text-gray-900'
                                }`}>
                                  {category.renderValue(player)}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {topPlayers.length === 0 && (
                          <div className="text-xs text-gray-500 text-center py-4">
                            No statistics yet
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
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
        {showHomeworkSelection && (
          <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl border border-gray-100 relative my-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Choose Vocabulary Set</h2>
                    <p className="text-sm text-gray-600">Select which vocabulary list you want to practice with</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowHomeworkSelection(false)
                    setActiveTab('active')
                  }}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-600 text-xl">×</span>
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-3 mb-6 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 px-6 py-3 text-center font-semibold rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'active'
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-900 shadow-lg'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-700 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300'
                  }`}
                >
                  <Star className={`w-5 h-5 ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-500'}`} />
                  Active Assignments
                  {homeworks.length > 0 && (
                    <span className={`ml-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      activeTab === 'active' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {homeworks.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('old')}
                  className={`flex-1 px-6 py-3 text-center font-semibold rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'old'
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-900 shadow-lg'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-700 hover:from-amber-50 hover:to-orange-50 hover:border-amber-300'
                  }`}
                >
                  <BookOpen className={`w-5 h-5 ${activeTab === 'old' ? 'text-amber-600' : 'text-gray-500'}`} />
                  Old Word Sets
                  {oldWordSets.length > 0 && (
                    <span className={`ml-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      activeTab === 'old' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {oldWordSets.length}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2">
                {activeTab === 'active' && (
                  <>
                    {homeworks.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {homeworks.map((homework) => (
                          <button
                            key={homework.id}
                            onClick={() => selectHomeworkForGame(homework)}
                            className="text-left p-5 rounded-2xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all shadow-md hover:shadow-lg"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              {homework.color && (
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm" 
                                  style={{ backgroundColor: homework.color }}
                                />
                              )}
                              <h3 className="font-semibold text-lg text-gray-800">{homework.title}</h3>
                            </div>
                            {homework.due_date && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="text-blue-600 font-medium">
                                  Due: {new Date(homework.due_date).toLocaleDateString('en-US')}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <BookOpen className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-700 text-lg font-semibold mb-2">No active assignments</p>
                        <p className="text-gray-500 text-sm">All assignments are completed or past due</p>
                      </div>
                    )}
                  </>
                )}
                
                {activeTab === 'old' && (
                  <>
                    {oldWordSets.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {oldWordSets.map((homework) => (
                          <button
                            key={homework.id}
                            onClick={() => selectHomeworkForGame(homework)}
                            className="text-left p-5 rounded-2xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-amber-50 hover:to-orange-50 hover:border-amber-300 transition-all shadow-md hover:shadow-lg opacity-90"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              {homework.color && (
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm" 
                                  style={{ backgroundColor: homework.color }}
                                />
                              )}
                              <h3 className="font-semibold text-lg text-gray-800">{homework.title}</h3>
                            </div>
                            {homework.due_date && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-500 italic">
                                  Past due: {new Date(homework.due_date).toLocaleDateString('en-US')}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <BookOpen className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-700 text-lg font-semibold mb-2">No old word sets</p>
                        <p className="text-gray-500 text-sm">All word sets are currently active</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowWizardModal(false)}>
          <div className="relative">
            <div className="w-80 h-80 rounded-full border-8 border-purple-300 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden shadow-2xl">
              {wizardTitle.image ? (
                <img src={wizardTitle.image} alt={wizardTitle.title} className="w-72 h-72 rounded-full object-cover" />
              ) : (
                <Star className="w-32 h-32 text-purple-500" />
              )}
            </div>
            <button 
              className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
              onClick={() => setShowWizardModal(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showWordSetModal && selectedWordSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowWordSetModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{selectedWordSet.title}</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                onClick={() => setShowWordSetModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-4 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-lg">No words available</p>
                      <p className="text-gray-400 text-sm mt-2">This word set doesn't have any words yet</p>
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
                                  ? 'shadow-lg scale-110' 
                                  : 'opacity-60 hover:opacity-90 hover:scale-105'
                                }
                                cursor-pointer
                              `}
                              style={{
                                backgroundColor: colorHex,
                                border: isActive 
                                  ? `4px solid white`
                                  : '2px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: isActive 
                                  ? `0 10px 25px -5px ${colorHex}40, 0 0 0 4px white, 0 0 0 8px ${colorHex}30, inset 0 2px 4px rgba(0,0,0,0.1)`
                                  : '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                            >
                              {/* Grid number */}
                              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-white/90 text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                                {idx + 1}
                              </div>
                              {isActive && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                  <span className="text-green-600 text-xs font-bold">✓</span>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* Words for active tab - 6 words in 2 columns, 3 rows, no scroll */}
                    <div className="grid grid-cols-2 grid-rows-3 gap-3 flex-1 min-h-0">
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
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No words available</p>
                  <p className="text-gray-400 text-sm mt-2">This word set doesn't have any words yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Quest Bonus Notification */}
      {showBonusNotification && (
        <div className="fixed top-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-bold text-lg">All Quests Complete!</div>
              <div className="text-sm opacity-90">+100 XP Bonus earned!</div>
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
