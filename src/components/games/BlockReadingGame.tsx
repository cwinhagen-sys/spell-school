'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import React from 'react'
import { X, BookOpen, CheckCircle2, XCircle, Loader2, Volume2, VolumeX, Wand2, Book } from 'lucide-react'
import { startGameSession, endGameSession, type GameType, type TrackingContext } from '@/lib/tracking'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'
import GameCompleteModal from '@/components/GameCompleteModal'
import { titleForLevel } from '@/lib/wizardTitles'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface BlockReadingGameProps {
  words: string[]
  wordObjects?: Word[]
  translations?: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, total?: number, gameType?: string) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
}


interface ReadingText {
  text: string
  usedWords: string[] // Words from block that appear in text
  questions: Question[]
}

interface Question {
  id: string
  type: 'fact' | 'vocabulary' | 'inference'
  question: string
  correctAnswer: string
  options: string[] // Always 4 options
  explanation?: string // Explanation for why answer is correct
}

interface BlockProgress {
  [blockIndex: number]: {
    passed: boolean
    textsCompleted: number
    currentScore: number
    totalQuestions: number
  }
}

export default function BlockReadingGame({
  words,
  wordObjects,
  translations = {},
  onClose,
  onScoreUpdate,
  trackingContext,
  themeColor,
  gridConfig
}: BlockReadingGameProps) {
  const [showDifficultySelector, setShowDifficultySelector] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null) // Wizard level 1-100
  const [showGridSelector, setShowGridSelector] = useState(false)
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [currentText, setCurrentText] = useState<ReadingText | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({})
  const [questionFeedback, setQuestionFeedback] = useState<{ [questionId: string]: { isCorrect: boolean; explanation?: string } }>({})
  const [blockProgress, setBlockProgress] = useState<BlockProgress>({})
  const [gameFinished, setGameFinished] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [xpAnimations, setXpAnimations] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [waitingForClick, setWaitingForClick] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatusText, setLoadingStatusText] = useState('Generating reading text...')
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [selectedWord, setSelectedWord] = useState<{ word: string; x: number; y: number } | null>(null)
  const [wordExplanations, setWordExplanations] = useState<{ [word: string]: { en: string; sv?: string } }>({})
  const [useElevenLabs, setUseElevenLabs] = useState(true) // Toggle between ElevenLabs and browser TTS
  const [voiceAccent, setVoiceAccent] = useState<'american' | 'british'>('american')
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female')
  const [wands, setWands] = useState(3) // Power-up: translate any word
  const [tomes, setTomes] = useState(3) // Power-up: highlight answer sentence
  const [wandModeActive, setWandModeActive] = useState(false)
  const [highlightedSentences, setHighlightedSentences] = useState<{ [questionId: string]: number }>({}) // Map question ID to sentence index
  const [translatingWord, setTranslatingWord] = useState<string | null>(null) // Track which word is being translated
  const startedAtRef = useRef<number | null>(null)
  const xpAnimationIdRef = useRef(0)
  const totalXPRef = useRef(0)
  const audioRef = useRef<SpeechSynthesisUtterance | HTMLAudioElement | null>(null)
  const wordTooltipRef = useRef<HTMLDivElement | null>(null)
  const isPlayingElevenLabsRef = useRef(false) // Track if ElevenLabs is playing

  // Extract words from selected grids - convert Swedish words to English
  const blockWords = useMemo(() => {
    if (selectedGrids.length === 0) return []
    return selectedGrids.map(grid => {
      // Convert Swedish words to English using translations
      return grid.words.map((svWord: string) => {
        // Try to find English translation
        const translation = grid.translations[svWord.toLowerCase()] || translations[svWord.toLowerCase()]
        if (translation && translation !== `[${svWord}]`) {
          return translation
        }
        // If wordObjects available, try to find match
        const wordObj = wordObjects?.find(w => w.sv?.toLowerCase() === svWord.toLowerCase())
        return wordObj?.en || svWord
      }).filter(Boolean)
    })
  }, [selectedGrids, translations, wordObjects])

  // Start game session
  useEffect(() => {
    if (!showGridSelector && selectedGrids.length > 0 && !sessionId) {
      startGameSession('block_reading', trackingContext).then(session => {
        if (session) {
          setSessionId(session.id)
          startedAtRef.current = Date.now()
        }
      })
    }
  }, [showGridSelector, selectedGrids, sessionId, trackingContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any ongoing speech
      stopTextToSpeech()
      
      if (sessionId) {
        endGameSession(sessionId, 'block_reading', {
          score: 0,
          durationSec: 0,
          accuracyPct: 0
        }).catch(console.error)
      }
    }
  }, [sessionId])

  // Generate text for current block
  const handleContinue = () => {
    if (!currentText) return
    
    setWaitingForClick(false)
    
    if (currentQuestionIndex < currentText.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      // Clear feedback for next question, but keep answers
      setQuestionFeedback({})
    } else {
      // All questions answered, check if passed
      checkBlockCompletion()
    }
  }

  const generateTextForBlock = async (blockIdx: number) => {
    if (blockIdx >= blockWords.length) {
      finishGame()
      return
    }

    setLoading(true)
    setError(null)
    setQuestionFeedback({})
    setCurrentQuestionIndex(0)
    setCurrentText(null)
    setWaitingForClick(false)
    // Clear answers when starting a new block
    setAnswers({})
    // Reset highlighted sentences for new block
    setHighlightedSentences({})
    // Deactivate power-up modes
    setWandModeActive(false)
    
    // Reset loading progress
    setLoadingProgress(0)
    setLoadingStatusText('Generating reading text...')
    
    let progressInterval: NodeJS.Timeout | null = null
    let statusInterval: NodeJS.Timeout | null = null
    
    // Animate loading progress
    progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev
        return Math.min(prev + Math.random() * 15, 90)
      })
    }, 300)
    
    // Update status text
    statusInterval = setInterval(() => {
      setLoadingStatusText(prev => {
        const statuses = [
          'Charging spell...',
          'Aligning sentences...',
          'Mixing word potions...',
          'Weaving magic...',
          'Casting grammar...',
          'Brewing comprehension...'
        ]
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        return randomStatus !== prev ? randomStatus : prev
      })
    }, 1500)
    
    try {
      const wordsForBlock = blockWords[blockIdx]
      
      // Map CEFR level (1-10) to difficulty
      let difficulty: 'easy' | 'medium' | 'hard' = 'easy'
      let cefrLevel: number | undefined = undefined
      
      if (selectedDifficulty !== null) {
        const difficultyInfo = getDifficultyInfo(selectedDifficulty)
        difficulty = difficultyInfo.apiDifficulty
        cefrLevel = selectedDifficulty
      } else {
        // Fallback to old logic if no difficulty selected
        difficulty = blockIdx === 0 ? 'easy' : blockIdx === 1 ? 'medium' : 'hard'
      }

      const response = await fetch('/api/block-reading/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: wordsForBlock,
          blockIndex: blockIdx,
          difficulty,
          cefrLevel: cefrLevel || undefined // Send CEFR level (1-10) for precise difficulty
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate text')
      }

      const data = await response.json()
      
      if (progressInterval) clearInterval(progressInterval)
      if (statusInterval) clearInterval(statusInterval)
      setLoadingProgress(100)
      setLoadingStatusText('Complete!')
      
      setTimeout(() => {
        setLoading(false)
        setError(null)
        setCurrentText(data)
        setLoadingProgress(0)
      }, 500)
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval)
      if (statusInterval) clearInterval(statusInterval)
      console.error('Error generating text:', err)
      setError(err.message || 'Failed to generate reading text')
      setLoading(false)
      setLoadingProgress(0)
    }
  }

  // Load text when block changes
  useEffect(() => {
    if (!showGridSelector && selectedGrids.length > 0 && currentBlockIndex < selectedGrids.length) {
      generateTextForBlock(currentBlockIndex)
    }
  }, [currentBlockIndex, showGridSelector, selectedGrids])

  // Play sound effect
  const playSound = (type: 'correct' | 'wrong') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      if (type === 'correct') {
        // Pleasant chime for correct answer - play chord
        const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.type = 'sine'
          oscillator.frequency.value = freq
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3 + index * 0.05)
          
          oscillator.start(audioContext.currentTime + index * 0.05)
          oscillator.stop(audioContext.currentTime + 0.4)
        })
      } else {
        // Lower tone for wrong answer
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.type = 'sine'
        oscillator.frequency.value = 200
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      }
    } catch (e) {
      // Fallback if audio context fails
      console.log('Audio not available:', e)
    }
  }

  // Show XP animation
  const showXPAnimation = (x: number, y: number) => {
    const id = xpAnimationIdRef.current++
    setXpAnimations(prev => [...prev, { id, x, y }])
    
    // Remove animation after it completes
    setTimeout(() => {
      setXpAnimations(prev => prev.filter(anim => anim.id !== id))
    }, 2000)
  }

  const handleAnswer = (questionId: string, answer: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (!currentText) return
    
    const question = currentText.questions.find(q => q.id === questionId)
    if (!question) return
    
    const userAnswer = answer.toLowerCase().trim()
    const correctAnswer = question.correctAnswer.toLowerCase().trim()
    const isCorrect = userAnswer === correctAnswer
    
    // Play sound effect
    playSound(isCorrect ? 'correct' : 'wrong')
    
    // Show XP animation for correct answers
    if (isCorrect && event) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top
      showXPAnimation(x, y)
      
      // Award 3 XP immediately
      onScoreUpdate(100, 3, 'block_reading')
    }
    
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    
    // Always show explanation for wrong answers, optional for correct
    const explanation = isCorrect 
      ? question.explanation 
      : question.explanation || `The correct answer is "${question.correctAnswer}".`
    
    setQuestionFeedback(prev => ({
      ...prev,
      [questionId]: {
        isCorrect,
        explanation
      }
    }))
    
    // Wait for user click to continue
    setWaitingForClick(true)
  }

  const checkBlockCompletion = () => {
    if (!currentText) {
      console.warn('checkBlockCompletion called but no currentText')
      return
    }

    let correctCount = 0
    const totalQuestions = currentText.questions.length

    // Check all questions
    currentText.questions.forEach(q => {
      const userAnswer = answers[q.id]?.toLowerCase().trim()
      const correctAnswer = q.correctAnswer.toLowerCase().trim()
      
      if (userAnswer && userAnswer === correctAnswer) {
        correctCount++
      }
    })

    // If not all questions are answered yet, wait
    const answeredCount = Object.keys(answers).length
    if (answeredCount < totalQuestions) {
      console.log(`Waiting for more answers: ${answeredCount}/${totalQuestions}`)
      return
    }

    const percentage = (correctCount / totalQuestions) * 100
    const passed = percentage >= 50 // 50% to pass

    console.log(`Block completion check: ${correctCount}/${totalQuestions} (${Math.round(percentage)}%) - ${passed ? 'PASSED' : 'FAILED'}`)

    // Update block progress
    setBlockProgress(prev => ({
      ...prev,
      [currentBlockIndex]: {
        passed,
        textsCompleted: (prev[currentBlockIndex]?.textsCompleted || 0) + 1,
        currentScore: correctCount,
        totalQuestions
      }
    }))

    if (passed) {
      // Award 10 XP for completing this block
      const blockXP = 10
      totalXPRef.current += blockXP
      onScoreUpdate(100, blockXP, 'block_reading')
      
      // Clear answers before moving to next block
      setAnswers({})
      setQuestionFeedback({})
      setWaitingForClick(false)
      
      // Show success message briefly, then move to next block
      setTimeout(() => {
        if (currentBlockIndex < selectedGrids.length - 1) {
          setCurrentBlockIndex(prev => prev + 1)
        } else {
          // All blocks completed
          finishGame()
        }
      }, 1500)
    } else {
      // Less than 50% - end session
      setError(`You got ${correctCount}/${totalQuestions} correct (${Math.round(percentage)}%). You need 50% to continue. Session ended.`)
      setTimeout(() => {
        finishGame()
      }, 3000)
    }
  }

  const finishGame = () => {
    setGameFinished(true)
    
    // Calculate completed blocks
    const completedBlocks = Object.values(blockProgress).filter(p => p.passed).length
    const totalXP = totalXPRef.current

    // Calculate accuracy for display
    let totalScore = 0
    let totalQuestions = 0
    
    Object.values(blockProgress).forEach(progress => {
      totalScore += progress.currentScore
      totalQuestions += progress.totalQuestions
    })

    // Add current block score if not yet saved
    if (currentText && currentQuestionIndex >= currentText.questions.length - 1) {
      let correctCount = 0
      currentText.questions.forEach(q => {
        const userAnswer = answers[q.id]?.toLowerCase().trim()
        const correctAnswer = q.correctAnswer.toLowerCase().trim()
        if (userAnswer === correctAnswer) correctCount++
      })
      totalScore += correctCount
      totalQuestions += currentText.questions.length
    }

    const finalScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

    const started = startedAtRef.current
    if (sessionId) {
      const duration = started ? Math.max(1, Math.floor((Date.now() - started) / 1000)) : 0
      const completedBlocks = Object.values(blockProgress).filter(p => p.passed).length
      
      console.log('💾 Saving Block Reading session:', {
        sessionId,
        finalScore,
        duration,
        completedBlocks,
        totalQuestions,
        totalScore
      })
      
      void endGameSession(sessionId, 'block_reading', {
        score: finalScore,
        durationSec: duration,
        accuracyPct: finalScore,
        details: {
          blocksCompleted: completedBlocks,
          totalQuestions,
          totalCorrect: totalScore,
          blockProgress: blockProgress
        }
      }).catch(err => {
        console.error('❌ Failed to end Block Reading session:', err)
      })
    } else {
      console.warn('⚠️ Block Reading: No sessionId available, cannot save session')
    }

    setShowResults(true)
  }

  // Stop text-to-speech (both ElevenLabs and browser TTS)
  const stopTextToSpeech = () => {
    // Stop browser TTS
    window.speechSynthesis.cancel()
    
    // Stop HTML5 audio (ElevenLabs)
    const audio = document.querySelector('audio[data-elevenlabs]') as HTMLAudioElement
    if (audio) {
      audio.pause()
      audio.remove()
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src)
      }
    }
    
    setIsPlayingAudio(false)
    audioRef.current = null
    isPlayingElevenLabsRef.current = false
  }

  // Play text-to-speech using ElevenLabs or browser fallback
  const playTextToSpeech = async () => {
    if (!currentText) return
    
    // Stop any ongoing speech first
    stopTextToSpeech()
    
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check if we're already playing (prevent double calls)
    if (isPlayingAudio || isPlayingElevenLabsRef.current) {
      return
    }
    
    setIsPlayingAudio(true)
    
    // Try ElevenLabs first if enabled
    if (useElevenLabs) {
      try {
        // Mark that we're using ElevenLabs
        isPlayingElevenLabsRef.current = true
        
        // Select voice based on accent and gender
        // American voices (verified free tier voices)
        const americanVoices = {
          female: '21m00Tcm4TlvDq8ikWAM', // Rachel - American female
          male: 'pNInz6obpgDQGcFmaJgB' // Adam - American male
        }
        // British voices (using available voices - may need actual British voice IDs)
        // Note: These are placeholder IDs. For true British accents, you may need to:
        // 1. Check ElevenLabs voice library for British voices
        // 2. Create custom voices with British accent
        // 3. Use voice cloning if available on your plan
        const britishVoices = {
          female: 'EXAVITQu4vr4xnSDxMaL', // Bella - Using as placeholder (may not be British)
          male: 'ThT5KcBeYPX3keUQqHPh' // Using as placeholder (may not be British)
        }
        
        const voiceMap = {
          american: americanVoices,
          british: britishVoices
        }
        
        const voiceId = voiceMap[voiceAccent][voiceGender]
        
        // Call ElevenLabs API
        const response = await fetch('/api/tts/elevenlabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: currentText.text,
            voice_id: voiceId,
            stability: 0.5,
            similarity_boost: 0.75,
            speed: speechRate
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to generate speech')
        }
        
        // Create audio from blob
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        audio.setAttribute('data-elevenlabs', 'true')
        
        // Set playback rate (ElevenLabs speed parameter already applied, but we can adjust)
        audio.playbackRate = speechRate
        
        audio.onended = () => {
          setIsPlayingAudio(false)
          URL.revokeObjectURL(audioUrl)
          audio.remove()
          isPlayingElevenLabsRef.current = false
        }
        
        audio.onerror = () => {
          setIsPlayingAudio(false)
          URL.revokeObjectURL(audioUrl)
          audio.remove()
          isPlayingElevenLabsRef.current = false
        }
        
        await audio.play()
        
        // Store reference for cleanup
        audioRef.current = audio
        
        // Success - return early, don't fall through to browser TTS
        return
      } catch (error) {
        console.warn('ElevenLabs TTS error, falling back to browser TTS:', error)
        isPlayingElevenLabsRef.current = false
        // Fall through to browser TTS fallback
      }
    }
    
    // Only use browser TTS if ElevenLabs is disabled or failed
    // Double-check that ElevenLabs isn't playing
    if (isPlayingElevenLabsRef.current) {
      return
    }
    
    // Fallback to browser TTS
    const utterance = new SpeechSynthesisUtterance(currentText.text)
    utterance.lang = 'en-US'
    utterance.rate = speechRate
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsPlayingAudio(false)
      audioRef.current = null
      isPlayingElevenLabsRef.current = false
    }
    
    utterance.onerror = () => {
      setIsPlayingAudio(false)
      audioRef.current = null
      isPlayingElevenLabsRef.current = false
    }
    
    audioRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Update speech rate if audio is playing (for browser TTS only)
  // For ElevenLabs, we update playbackRate directly in the input handler
  useEffect(() => {
    if (isPlayingAudio && currentText && !isPlayingElevenLabsRef.current && audioRef.current instanceof SpeechSynthesisUtterance) {
      // Only restart browser TTS if it's playing (not ElevenLabs)
      // For ElevenLabs, playbackRate is updated directly via audio.playbackRate
      stopTextToSpeech()
      playTextToSpeech()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechRate])

  // Extract all words from text that can be clicked for translation
  const extractClickableWords = (text: string, usedWords: string[]): string[] => {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || []
    const usedWordsLower = usedWords.map(w => w.toLowerCase())
    const clickableWords: string[] = []
    const seen = new Set<string>()
    
    for (const word of words) {
      const wordLower = word.toLowerCase()
      
      // Skip if already added
      if (seen.has(wordLower)) continue
      seen.add(wordLower)
      
      // Skip very common words that don't need translation
      const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here', 'where', 'when', 'what', 'who', 'which', 'how', 'why', 'he', 'she', 'his', 'her', 'him', 'we', 'our', 'us', 'you', 'your', 'i', 'my', 'me']
      if (commonWords.includes(wordLower)) continue
      
      // Add word if it has a translation available OR if it's from the word list
      const hasTranslation = translations[wordLower] && translations[wordLower] !== `[${word}]`
      const isInWordList = usedWordsLower.includes(wordLower)
      const wordObj = wordObjects?.find(w => w.en?.toLowerCase() === wordLower)
      
      if (hasTranslation || isInWordList || wordObj?.sv) {
        clickableWords.push(wordLower)
      }
    }
    
    return clickableWords
  }

  // Generate word translations for clickable words
  useEffect(() => {
    if (!currentText) return
    
    const clickableWords = extractClickableWords(currentText.text, currentText.usedWords || [])
    
    // Build translations map
    const wordTranslations: { [word: string]: { sv?: string } } = {}
    
    for (const word of clickableWords) {
      // Try to find Swedish translation
      const translation = translations[word.toLowerCase()]
      if (translation && translation !== `[${word}]`) {
        wordTranslations[word] = { sv: translation }
      } else {
        // Try to find in wordObjects
        const wordObj = wordObjects?.find(w => w.en?.toLowerCase() === word.toLowerCase())
        if (wordObj?.sv) {
          wordTranslations[word] = { sv: wordObj.sv }
        }
      }
    }
    
    setWordExplanations(wordTranslations)
  }, [currentText, translations, wordObjects])

  // Handle word click - show Swedish translation
  const handleWordClick = async (word: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const wordLower = word.toLowerCase().replace(/[.,!?;:]/g, '').trim()
    
    // Skip empty words
    if (!wordLower || wordLower.length === 0) {
      console.log('Skipping empty word:', word)
      return
    }
    
    console.log('Word clicked:', wordLower, 'wandModeActive:', wandModeActive, 'wands:', wands)
    
    // If wand mode is active, translate any word (if wands available)
    if (wandModeActive && wands > 0) {
      console.log('Translating word with wand:', wordLower)
      // Try to find translation locally first
      let translation: string | undefined
      
      // Check translations
      if (translations[wordLower] && translations[wordLower] !== `[${wordLower}]`) {
        translation = translations[wordLower]
      } else {
        // Check wordObjects
        const wordObj = wordObjects?.find(w => w.en?.toLowerCase() === wordLower)
        if (wordObj?.sv) {
          translation = wordObj.sv
        }
      }
      
      // If no local translation found, use API
      if (!translation) {
        setTranslatingWord(wordLower)
        try {
          // Find context sentence where word appears
          const sentences = currentText?.text.split(/[.!?]+/).filter(s => s.trim().length > 0) || []
          const contextSentence = sentences.find(s => 
            s.toLowerCase().includes(wordLower)
          )?.trim() || undefined
          
          const response = await fetch('/api/block-reading/translate-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              word: wordLower,
              context: contextSentence
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            translation = data.translation
          }
        } catch (error) {
          console.warn(`Failed to translate "${wordLower}":`, error)
        } finally {
          setTranslatingWord(null)
        }
      }
      
      if (translation) {
        // Use wand
        setWands(prev => prev - 1)
        setWandModeActive(false)
        
        // Get position from event target or currentTarget
        const target = (event.currentTarget || event.target) as HTMLElement
        if (target) {
          const rect = target.getBoundingClientRect()
          setSelectedWord({
            word: wordLower,
            x: rect.left + rect.width / 2,
            y: rect.top
          })
        } else {
          // Fallback: use mouse position
          setSelectedWord({
            word: wordLower,
            x: event.clientX,
            y: event.clientY
          })
        }
        
        // Temporarily add to wordExplanations for display
        setWordExplanations(prev => ({
          ...prev,
          [wordLower]: { sv: translation }
        }))
      } else {
        // No translation found - still consume wand but show message
        setWands(prev => prev - 1)
        setWandModeActive(false)
        // Could show a message that translation not available
      }
      return
    }
    
    // Normal click - only if word has translation available
    if (wordExplanations[wordLower] && wordExplanations[wordLower].sv) {
      const target = (event.currentTarget || event.target) as HTMLElement
      if (target) {
        const rect = target.getBoundingClientRect()
        setSelectedWord({
          word: wordLower,
          x: rect.left + rect.width / 2,
          y: rect.top
        })
      } else {
        // Fallback: use mouse position
        setSelectedWord({
          word: wordLower,
          x: event.clientX,
          y: event.clientY
        })
      }
    }
  }

  // Handle tome click for a specific question - find and highlight the sentence with the answer
  const handleTomeClick = (questionId: string, correctAnswer: string) => {
    if (tomes === 0 || !currentText) return
    
    // Split text into sentences
    const sentenceParts = currentText.text.split(/([.!?]+)/)
    const sentences: string[] = []
    for (let i = 0; i < sentenceParts.length; i += 2) {
      if (sentenceParts[i]) {
        sentences.push(sentenceParts[i] + (sentenceParts[i + 1] || ''))
      }
    }
    
    // Find sentence that contains the answer
    const answerLower = correctAnswer.toLowerCase().trim()
    const answerWords = answerLower.split(/\s+/)
    
    // Try to find sentence containing the answer
    let foundSentenceIndex = -1
    
    // First, try exact match
    for (let i = 0; i < sentences.length; i++) {
      const sentenceLower = sentences[i].toLowerCase()
      if (sentenceLower.includes(answerLower)) {
        foundSentenceIndex = i
        break
      }
    }
    
    // If no exact match, try matching individual words
    if (foundSentenceIndex === -1) {
      for (let i = 0; i < sentences.length; i++) {
        const sentenceLower = sentences[i].toLowerCase()
        const matches = answerWords.filter(word => sentenceLower.includes(word))
        // If at least 50% of answer words are in the sentence
        if (matches.length >= Math.ceil(answerWords.length * 0.5)) {
          foundSentenceIndex = i
          break
        }
      }
    }
    
    // If still not found, use first sentence as fallback
    if (foundSentenceIndex === -1 && sentences.length > 0) {
      foundSentenceIndex = 0
    }
    
    if (foundSentenceIndex >= 0) {
      setTomes(prev => prev - 1)
      setHighlightedSentences(prev => ({
        ...prev,
        [questionId]: foundSentenceIndex
      }))
    }
  }

  // Close word tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wordTooltipRef.current && !wordTooltipRef.current.contains(event.target as Node)) {
        setSelectedWord(null)
      }
    }
    
    if (selectedWord) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedWord])

  // Highlight words in text that are from the block
  const highlightWordsInText = (text: string, usedWords: string[]): React.ReactNode => {
    if (!usedWords || usedWords.length === 0) {
      return <span>{text}</span>
    }

    // Split text into sentences first
    const sentenceParts = text.split(/([.!?]+)/)
    const sentences: string[] = []
    for (let i = 0; i < sentenceParts.length; i += 2) {
      if (sentenceParts[i]) {
        sentences.push(sentenceParts[i] + (sentenceParts[i + 1] || ''))
      }
    }
    
    const usedWordsLower = usedWords.map(w => w.toLowerCase())
    const complexWordsLower = Object.keys(wordExplanations).map(w => w.toLowerCase())

    return (
      <>
        {sentences.map((sentence, sentenceIndex) => {
          // Check if this sentence should be highlighted (tome power-up)
          // Check if any question has highlighted this sentence
          const isHighlighted = currentText ? Object.values(highlightedSentences).includes(sentenceIndex) : false
          
          // Split sentence into words while preserving punctuation and whitespace
          const words = sentence.split(/(\s+|[.,!?;:])/)
          
          return (
            <span
              key={`sentence-${sentenceIndex}`}
              className={isHighlighted ? 'bg-yellow-300 px-2 py-1 rounded-lg block my-1 transition-all' : ''}
            >
              {words.map((word, wordIndex) => {
                // Handle whitespace and punctuation first
                if (/^\s+$/.test(word) || /^[.,!?;:]$/.test(word)) {
                  return <span key={`sep-${sentenceIndex}-${wordIndex}`}>{word}</span>
                }
                
                const wordClean = word.toLowerCase().replace(/[.,!?;:]/g, '').trim()
                
                // Skip empty words
                if (!wordClean || wordClean.length === 0) {
                  return <span key={`empty-${sentenceIndex}-${wordIndex}`}>{word}</span>
                }
                
                const isUsedWord = usedWordsLower.includes(wordClean)
                const isComplexWord = complexWordsLower.includes(wordClean)
                
                // Priority: wand mode makes ALL words clickable
                if (wandModeActive && wands > 0) {
                  if (isUsedWord) {
                    // Highlighted word with wand cursor
                    return (
                      <mark
                        key={`highlight-wand-${sentenceIndex}-${wordIndex}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleWordClick(wordClean, e)
                        }}
                        className="bg-yellow-200 text-yellow-900 px-1 rounded font-semibold cursor-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a855f7\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M15 4V2\'/%3E%3Cpath d=\'M15 16v-2\'/%3E%3Cpath d=\'M8 9h2\'/%3E%3Cpath d=\'M20 9h2\'/%3E%3Cpath d=\'M17.8 11.2l-1.4-1.4\'/%3E%3Cpath d=\'M6.6 22.4l-1.4-1.4\'/%3E%3Cpath d=\'M6.6 1.6l-1.4 1.4\'/%3E%3Cpath d=\'M17.8 13.8l-1.4 1.4\'/%3E%3Cpath d=\'M9 7l-5 5c-1 1-1 2.5 0 3.5s2.5 1 3.5 0l5-5\'/%3E%3Cpath d=\'M15 7l5 5c1 1 1 2.5 0 3.5s-2.5 1-3.5 0l-5-5\'/%3E%3C/svg%3E'),pointer] hover:bg-yellow-300 transition-colors"
                        title="Klicka med wand för översättning"
                      >
                        {word}
                      </mark>
                    )
                  } else {
                    // Regular word with wand cursor
                    return (
                      <span
                        key={`wand-${sentenceIndex}-${wordIndex}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('Regular word clicked in wand mode:', wordClean)
                          handleWordClick(wordClean, e)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="cursor-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a855f7\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M15 4V2\'/%3E%3Cpath d=\'M15 16v-2\'/%3E%3Cpath d=\'M8 9h2\'/%3E%3Cpath d=\'M20 9h2\'/%3E%3Cpath d=\'M17.8 11.2l-1.4-1.4\'/%3E%3Cpath d=\'M6.6 22.4l-1.4-1.4\'/%3E%3Cpath d=\'M6.6 1.6l-1.4 1.4\'/%3E%3Cpath d=\'M17.8 13.8l-1.4 1.4\'/%3E%3Cpath d=\'M9 7l-5 5c-1 1-1 2.5 0 3.5s2.5 1 3.5 0l5-5\'/%3E%3Cpath d=\'M15 7l5 5c1 1 1 2.5 0 3.5s-2.5 1-3.5 0l-5-5\'/%3E%3C/svg%3E'),pointer] hover:bg-purple-50 px-0.5 rounded transition-colors select-none"
                        title="Klicka med wand för översättning"
                        style={{ userSelect: 'none' }}
                      >
                        {word}
                      </span>
                    )
                  }
                }
                
                // Normal rendering when wand is not active
                if (isUsedWord) {
                  return (
                    <mark
                      key={`highlight-${sentenceIndex}-${wordIndex}`}
                      className="bg-yellow-200 text-yellow-900 px-1 rounded font-semibold"
                    >
                      {word}
                    </mark>
                  )
                } else if (isComplexWord) {
                  return (
                    <span
                      key={`complex-${sentenceIndex}-${wordIndex}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleWordClick(wordClean, e)
                      }}
                      className="cursor-pointer underline decoration-dotted decoration-purple-400 hover:bg-purple-50 px-0.5 rounded transition-colors"
                      title="Klicka för svensk översättning"
                    >
                      {word}
                    </span>
                  )
                } else {
                  return <span key={`text-${sentenceIndex}-${wordIndex}`}>{word}</span>
                }
              })}
            </span>
          )
        })}
      </>
    )
  }

  const handleGridSelected = (grids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    if (grids.length === 0) {
      setError('Please select at least one block')
      return
    }
    setSelectedGrids(grids)
    setShowGridSelector(false)
    setCurrentBlockIndex(0)
    // Reset power-ups for new game
    setWands(3)
    setTomes(3)
    setWandModeActive(false)
    setHighlightedSentences({})
  }

  // CEFR difficulty levels (10 levels total)
  const CEFR_LEVELS = [
    { level: 1, cefr: 'A1', name: 'Beginner', description: 'Kort, enkel och konkret. Vardagliga ord och uttryck. Korta meningar.' },
    { level: 2, cefr: 'A2', name: 'Elementary', description: 'Kortare stycken (2–3 meningar). Enkla sekvenser. Vardagliga ämnen.' },
    { level: 3, cefr: 'B1.1', name: 'Intermediate', description: 'Längre textblock (4–6 meningar). Flera idéer. Grundläggande narrativa strukturer.' },
    { level: 4, cefr: 'B1.2', name: 'Intermediate+', description: 'Mer sammanhängande texter. Förklaringar och enklare argument.' },
    { level: 5, cefr: 'B2.1', name: 'Upper Intermediate', description: 'Djupare resonemang. Mer variation i ordförråd och meningsbyggnad.' },
    { level: 6, cefr: 'B2.2', name: 'Upper Intermediate+', description: 'Komplexa texter. Argument utvecklas stegvis. Abstrakta ämnen.' },
    { level: 7, cefr: 'C1.1', name: 'Advanced', description: 'Långformstexter. Komplex meningsbyggnad. Abstrakta idéer.' },
    { level: 8, cefr: 'C1.2', name: 'Advanced+', description: 'Tekniska texter. Specialiserat språk. Ironi och nyanserad ton.' },
    { level: 9, cefr: 'C2.1', name: 'Mastery', description: 'Mycket komplexa texter. Subtil stil. Avancerade idiom och metaforer.' },
    { level: 10, cefr: 'C2.2', name: 'Mastery+', description: 'Vetenskapliga artiklar. Litterära verk. Djupt resonemang.' }
  ]

  // Helper function to map difficulty level to CEFR and API difficulty
  const getDifficultyInfo = (level: number): { cefr: string; apiDifficulty: 'easy' | 'medium' | 'hard'; name: string } => {
    const cefrLevel = CEFR_LEVELS.find(l => l.level === level) || CEFR_LEVELS[0]
    
    // Map to API difficulty
    let apiDifficulty: 'easy' | 'medium' | 'hard' = 'easy'
    if (level <= 2) {
      apiDifficulty = 'easy' // A1-A2
    } else if (level <= 6) {
      apiDifficulty = 'medium' // B1-B2
    } else {
      apiDifficulty = 'hard' // C1-C2
    }
    
    return {
      cefr: cefrLevel.cefr,
      apiDifficulty,
      name: cefrLevel.name
    }
  }

  // Difficulty selector screen
  if (showDifficultySelector) {
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Choose Difficulty Level</h2>
                <p className="text-sm text-gray-600 mt-1">Select a wizard to set the difficulty of your reading texts</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-4">
              {CEFR_LEVELS.map((cefrLevel) => {
                // Map level to wizard image (use milestone levels: 1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
                const wizardImageLevel = cefrLevel.level === 1 ? 1 : cefrLevel.level * 10
                const wizard = titleForLevel(wizardImageLevel)
                const isSelected = selectedDifficulty === cefrLevel.level
                const difficultyInfo = getDifficultyInfo(cefrLevel.level)
                
                return (
                  <button
                    key={cefrLevel.level}
                    onClick={() => setSelectedDifficulty(cefrLevel.level)}
                    className={`relative group flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 hover:shadow-md'
                    }`}
                  >
                    <div className="relative w-20 h-20 mb-3">
                      {wizard.image ? (
                        <img
                          src={wizard.image}
                          alt={wizard.title || `Level ${cefrLevel.level}`}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            // Fallback to emoji if image fails
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.fallback-emoji')) {
                              const emoji = document.createElement('div')
                              emoji.className = 'fallback-emoji text-4xl'
                              emoji.textContent = '🪄'
                              parent.appendChild(emoji)
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-3xl">
                          🪄
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-800 mb-1">{cefrLevel.cefr}</div>
                    <div className={`text-xs text-center leading-tight mb-1 ${
                      isSelected ? 'text-purple-600 font-semibold' : 'text-gray-600'
                    }`}>
                      {cefrLevel.name}
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-64">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-4 py-3 shadow-lg">
                        <div className="font-semibold text-sm mb-1">{cefrLevel.cefr} - {cefrLevel.name}</div>
                        <div className="text-gray-300 text-xs leading-relaxed">{cefrLevel.description}</div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedDifficulty !== null && (() => {
                  const cefrLevel = CEFR_LEVELS.find(l => l.level === selectedDifficulty)!
                  return (
                    <span>
                      Selected: <span className="font-semibold text-purple-600">
                        {cefrLevel.cefr} - {cefrLevel.name}
                      </span>
                    </span>
                  )
                })()}
              </div>
              <button
                onClick={() => {
                  if (selectedDifficulty !== null) {
                    setShowDifficultySelector(false)
                    setShowGridSelector(true)
                  }
                }}
                disabled={selectedDifficulty === null}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedDifficulty !== null
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showGridSelector) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                Block Reading
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Select the color blocks you want to practice with. Each block represents a reading level with increasing difficulty.
            </p>
            <ColorGridSelector
              words={words}
              translations={translations}
              onSelect={handleGridSelected}
              gridConfig={gridConfig}
              minGrids={1}
            />
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    const totalBlocks = selectedGrids.length
    const completedBlocks = Object.values(blockProgress).filter(p => p.passed).length
    const totalScore = Object.values(blockProgress).reduce((sum, p) => sum + p.currentScore, 0)
    const totalQuestions = Object.values(blockProgress).reduce((sum, p) => sum + p.totalQuestions, 0)
    const finalPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

    return (
      <GameCompleteModal
        score={finalPercentage}
        accuracy={finalPercentage}
        onPlayAgain={() => {
          setShowDifficultySelector(true)
          setSelectedDifficulty(null)
          setShowGridSelector(false)
          setSelectedGrids([])
          setCurrentBlockIndex(0)
          setCurrentText(null)
          setAnswers({})
          setQuestionFeedback({})
          setBlockProgress({})
          setGameFinished(false)
          setShowResults(false)
          setError(null)
          setWaitingForClick(false)
          setWands(3)
          setTomes(3)
          setWandModeActive(false)
          setHighlightedSentences({})
          totalXPRef.current = 0
          if (sessionId) {
            endGameSession(sessionId, 'block_reading', {
              score: finalPercentage,
              durationSec: startedAtRef.current ? Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)) : 0,
              accuracyPct: finalPercentage
            }).catch(console.error)
          }
          setSessionId(null)
          startedAtRef.current = null
        }}
        onBackToDashboard={onClose}
        gameType="block_reading"
        details={{
          blocksCompleted: completedBlocks,
          totalBlocks: totalBlocks,
          xpEarned: totalXP,
          totalQuestions: totalQuestions,
          correctAnswers: totalScore
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 z-50 flex items-center justify-center p-4">
      {/* XP Animation Overlay */}
      {xpAnimations.map(anim => (
        <div
          key={anim.id}
          className="fixed pointer-events-none z-[60] animate-xp-float"
          style={{
            left: `${anim.x}px`,
            top: `${anim.y}px`
          }}
        >
          <div className="text-2xl font-bold text-purple-600 bg-white/90 px-3 py-1 rounded-lg shadow-lg border-2 border-purple-300">
            +3 XP
          </div>
        </div>
      ))}
      
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Block Reading
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {selectedGrids.map((grid, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    idx === currentBlockIndex
                      ? `${grid.colorScheme.bg} ${grid.colorScheme.border} border-2`
                      : blockProgress[idx]?.passed
                      ? 'bg-green-100 border-2 border-green-400'
                      : 'bg-gray-100 border border-gray-300'
                  }`}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
            {/* Progress Bar */}
            {selectedGrids.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Progress</span>
                  <span className="font-semibold">{currentBlockIndex + 1} / {selectedGrids.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${((currentBlockIndex + 1) / selectedGrids.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full border-8 border-purple-200"></div>
                <div 
                  className="absolute inset-0 rounded-full border-8 border-purple-600 border-t-transparent animate-spin"
                  style={{ 
                    clipPath: `inset(0 ${100 - loadingProgress}% 0 0)`,
                    transition: 'clip-path 0.3s ease'
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🧪</span>
                </div>
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">{loadingStatusText}</p>
              <p className="text-gray-400 text-sm">{Math.round(loadingProgress)}%</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          ) : currentText ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Settings Bar - Top */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200 shadow-sm flex-shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Progress Boxes */}
                  <div className="flex items-center gap-2">
                    {selectedGrids.map((grid, idx) => (
                      <div
                        key={idx}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                          idx === currentBlockIndex
                            ? `${grid.colorScheme.bg} ${grid.colorScheme.border} border-2 shadow-md scale-110`
                            : blockProgress[idx]?.passed
                            ? 'bg-green-100 border-2 border-green-400 shadow-sm'
                            : 'bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {idx + 1}
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  {selectedGrids.length > 0 && (
                    <div className="flex-1 min-w-[200px] max-w-md">
                      <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                        <span>Progress</span>
                        <span className="font-semibold">{currentBlockIndex + 1} / {selectedGrids.length}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${((currentBlockIndex + 1) / selectedGrids.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Power-ups and Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Wand Power-up */}
                    <button
                      onClick={() => {
                        if (wands > 0 && !wandModeActive) {
                          setWandModeActive(true)
                        } else {
                          setWandModeActive(false)
                        }
                      }}
                      disabled={wands === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all shadow-sm ${
                        wandModeActive
                          ? 'bg-purple-600 border-purple-700 text-white shadow-lg'
                          : wands > 0
                          ? 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400'
                          : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      title={wandModeActive ? 'Klicka på ord för översättning' : wands > 0 ? 'Aktivera wand (översätt ord)' : 'Inga wands kvar'}
                    >
                      <Wand2 className={`w-5 h-5 ${wandModeActive ? 'animate-pulse' : ''}`} />
                      <span className="font-semibold text-sm">{wands}</span>
                    </button>


                    {/* Voice Selection - Styled Dropdown */}
                    {useElevenLabs && (
                      <div className="relative">
                        <select
                          value={`${voiceAccent}-${voiceGender}`}
                          onChange={(e) => {
                            const [accent, gender] = e.target.value.split('-') as ['american' | 'british', 'male' | 'female']
                            setVoiceAccent(accent)
                            setVoiceGender(gender)
                          }}
                          className="appearance-none bg-white border-2 border-purple-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        >
                          <option value="american-female">🇺🇸 Female Voice</option>
                          <option value="american-male">🇺🇸 Male Voice</option>
                          <option value="british-female">🇬🇧 Female Voice</option>
                          <option value="british-male">🇬🇧 Male Voice</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Speech Rate Control */}
                    <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border-2 border-purple-200 shadow-sm">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                      <input
                        type="range"
                        min="0.7"
                        max="1.3"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value)
                          setSpeechRate(newRate)
                          if (isPlayingAudio && audioRef.current && audioRef.current instanceof HTMLAudioElement) {
                            audioRef.current.playbackRate = newRate
                          }
                        }}
                        onInput={(e) => {
                          const newRate = parseFloat((e.target as HTMLInputElement).value)
                          setSpeechRate(newRate)
                          if (isPlayingAudio && audioRef.current && audioRef.current instanceof HTMLAudioElement) {
                            audioRef.current.playbackRate = newRate
                          }
                        }}
                        className="w-32 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        title={`Speech rate: ${speechRate.toFixed(2)}x`}
                      />
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">{speechRate.toFixed(2)}x</span>
                    </div>
                    <button
                      onClick={isPlayingAudio ? stopTextToSpeech : playTextToSpeech}
                      className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                      title={isPlayingAudio ? 'Stop audio' : 'Listen to text'}
                    >
                      {isPlayingAudio ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content - Side by Side */}
              <div className="flex gap-4 flex-1 min-h-0">
                {/* Reading Text - Left (larger, no scroll needed) */}
                <div className={`flex-1 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 shadow-sm overflow-hidden flex flex-col min-w-0 transition-all ${
                  wandModeActive ? 'border-purple-400 shadow-purple-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-800">Reading Text</h3>
                    {wandModeActive && (
                      <span className="ml-auto text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                        Wand aktiv - Klicka på ord för översättning
                      </span>
                    )}
                  </div>
                  <div className={`text-gray-800 leading-relaxed whitespace-pre-wrap text-lg flex-1 overflow-y-auto ${
                    wandModeActive ? 'cursor-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a855f7\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M15 4V2\'/%3E%3Cpath d=\'M15 16v-2\'/%3E%3Cpath d=\'M8 9h2\'/%3E%3Cpath d=\'M20 9h2\'/%3E%3Cpath d=\'M17.8 11.2l-1.4-1.4\'/%3E%3Cpath d=\'M6.6 22.4l-1.4-1.4\'/%3E%3Cpath d=\'M6.6 1.6l-1.4 1.4\'/%3E%3Cpath d=\'M17.8 13.8l-1.4 1.4\'/%3E%3Cpath d=\'M9 7l-5 5c-1 1-1 2.5 0 3.5s2.5 1 3.5 0l5-5\'/%3E%3Cpath d=\'M15 7l5 5c1 1 1 2.5 0 3.5s-2.5 1-3.5 0l-5-5\'/%3E%3C/svg%3E"),pointer]' : ''}`}>
                    {highlightWordsInText(currentText.text, currentText.usedWords || [])}
                  </div>
                </div>

                {/* Question Section - Right */}
                <div className="w-[500px] bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm overflow-y-auto flex-shrink-0">
                {currentText.questions[currentQuestionIndex] && (() => {
                  const question = currentText.questions[currentQuestionIndex]
                  const userAnswer = answers[question.id]
                  const feedback = questionFeedback[question.id]
                  const isAnswered = !!userAnswer

                  return (
                    <div className="space-y-4">
                      {/* Question Header */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
                            {currentQuestionIndex + 1}
                          </span>
                          <span className="text-sm text-gray-500">
                            Question {currentQuestionIndex + 1} of {currentText.questions.length}
                          </span>
                          {/* Tome Power-up Button for this question */}
                          {tomes > 0 && !highlightedSentences[question.id] && (
                            <button
                              onClick={() => handleTomeClick(question.id, question.correctAnswer)}
                              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
                              title="Klicka för att highlighta meningen med svaret"
                            >
                              <Book className="w-4 h-4" />
                              <span className="text-xs font-semibold">Tome</span>
                            </button>
                          )}
                          {highlightedSentences[question.id] !== undefined && (
                            <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-full">
                              ✓ Svar highlightat
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-800 mb-2 text-lg">{question.question}</p>
                        <div className="flex gap-2">
                          {question.type === 'vocabulary' && (
                            <span className="text-xs font-semibold text-purple-700 bg-gradient-to-r from-purple-100 to-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
                              Vocabulary
                            </span>
                          )}
                          {question.type === 'inference' && (
                            <span className="text-xs font-semibold text-indigo-700 bg-gradient-to-r from-indigo-100 to-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                              Inference
                            </span>
                          )}
                          {question.type === 'fact' && (
                            <span className="text-xs font-semibold text-green-700 bg-gradient-to-r from-green-100 to-green-50 px-3 py-1.5 rounded-full border border-green-200">
                              Fact
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Answer Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options.map((option, optIdx) => {
                          const isSelected = userAnswer === option
                          const isCorrectOption = option.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                          const showFeedback = isAnswered

                          return (
                            <button
                              key={optIdx}
                              onClick={(e) => !isAnswered && handleAnswer(question.id, option, e)}
                              disabled={isAnswered}
                              className={`p-4 rounded-xl border-2 transition-all text-left shadow-sm ${
                                showFeedback
                                  ? isCorrectOption
                                    ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-100 shadow-md shadow-green-200/50'
                                    : isSelected
                                    ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100 shadow-md shadow-red-200/50'
                                    : 'border-gray-200 bg-white'
                                  : isSelected
                                  ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-md shadow-purple-200/50 hover:shadow-lg'
                                  : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-purple-100/50 hover:shadow-md'
                              } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${showFeedback && isSelected && !isCorrectOption ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                  {option}
                                </span>
                                {showFeedback && (
                                  isCorrectOption ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                                  ) : isSelected ? (
                                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                  ) : null
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Feedback */}
                      {feedback && (
                        <div className={`p-3 rounded-xl flex-shrink-0 shadow-sm ${
                          feedback.isCorrect 
                            ? 'bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300' 
                            : 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300'
                        }`}>
                          <div className="flex items-start gap-3">
                            {feedback.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm mb-1.5 ${
                                feedback.isCorrect ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {feedback.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                              </p>
                              {feedback.explanation && (
                                <p className={`text-xs leading-relaxed ${
                                  feedback.isCorrect ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {feedback.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Continue button */}
                      {waitingForClick && (
                        <button
                          onClick={handleContinue}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
                        >
                          <span>Continue →</span>
                        </button>
                      )}
                    </div>
                  )
                })()}
                </div>
              </div>
              
              {/* Word Translation Tooltip */}
              {selectedWord && (
                <div
                  ref={wordTooltipRef}
                  className="fixed z-[70] bg-white border-2 border-purple-300 rounded-xl shadow-xl p-4 max-w-xs"
                  style={{
                    left: `${selectedWord.x}px`,
                    top: `${selectedWord.y - 10}px`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-purple-800 capitalize">{selectedWord.word}</div>
                    <button
                      onClick={() => {
                        setSelectedWord(null)
                        setTranslatingWord(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="border-t border-purple-200 pt-2">
                    {translatingWord === selectedWord.word ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                        <div className="text-sm text-gray-600">Översätter...</div>
                      </div>
                    ) : wordExplanations[selectedWord.word]?.sv ? (
                      <>
                        <div className="text-xs text-gray-500 mb-1">Svenska:</div>
                        <div className="text-lg font-semibold text-purple-700">{wordExplanations[selectedWord.word].sv}</div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 py-2">Ingen översättning tillgänglig</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

