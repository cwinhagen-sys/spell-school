'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, ArrowLeft, ArrowRight, Star, CheckCircle, XCircle, Send, Target } from 'lucide-react'
import { startGameSession, endGameSession, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateRouletteScore } from '@/lib/gameScoring'
import { supabase } from '@/lib/supabase'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

interface RouletteGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number, gameType?: string) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
}

type SpinMode = 1 | 2 | 3

interface SpunWord {
  word: string
  translation: string
}

export default function RouletteGame({ words, translations, onClose, onScoreUpdate, trackingContext, themeColor, gridConfig, sessionMode = false }: RouletteGameProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [gameFinished, setGameFinished] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [awardedPoints, setAwardedPoints] = useState(0)
  
  // Grid selector state - skip in session mode
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode)
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [gameWords, setGameWords] = useState<string[]>([]) // Swedish words (for matching)
  const [gameEnglishWords, setGameEnglishWords] = useState<string[]>([]) // English words (for display)
  const [gameTranslations, setGameTranslations] = useState<{ [key: string]: string }>({})
  
  // Game state
  const [spinMode, setSpinMode] = useState<SpinMode | null>(null)
  const [spinsRemaining, setSpinsRemaining] = useState(0)
  const [spunWords, setSpunWords] = useState<SpunWord[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentSentence, setCurrentSentence] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [showFinishButton, setShowFinishButton] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showContinueButton, setShowContinueButton] = useState(false)
  const [showWritingView, setShowWritingView] = useState(false)
  const [sentenceQuality, setSentenceQuality] = useState<'green' | 'yellow' | 'red' | null>(null) // Store sentence quality from AI analysis
  
  // Wheel animation
  const [wheelRotation, setWheelRotation] = useState(0)
  const [selectedWordIndex, setSelectedWordIndex] = useState(-1)
  const wheelRef = useRef<HTMLCanvasElement>(null)

  // Initialize words and translations from selected grids
  useEffect(() => {
    if (sessionMode && words && words.length > 0) {
      // In session mode, use words/translations directly (words are English)
      console.log('🎰 Roulette: Initializing in session mode with', words.length, 'words')
      setGameWords([]) // No Swedish words in session mode
      setGameEnglishWords([...words]) // English words for display
      setGameTranslations(translations)
      console.log('🎰 Roulette: Initialized in session mode with', words.length, 'English words')
    } else if (showGridSelector || selectedGrids.length === 0) {
      setGameWords([])
      setGameEnglishWords([])
      setGameTranslations({})
      return
    } else {
      console.log('🎰 Roulette: Building word list from', selectedGrids.length, 'grids')
      
      // Combine words and translations from selected grids
      const allWords: string[] = [] // Swedish words
      const allEnglishWords: string[] = [] // English words for display
      const allTranslations: { [key: string]: string } = {}
      
      selectedGrids.forEach((grid) => {
        allWords.push(...grid.words) // Swedish words
        Object.assign(allTranslations, grid.translations)
        
        // Convert Swedish words to English for display
        grid.words.forEach((swedishWord) => {
          const englishWord = grid.translations[swedishWord.toLowerCase()] || translations[swedishWord.toLowerCase()]
          if (englishWord && englishWord !== `[${swedishWord}]`) {
            allEnglishWords.push(englishWord)
          } else {
            // Fallback: assume word is already English
            allEnglishWords.push(swedishWord)
          }
        })
      })
      
      setGameWords(allWords) // Keep Swedish for matching
      setGameEnglishWords(allEnglishWords) // English for display
      setGameTranslations({ ...translations, ...allTranslations })
      console.log('🎰 Roulette: Initialized with', allWords.length, 'words (Swedish) and', allEnglishWords.length, 'words (English)')
    }
  }, [selectedGrids, showGridSelector, translations, sessionMode, words])

  // Get translation for a word
  const getTranslation = (word: string) => {
    if (gameTranslations && Object.keys(gameTranslations).length > 0) {
      return gameTranslations[word.toLowerCase()] || translations[word.toLowerCase()] || word
    }
    return translations[word.toLowerCase()] || word
  }

  // List of inappropriate words to block
  const inappropriateWords = [
    'fuck', 'shit', 'damn', 'hell', 'bitch', 'ass', 'crap', 'piss', 'bastard',
    'fucking', 'shitting', 'damned', 'hellish', 'bitching', 'asshole', 'crappy',
    'fan', 'jävla', 'helvete', 'skit', 'kuk', 'fitta', 'hora', 'idiot', 'dum',
    'jävlar', 'helvetes', 'skitig', 'kukig', 'fittig', 'horig', 'idiotisk', 'dumma'
  ]

  // Check if sentence contains inappropriate words
  const containsInappropriateWords = (sentence: string): boolean => {
    const lowerSentence = sentence.toLowerCase()
    return inappropriateWords.some(word => lowerSentence.includes(word))
  }

  // Auto-start game immediately when component mounts
  useEffect(() => {
    if (spinMode === null && !showGridSelector) {
      setSpinMode(1)
      setSpinsRemaining(1)
    }
  }, [spinMode, showGridSelector])

  // Initialize game session
  useEffect(() => {
    if (showGridSelector) return
    startedAtRef.current = Date.now()
    console.log('🎮 Roulette: Game started (session will be created server-side)')
    setSessionId(null)
  }, [trackingContext, showGridSelector])

  // Timer
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  // Draw wheel on canvas
  useEffect(() => {
    if (showGridSelector) return
    
    // Don't draw until words are properly initialized
    // In non-session mode, wait for selectedGrids to be set and gameEnglishWords to be populated
    if (!sessionMode && selectedGrids.length > 0 && gameEnglishWords.length === 0) {
      console.log('Waiting for words to be initialized from selected grids...')
      return
    }
    
    // In session mode, wait for words prop
    if (sessionMode && (!words || words.length === 0)) {
      console.log('Waiting for words in session mode...')
      return
    }
    
    const drawWheel = () => {
      const canvas = wheelRef.current
      if (!canvas) {
        console.log('Canvas not found, retrying...')
        return false
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.log('Canvas context not found')
        return false
      }

      // Use English words for display on the wheel
      // If we have selectedGrids, we MUST use gameEnglishWords (don't fallback to words prop)
      let wordsToUse: string[] = []
      if (!sessionMode && selectedGrids.length > 0) {
        // In grid selection mode, only use gameEnglishWords (from selected grids)
        wordsToUse = gameEnglishWords
      } else if (sessionMode) {
        // In session mode, use gameEnglishWords or words prop
        wordsToUse = gameEnglishWords.length > 0 ? gameEnglishWords : (words || [])
      } else {
        // Fallback: use gameEnglishWords, gameWords, or words prop
        wordsToUse = gameEnglishWords.length > 0 ? gameEnglishWords : (gameWords.length > 0 ? gameWords.map(w => getTranslation(w)) : (words || []))
      }
      
      // Don't draw if no words available
      if (wordsToUse.length === 0) {
        console.log('No words available to draw on wheel')
        return false
      }
      
      console.log('Drawing wheel with', wordsToUse.length, 'words (English):', wordsToUse)

      const colors = [
        '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#e67e22', '#16a085', '#c0392b', '#2ecc71',
        '#e74c3c', '#9b59b6', '#1abc9c', '#34495e', '#f1c40f', '#e67e22', '#95a5a6', '#2c3e50'
      ]
      const arc = (2 * Math.PI) / wordsToUse.length

      // Clear canvas
      ctx.clearRect(0, 0, 400, 400)

      // Draw segments - start from 3 o'clock (0 degrees) and go clockwise
      for (let i = 0; i < wordsToUse.length; i++) {
        const angle = i * arc // Start from 3 o'clock (0 degrees)
        const isSelected = selectedWordIndex === i && !isSpinning
        // Check if this English word has been used
        const isUsed = spunWords.some(spun => spun.word.toLowerCase() === wordsToUse[i].toLowerCase())
        
        // Draw segment
        ctx.beginPath()
        if (isSelected) {
          ctx.fillStyle = '#ff3b30' // Red for selected
        } else if (isUsed) {
          ctx.fillStyle = '#666666' // Gray for used words
        } else {
          ctx.fillStyle = colors[i % colors.length] // Normal colors for available words
        }
        ctx.moveTo(200, 200)
        ctx.arc(200, 200, 190, angle, angle + arc)
        ctx.lineTo(200, 200)
        ctx.fill()

        // Draw black border between segments
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw thick white border for selected segment
        if (isSelected) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 4
          ctx.stroke()
          
          // Add inner glow effect
          ctx.strokeStyle = '#ffdddd'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Draw text with sharper rendering
        ctx.save()
        ctx.translate(200, 200)
        ctx.rotate(angle + arc / 2)
        
        // Set text color based on state
        if (isSelected) {
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 18px Arial'
        } else if (isUsed) {
          ctx.fillStyle = '#cccccc' // Light gray for used words
          ctx.font = 'bold 16px Arial'
        } else {
          ctx.fillStyle = 'white'
          ctx.font = 'bold 16px Arial'
        }
        
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.imageSmoothingEnabled = false
        
        // Remove shadow for sharper text
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        const displayText = wordsToUse[i].length > 12 ? wordsToUse[i].substring(0, 12) + '...' : wordsToUse[i]
        ctx.fillText(displayText, 170, 0)
        ctx.restore() 
      }

      console.log('Wheel drawn successfully')
      return true
    }

    // Try to draw multiple times with increasing delays
    const tryDraw = () => {
      if (!drawWheel()) {
        setTimeout(tryDraw, 50)
      }
    }

    // Start trying to draw
    tryDraw()
  }, [gameWords, gameEnglishWords, words, selectedWordIndex, isSpinning, spunWords, showGridSelector, selectedGrids, sessionMode])

  // Validate sentence
  const validateSentence = (sentence: string): boolean => {
    const trimmed = sentence.trim()
    if (!trimmed) return false
    
    // Check if starts with capital letter and ends with proper punctuation
    const startsWithCapital = /^[A-ZÅÄÖ]/.test(trimmed)
    const endsWithPunctuation = /[.!?]$/.test(trimmed)
    
    return startsWithCapital && endsWithPunctuation
  }

  // Check if sentence contains all required words (including quotes and inflections)
  const containsRequiredWords = (sentence: string): boolean => {
    const lowerSentence = sentence.toLowerCase()
    return spunWords.every(spun => {
      // spun.word is now the English word (from the wheel)
      // spun.translation is the Swedish word (for reference)
      const englishWord = spun.word.toLowerCase()
      const swedishWord = spun.translation.toLowerCase()
      
      // Check for exact word match (English word is primary since it's on the wheel)
      if (lowerSentence.includes(englishWord) || lowerSentence.includes(swedishWord)) {
        return true
      }
      
      // Check for word with quotes around it
      if (lowerSentence.includes(`"${englishWord}"`) || lowerSentence.includes(`"${swedishWord}"`)) {
        return true
      }
      
      // Check for common inflections (basic word variations)
      const englishVariations = getWordVariations(englishWord)
      const swedishVariations = getWordVariations(swedishWord)
      
      return englishVariations.some(variation => lowerSentence.includes(variation)) ||
             swedishVariations.some(variation => lowerSentence.includes(variation))
    })
  }

  // Get common word variations/inflections
  const getWordVariations = (word: string): string[] => {
    const variations = [word]
    
    // Common English inflections
    if (word.endsWith('y')) {
      variations.push(word.slice(0, -1) + 'ier') // happy -> happier
      variations.push(word.slice(0, -1) + 'iest') // happy -> happiest
    }
    
    if (word.endsWith('e')) {
      variations.push(word + 'r') // nice -> nicer
      variations.push(word + 'st') // nice -> nicest
    }
    
    // Add -ing, -ed, -s variations for verbs
    variations.push(word + 'ing')
    variations.push(word + 'ed')
    variations.push(word + 's')
    
    // Add -er, -est for adjectives
    if (!word.endsWith('er') && !word.endsWith('est')) {
      variations.push(word + 'er')
      variations.push(word + 'est')
    }
    
    return variations
  }

  // Wheel rotation state
  const [currentAngle, setCurrentAngle] = useState(0)
  
  // Normalize degrees to 0-359 range
  const normalizeDeg = (d: number) => ((d % 360) + 360) % 360
  
  // Spin wheel to specific index
  const spinWheelToIndex = (idx: number, opts: { spins?: number, duration?: number, jitterRatio?: number } = {}) => {
    const { spins = 5, duration = 4500, jitterRatio = 0.25 } = opts
    // Use English words for wheel display (same length as Swedish words)
    const wordsToUse = gameEnglishWords.length > 0 ? gameEnglishWords : (gameWords.length > 0 ? gameWords.map(w => getTranslation(w)) : words)
    const n = wordsToUse.length
    const SEG_ANGLE = 360 / n
    const DRAW_OFFSET = 0 // Canvas standard 0° (3 o'clock)
    const POINTER_ANGLE = -90 // Pointer at 12 o'clock
    
    // Segment's center + jitter within segment
    const jitter = (Math.random() * 2 - 1) * (SEG_ANGLE * jitterRatio)
    const targetSegAngle = DRAW_OFFSET + idx * SEG_ANGLE + SEG_ANGLE/2 + jitter
    
    // Calculate final rotation - always start from 0 and add full spins for consistent speed
    const baseRotation = normalizeDeg(POINTER_ANGLE - targetSegAngle)
    const final = baseRotation + (360 * spins)
    
    // Apply rotation with CSS transition - always same duration for consistent speed
    const canvas = wheelRef.current
    if (canvas) {
      // Reset to 0 first for consistent starting point
      canvas.style.transition = 'none'
      canvas.style.transform = 'rotate(0deg)'
      
      // Force a reflow
      canvas.offsetHeight
      
      // Now apply the full rotation with transition
      canvas.style.willChange = 'transform'
      canvas.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`
      canvas.style.transform = `rotate(${final}deg)`
      
      const onEnd = () => {
        canvas.removeEventListener('transitionend', onEnd)
        setCurrentAngle(normalizeDeg(final))
        setWheelRotation(final)
      }
      canvas.addEventListener('transitionend', onEnd)
    }
  }

  // Spin the wheel
  const spinWheel = () => {
    if (isSpinning || spinsRemaining <= 0) return
    
    setIsSpinning(true)
    setFeedback(null)
    
    // Use English words for selection (they're displayed on the wheel)
    const wordsToUse = gameEnglishWords.length > 0 ? gameEnglishWords : (gameWords.length > 0 ? gameWords.map(w => getTranslation(w)) : words)
    
    // Get available words (not already selected) - use English words
    const usedWords = spunWords.map(spun => spun.word.toLowerCase())
    const availableWords = wordsToUse.filter(word => !usedWords.includes(word.toLowerCase()))
    
    // If no more words available, don't spin
    if (availableWords.length === 0) {
      setIsSpinning(false)
      return
    }
    
    // Random word selection from available English words
    const randomAvailableIndex = Math.floor(Math.random() * availableWords.length)
    const selectedEnglishWord = availableWords[randomAvailableIndex]
    
    // Find the index in the English words array (this is what's displayed on the wheel)
    const englishIndex = wordsToUse.findIndex(word => word.toLowerCase() === selectedEnglishWord.toLowerCase())
    
    // Find corresponding Swedish word for matching (if we have Swedish words)
    let selectedSwedishWord = selectedEnglishWord
    if (gameWords.length > 0 && englishIndex >= 0 && englishIndex < gameWords.length) {
      selectedSwedishWord = gameWords[englishIndex]
    }
    
    setSelectedWordIndex(englishIndex)
    
    // Spin to the selected index with consistent speed
    spinWheelToIndex(englishIndex, { spins: 5, duration: 4500, jitterRatio: 0.25 })
    
    // Wait for animation to complete
    setTimeout(() => {
      // Store English word (what's displayed) and its translation
      const newSpunWord: SpunWord = { word: selectedEnglishWord, translation: selectedSwedishWord }
      setSpunWords(prev => [...prev, newSpunWord])
      setSpinsRemaining(prev => prev - 1)
      setIsSpinning(false)
      setShowContinueButton(true)
    }, 4700) // Slightly longer than animation duration
  }



  // Submit sentence for AI analysis
  const submitSentence = async () => {
    // Check if already submitted
    if (hasSubmitted) {
      setFeedback({ type: 'error', message: 'You have already submitted your sentence. Please finish the game.' })
      return
    }

    if (!validateSentence(currentSentence)) {
      setFeedback({ type: 'error', message: 'Sentence must start with a capital letter and end with punctuation (. ! or ?)' })
      return
    }
    
    if (containsInappropriateWords(currentSentence)) {
      setFeedback({ type: 'error', message: 'Please use appropriate language in your sentence.' })
      return
    }
    
    if (!containsRequiredWords(currentSentence)) {
      setFeedback({ type: 'error', message: `Sentence must contain all words: ${spunWords.map(s => s.word).join(', ')}` })
      return
    }
    
    setIsSubmitting(true)
    setFeedback(null)
    
    try {
      // Call AI analysis API with improved prompt
      const response = await fetch('/api/analyze-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: currentSentence,
          requiredWords: spunWords,
          spinMode: 1
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze sentence')
      }
      
      const result = await response.json()
      
      // Store sentence quality for use in finishGame
      setSentenceQuality(result.color || 'red')
      
      // Use the new universal scoring system: Points based on sentence quality and word count
      const wordCount = currentSentence.trim().split(/\s+/).length
      const scoreResult = calculateRouletteScore(wordCount, result.quality, 0)
      
      setTotalScore(scoreResult.pointsAwarded)
      setAwardedPoints(scoreResult.pointsAwarded)
      
      // Store word count in localStorage for quest tracking BEFORE calling onScoreUpdate
      // CRITICAL: This must happen BEFORE onScoreUpdate to ensure quest system can read the data
      const today = new Date().toDateString()
      
      // Get user ID to match the quest system's localStorage key format
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous'
      const rouletteWordCountKey = `roulette_word_count_${today}_${userId}`
      
      const rouletteData = {
        wordCount,
        timestamp: Date.now(),
        isPerfect: result.color === 'green'
      }
      localStorage.setItem(rouletteWordCountKey, JSON.stringify(rouletteData))
      console.log('📝 Saved roulette data to localStorage:', { key: rouletteWordCountKey, data: rouletteData })
      
      // INSTANT UI UPDATE: Send points to parent for immediate UI update
      onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'roulette')
      
      // BACKGROUND SYNC: Update database in background (non-blocking)
      // NOTE: Database sync handled by handleScoreUpdate in student dashboard via onScoreUpdate
      // No need to call updateStudentProgress here to avoid duplicate sessions
      
      // Determine feedback type based on color
      let feedbackType = 'success'
      if (result.color === 'red') {
        feedbackType = 'error'
      } else if (result.color === 'yellow') {
        feedbackType = 'info'
      }
      
         setFeedback({ 
     type: feedbackType as 'success' | 'error' | 'info', 
     message: scoreResult.pointsAwarded === 0 ? result.feedback : `You earned ${scoreResult.pointsAwarded} points. ${result.feedback}` 
   })
      
      // Mark as submitted and show finish button
      setHasSubmitted(true)
      setShowFinishButton(true)
      
    } catch (error) {
      console.error('Error analyzing sentence:', error)
      setFeedback({ 
        type: 'error', 
        message: 'Unable to analyze sentence at this time. Points awarded for using all required words.' 
      })
      
      // Give some points anyway for completing the task
      const fallbackScore = 5
      setTotalScore(fallbackScore)
      setAwardedPoints(fallbackScore)
      
      // INSTANT UI UPDATE: Send fallback points to parent for immediate UI update
      onScoreUpdate(50, fallbackScore, 'roulette') // 50% quest score for fallback
      
      // Store sentence quality as red for fallback (not complete)
      setSentenceQuality('red')
      
      setShowFinishButton(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Finish game
  const finishGame = async () => {
    if (sessionMode) {
      // In session mode, pass correctAnswers and totalWords for percentage calculation
      // Roulette: only count as complete if sentence quality is 'green' (good)
      const totalWords = spunWords.length
      // Only count as correct if sentence quality is green, otherwise count as partially correct (0% for red/yellow means not complete)
      const correctWords = sentenceQuality === 'green' ? totalWords : 0
      onScoreUpdate(correctWords, totalWords, 'roulette')
      
      // Automatically return to game selection after a delay
      setTimeout(() => {
        onClose()
      }, 500)
      return
    }
    
    // NOTE: Database sync handled by handleScoreUpdate in student dashboard via onScoreUpdate
    // No need to call updateStudentProgress here to avoid duplicate sessions
    
    const started = startedAtRef.current
    if (started) {
      const durationSec = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'roulette', { 
        score: totalScore, 
        durationSec,
        accuracyPct: 100, // Roulette is always 100% if they complete the sentence
        details: { 
          spinMode: 1, 
          wordsUsed: spunWords.length,
          sentence: currentSentence
        } 
      })
    } else {
      void endGameSession(sessionId, 'roulette', { 
        score: totalScore,
        accuracyPct: 100, // Roulette is always 100% if they complete the sentence
        details: { 
          spinMode: 1, 
          wordsUsed: spunWords.length,
          sentence: currentSentence
        } 
      })
    }
    setGameFinished(true)
  }

  // Restart game
  const restartGame = () => {
    setShowGridSelector(true)
    setSpinMode(null)
    setSpinsRemaining(0)
    setSpunWords([])
    setIsSpinning(false)
    setCurrentSentence('')
    setIsSubmitting(false)
    setFeedback(null)
    setTotalScore(0)
    setWheelRotation(0)
    setCurrentAngle(0)
    setSelectedWordIndex(-1)
    setGameFinished(false)
    setShowContinueButton(false)
    setShowWritingView(false)
    setShowFinishButton(false)
    setHasSubmitted(false)
    setElapsedSec(0)
    startedAtRef.current = Date.now()
    console.log('🎮 Roulette: Game restarted (session will be created server-side)')
    setSessionId(null)
  }

  // Grid selector
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations || {}}
        onSelect={(grids) => {
          console.log('✅ Roulette: Grids selected', grids.length)
          setSelectedGrids(grids)
          setShowGridSelector(false)
        }}
        onClose={onClose}
        minGrids={1}
        maxGrids={undefined}
        wordsPerGrid={6}
        title="Select Color Grids"
        description="Choose any number of color grids to practice with"
        gridConfig={gridConfig}
      />
    )
  }

  // Game complete modal (not shown in session mode)
  if (gameFinished && !sessionMode) {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Calculate score for display
    const wordCount = currentSentence.trim().split(/\s+/).length
    const scoreResult = calculateRouletteScore(wordCount, 1, 0) // Assume perfect quality for display

    return (
      <UniversalGameCompleteModal
        score={awardedPoints}
        pointsAwarded={awardedPoints}
        gameType="roulette"
        accuracy={100} // Always 100% if they complete the sentence
        time={formatTime(elapsedSec)}
        details={{
          spinMode: 1,
          wordsUsed: spunWords.length,
          sentence: currentSentence
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        themeColor={themeColor}
      />
    )
  }

  // Mode selection screen - skip it, auto-start is handled in useEffect above
  if (!spinMode) {
    return null
  }

  // Main game screen
  return (
    <div className="fixed inset-0 bg-[#0a0a1a] p-4 z-50 overflow-y-auto">
      {/* Background effects */}
      
      {/* Writing View - Separate screen after all spins */}
      {showWritingView && spinsRemaining === 0 ? (
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 w-full max-w-3xl shadow-2xl border border-white/10 my-8 mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Write Your Sentence</h2>
                <p className="text-sm text-gray-400">Use all selected words</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
            >
              <span className="text-gray-400 text-xl">×</span>
            </button>
          </div>

          {/* Selected Words */}
          {spunWords.length > 0 && (
            <div className="mb-6 p-5 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-base font-semibold mb-3 text-white">
                Selected Words
              </h3>
              <div className="flex flex-wrap gap-2">
                {spunWords.map((spun, index) => (
                  <div key={index} className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    {spun.word}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentence Input */}
          <div className="mb-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4 text-white">
                Write a sentence using all selected words
              </h3>
              <div className="space-y-4">
                <textarea
                  value={currentSentence}
                  onChange={(e) => setCurrentSentence(e.target.value)}
                  placeholder="Write your sentence here..."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none focus:border-white/20 focus:ring-2 focus:ring-white/10 transition-all"
                  rows={4}
                />
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm font-medium">
                    {containsInappropriateWords(currentSentence) ? (
                      <span className="text-red-400">
                        Use appropriate language
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Start with a capital letter and end with punctuation
                      </span>
                    )}
                  </div>
                  <button
                    onClick={submitSentence}
                    disabled={!validateSentence(currentSentence) || isSubmitting || hasSubmitted || containsInappropriateWords(currentSentence)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-colors duration-150 flex items-center gap-2 ${
                      !validateSentence(currentSentence) || isSubmitting || hasSubmitted || containsInappropriateWords(currentSentence)
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                        : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Analyzing...' : hasSubmitted ? 'Submitted' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`p-5 rounded-xl mb-6 border ${
              feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' :
              feedback.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-100' :
              'bg-amber-500/10 border-amber-500/30 text-amber-100'
            }`}>
              <div className="text-base font-medium leading-relaxed">{feedback.message}</div>
              {showFinishButton && (
                <div className="text-center mt-4">
                  <button
                    onClick={finishGame}
                    className="bg-white/10 border border-white/20 text-white py-2.5 px-6 rounded-xl font-semibold hover:bg-white/20 transition-colors duration-150"
                  >
                    Finish Game
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Wheel View - Only wheel, no text or information */
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="flex items-center gap-8">
            {/* Wheel */}
            <div className="relative" style={{ width: '400px', height: '400px' }}>
              <style dangerouslySetInnerHTML={{__html: `
                .marker {
                  position: absolute;
                  top: -48px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 24px solid transparent;
                  border-right: 24px solid transparent;
                  border-top: 48px solid #f59e0b;
                  z-index: 10;
                  filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.5));
                }
              `}} />
              {/* Large pointer at 12 o'clock */}
              <div className="marker"></div>
              <canvas 
                ref={wheelRef}
                id="wheel" 
                className="wheel" 
                width="400" 
                height="400"
                onClick={spinWheel}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '8px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 0 30px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(0,0,0,0.2)',
                  transition: 'transform 4s cubic-bezier(0.25, 1, 0.5, 1)',
                  transform: `rotate(${wheelRotation}deg)`,
                  backgroundColor: 'rgba(18, 18, 42, 0.8)',
                  cursor: isSpinning ? 'not-allowed' : 'pointer'
                }}
              />
            </div>

            {/* Arrow button to proceed - Only show after spin is complete */}
            {!isSpinning && showContinueButton && (
              <button
                onClick={() => {
                  if (spinsRemaining === 0) {
                    setShowContinueButton(false)
                    setShowWritingView(true)
                  } else {
                    setShowContinueButton(false)
                  }
                }}
                className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center transition-all duration-150 text-white hover:scale-110"
              >
                <ArrowRight className="w-8 h-8" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
