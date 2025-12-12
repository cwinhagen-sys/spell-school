'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle, ArrowRight, X } from 'lucide-react'
import { COLOR_GRIDS } from '@/components/ColorGridSelector'
import FlashcardGame from '@/components/games/FlashcardGame'
import MultipleChoiceGame from '@/components/games/MultipleChoiceGame'
import WordMatchingGame from '@/components/games/WordMatchingGame'
import StoryGapGame from '@/components/games/StoryGapGame'
import TranslateGame from '@/components/games/TranslateGame'
import RouletteGame from '@/components/games/RouletteGame'
import ScrambleGame from '@/components/games/ScrambleGame'
import QuizGame from '@/components/games/QuizGame'
import { getGameMetadata } from '@/lib/session-games'
import BlockSelectionUI from '@/components/session/BlockSelectionUI'
import GameSelectionUI from '@/components/session/GameSelectionUI'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface ColorBlock {
  id: string
  color: string
  words: Word[]
}

interface Session {
  id: string
  session_code: string
  enabled_games: string[]
  game_rounds?: { [key: string]: number } // Number of rounds required per game
  due_date: string
  quiz_enabled: boolean
  quiz_grading_type: 'ai' | 'manual'
  word_sets: {
    id: string
    title: string
    words: Word[]
  }[]
}

interface GameProgress {
  game_name: string
  completed: boolean
  score: number
  rounds_completed?: number // Number of rounds completed for this game
}

// Helper functions to get game name and icon from metadata
const getGameName = (gameId: string): string => {
  const metadata = getGameMetadata(gameId)
  return metadata?.name || gameId
}

const getGameIcon = (gameId: string): string => {
  const metadata = getGameMetadata(gameId)
  return metadata?.icon || '🎮'
}

export default function SessionPlayPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const [session, setSession] = useState<Session | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([])
  const [colorBlocks, setColorBlocks] = useState<ColorBlock[]>([])
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [progress, setProgress] = useState<GameProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'blocks' | 'select-game' | 'playing' | 'quiz'>('blocks')
  const [gameCompleted, setGameCompleted] = useState<Set<string>>(new Set())
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; percentage: number } | null>(null)
  const [showQuizDetails, setShowQuizDetails] = useState(false)
  const [quizDetails, setQuizDetails] = useState<Array<{ word_en: string; word_sv: string; student_answer: string; score: number }>>([])
  const [quizSubmitted, setQuizSubmitted] = useState(false) // Track if quiz has been submitted
  const [quizGraded, setQuizGraded] = useState(false) // Track if quiz has been graded

  useEffect(() => {
    if (sessionId) {
      loadSession()
      loadParticipant()
    }
  }, [sessionId])

  useEffect(() => {
    if (session && session.word_sets && session.word_sets.length > 0) {
      // Get words from all word sets, not just the first one
      const allWords: Word[] = []
      session.word_sets.forEach(wordSet => {
        if (wordSet.words && Array.isArray(wordSet.words) && wordSet.words.length > 0) {
          allWords.push(...wordSet.words)
        }
      })
      
      if (allWords.length > 0) {
        console.log('📦 Creating color blocks from', allWords.length, 'words')
        createColorBlocks(allWords)
      } else {
        console.warn('⚠️ No words found in word_sets:', session.word_sets)
        setColorBlocks([])
      }
    } else if (session && (!session.word_sets || session.word_sets.length === 0)) {
      console.warn('⚠️ Session has no word_sets')
      setColorBlocks([])
    }
  }, [session])

  // Reload progress when returning to game selection
  useEffect(() => {
    if (step === 'select-game' && participantId && sessionId) {
      const reloadProgress = async () => {
        const { data: progressData } = await supabase
          .from('session_progress')
          .select('game_name, completed, score, rounds_completed')
          .eq('session_id', sessionId)
          .eq('participant_id', participantId)
        
        if (progressData) {
          setProgress(progressData as GameProgress[])
        }

        // Load quiz result if quiz is enabled
        // Check if quiz has been submitted and if it's been graded
        if (session?.quiz_enabled) {
          const { data: quizResponses } = await supabase
            .from('session_quiz_responses')
            .select('score, graded_at')
            .eq('session_id', sessionId)
            .eq('participant_id', participantId)
          
          if (quizResponses && quizResponses.length > 0) {
            // Quiz has been submitted
            setQuizSubmitted(true)
            
            // Check if quiz has been graded
            const hasGradedResponses = session.quiz_grading_type === 'manual' 
              ? quizResponses.some(r => r.graded_at !== null)
              : true // AI grading is automatically graded
            
            setQuizGraded(hasGradedResponses)
            
            // Only show result if it's been graded
            if (hasGradedResponses) {
              // Calculate score: each response has score 0-100, convert to points (0-2 per question)
              const totalPoints = quizResponses.reduce((sum, r) => {
                const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
                return sum + points
              }, 0)
              const totalPossible = quizResponses.length * 2
              const percentage = totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0
              
              setQuizResult({
                score: totalPoints,
                total: totalPossible,
                percentage: percentage
              })
            } else {
              // Quiz submitted but not graded yet
              setQuizResult(null)
            }
          } else {
            // Quiz not submitted yet
            setQuizSubmitted(false)
            setQuizGraded(false)
            setQuizResult(null)
          }
        }
      }
      reloadProgress()
    }
  }, [step, participantId, sessionId, session])

  const loadSession = async () => {
    try {
      // First, get the session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          enabled_games,
          game_rounds,
          due_date,
          quiz_enabled,
          quiz_grading_type,
          word_set_id
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      if (!sessionData) {
        throw new Error('Session not found')
      }

      // Then, get the word_set data separately
      let wordSets: Array<{ id: string; title: string; words: Word[] }> = []
      if (sessionData.word_set_id) {
        const { data: wordSetData, error: wordSetError } = await supabase
          .from('word_sets')
          .select('id, title, words')
          .eq('id', sessionData.word_set_id)
          .single()

        if (wordSetError) {
          console.error('Error loading word set:', wordSetError)
          // Don't throw - continue with empty word sets
        } else if (wordSetData) {
          // Transform words to match Word interface
          const words: Word[] = Array.isArray(wordSetData.words) 
            ? wordSetData.words.map((w: any) => ({
                en: w.en || w.english || '',
                sv: w.sv || w.swedish || '',
                image_url: w.image_url
              }))
            : []
          
          wordSets = [{
            id: wordSetData.id,
            title: wordSetData.title,
            words: words
          }]
        }
      }

      // Transform data to match Session interface
      const transformedData: Session = {
        id: sessionData.id,
        session_code: sessionData.session_code,
        enabled_games: sessionData.enabled_games || [],
        game_rounds: sessionData.game_rounds || {},
        due_date: sessionData.due_date,
        quiz_enabled: sessionData.quiz_enabled || false,
        quiz_grading_type: sessionData.quiz_grading_type || 'ai',
        word_sets: wordSets
      }
      
      console.log('✅ Session loaded:', {
        sessionId: transformedData.id,
        wordSetsCount: transformedData.word_sets.length,
        totalWords: transformedData.word_sets.reduce((sum, ws) => sum + ws.words.length, 0)
      })
      
      setSession(transformedData)
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  // Check if quiz should be unlocked (due date has passed or is today)
  const isQuizUnlocked = () => {
    if (!session || !session.quiz_enabled) return false
    const dueDate = new Date(session.due_date)
    dueDate.setHours(0, 0, 0, 0) // Set to start of day
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Set to start of day
    return now >= dueDate // Unlock if due date is today or has passed
  }

  const loadParticipant = async () => {
    try {
      // Try to get participant ID from sessionStorage first (for same tab)
      let participantIdFromStorage = sessionStorage.getItem('sessionParticipantId')
      
      // Also check localStorage as fallback (persists across tabs)
      if (!participantIdFromStorage) {
        participantIdFromStorage = localStorage.getItem(`sessionParticipantId_${sessionId}`)
      }

      // If we have a participant ID, verify it exists in database
      let participantData: any = null
      if (participantIdFromStorage) {
        const { data: data, error: participantError } = await supabase
          .from('session_participants')
          .select('id, selected_blocks, student_name')
          .eq('id', participantIdFromStorage)
          .eq('session_id', sessionId)
          .single()

        if (data && !participantError) {
          participantData = data
          // Participant exists, use it
          setParticipantId(data.id)
          // Store in both sessionStorage and localStorage
          sessionStorage.setItem('sessionParticipantId', data.id)
          localStorage.setItem(`sessionParticipantId_${sessionId}`, data.id)
          
          // Load selected blocks - but validate they're actually valid
          const blocksFromStorage = sessionStorage.getItem('selectedBlocks') || localStorage.getItem(`selectedBlocks_${sessionId}`)
          if (blocksFromStorage) {
            try {
              const parsed = JSON.parse(blocksFromStorage)
              // Only set if it's a valid non-empty array
              if (Array.isArray(parsed) && parsed.length > 0) {
                setSelectedBlocks(parsed)
              }
            } catch (e) {
              console.error('Error parsing selected blocks from storage:', e)
            }
          } else if (data.selected_blocks && Array.isArray(data.selected_blocks) && data.selected_blocks.length > 0) {
            // Only set if it's a valid non-empty array
            setSelectedBlocks(data.selected_blocks)
            sessionStorage.setItem('selectedBlocks', JSON.stringify(data.selected_blocks))
            localStorage.setItem(`selectedBlocks_${sessionId}`, JSON.stringify(data.selected_blocks))
          }
          
          // Continue loading progress below
        } else {
          // Participant ID doesn't exist in database, clear storage and redirect
          sessionStorage.removeItem('sessionParticipantId')
          localStorage.removeItem(`sessionParticipantId_${sessionId}`)
          router.push('/session/join')
          return
        }
      } else {
        // No participant ID found, redirect to join
        router.push('/session/join')
        return
      }

      // Load progress
      const currentParticipantId = participantIdFromStorage || participantId
      if (!currentParticipantId) {
        setLoading(false)
        return
      }

      const { data: progressData } = await supabase
        .from('session_progress')
        .select('game_name, completed, score, rounds_completed')
        .eq('session_id', sessionId)
        .eq('participant_id', currentParticipantId)

      if (progressData) {
        setProgress(progressData as GameProgress[])
        
        // Always check if blocks are selected - if not, show block selection FIRST
        // Validate that selected_blocks is actually a valid non-empty array
        const blocksFromDB = participantData?.selected_blocks
        const blocksFromStorage = sessionStorage.getItem('selectedBlocks') || localStorage.getItem(`selectedBlocks_${sessionId}`)
        let parsedBlocks: string[] = []
        if (blocksFromStorage) {
          try {
            parsedBlocks = JSON.parse(blocksFromStorage)
          } catch (e) {
            // Invalid JSON, treat as no blocks
          }
        }
        const hasValidBlocks = (Array.isArray(blocksFromDB) && blocksFromDB.length > 0) || 
                              (Array.isArray(parsedBlocks) && parsedBlocks.length > 0)
        if (!hasValidBlocks) {
          setStep('blocks')
          setLoading(false)
          return
        }
        
        // Always return to game selection (even if all games are completed)
        setStep('select-game')
      } else {
        // No progress yet - ALWAYS check if blocks are selected FIRST
        // Validate that selected_blocks is actually a valid non-empty array
        const blocksFromDB = participantData?.selected_blocks
        const blocksFromStorage = sessionStorage.getItem('selectedBlocks') || localStorage.getItem(`selectedBlocks_${sessionId}`)
        let parsedBlocks: string[] = []
        if (blocksFromStorage) {
          try {
            parsedBlocks = JSON.parse(blocksFromStorage)
          } catch (e) {
            // Invalid JSON, treat as no blocks
          }
        }
        const hasValidBlocks = (Array.isArray(blocksFromDB) && blocksFromDB.length > 0) || 
                              (Array.isArray(parsedBlocks) && parsedBlocks.length > 0)
        if (!hasValidBlocks) {
          // Show block selection FIRST before game selection
          setStep('blocks')
        } else {
          // Show game selection landing page
          setStep('select-game')
        }
      }
    } catch (error) {
      console.error('Error loading participant:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async (participantIdToUse: string) => {
    try {
      const { data: progressData } = await supabase
        .from('session_progress')
        .select('game_name, completed, score, rounds_completed')
        .eq('session_id', sessionId)
        .eq('participant_id', participantIdToUse)

      if (progressData) {
        setProgress(progressData as GameProgress[])
      }
      
      // Always load quiz result when loading progress
      if (session?.quiz_enabled) {
        const { data: quizResponses } = await supabase
          .from('session_quiz_responses')
          .select('score, graded_at')
          .eq('session_id', sessionId)
          .eq('participant_id', participantIdToUse)
        
        if (quizResponses && quizResponses.length > 0) {
          setQuizSubmitted(true)
          
          const hasGradedResponses = session.quiz_grading_type === 'manual' 
            ? quizResponses.some(r => r.graded_at !== null)
            : true
          
          setQuizGraded(hasGradedResponses)
          
          if (hasGradedResponses) {
            const totalPoints = quizResponses.reduce((sum, r) => {
              const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
              return sum + points
            }, 0)
            const totalPossible = quizResponses.length * 2
            const percentage = totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0
            
            setQuizResult({
              score: totalPoints,
              total: totalPossible,
              percentage: percentage
            })
            
            console.log('✅ Quiz result loaded in loadProgress:', {
              score: totalPoints,
              total: totalPossible,
              percentage: percentage
            })
          } else {
            setQuizResult(null)
          }
        } else {
          setQuizSubmitted(false)
          setQuizGraded(false)
          setQuizResult(null)
        }
      }
      
      // Check if blocks are selected - if not, show block selection
      // Validate that selected_blocks is actually a valid non-empty array
      // Get blocks from storage (blocks from DB are already handled in loadParticipant)
      const blocksFromStorage = sessionStorage.getItem('selectedBlocks') || localStorage.getItem(`selectedBlocks_${sessionId}`)
      let parsedBlocks: string[] = []
      if (blocksFromStorage) {
        try {
          parsedBlocks = JSON.parse(blocksFromStorage)
        } catch (e) {
          // Invalid JSON, treat as no blocks
        }
      }
      const hasValidBlocks = Array.isArray(parsedBlocks) && parsedBlocks.length > 0
      if (!hasValidBlocks) {
        setStep('blocks')
        setLoading(false)
        return
      }
      
      // Always show game selection landing page
      setStep('select-game')
    } catch (error) {
      console.error('Error loading progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const createColorBlocks = (words: Word[]) => {
    // Create color blocks (max 6 words per block) using COLOR_GRIDS
    // This matches the standard Spell School word set structure
    const blocks: ColorBlock[] = []
    
    if (!words || words.length === 0) {
      console.warn('⚠️ createColorBlocks called with empty words array')
      setColorBlocks([])
      return
    }
    
    for (let i = 0; i < words.length; i += 6) {
      const blockWords = words.slice(i, i + 6)
      // Only create block if it has at least one word
      if (blockWords.length > 0) {
        const colorIndex = Math.floor(i / 6) % COLOR_GRIDS.length
        const colorScheme = COLOR_GRIDS[colorIndex]
        blocks.push({
          id: `block_${i}`,
          color: colorScheme.name,
          words: blockWords,
        })
      }
    }

    console.log('✅ Created', blocks.length, 'color blocks')
    setColorBlocks(blocks)
  }

  const toggleBlock = (blockId: string) => {
    setSelectedBlocks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )
  }

  const handleBlocksSubmit = async () => {
    if (selectedBlocks.length === 0) {
      alert('Välj minst ett färgblock')
      return
    }

    if (!participantId) {
      alert('Fel: Ingen deltagare hittades')
      return
    }

    try {
      // Always store selected blocks in both sessionStorage and localStorage
      sessionStorage.setItem('selectedBlocks', JSON.stringify(selectedBlocks))
      localStorage.setItem(`selectedBlocks_${sessionId}`, JSON.stringify(selectedBlocks))
      
      // Try to save selected blocks to database (if column exists and RLS allows)
      const { error } = await supabase
        .from('session_participants')
        .update({ selected_blocks: selectedBlocks })
        .eq('id', participantId)

      if (error) {
        // If column doesn't exist yet or RLS blocks it, that's okay
        // sessionStorage and localStorage are enough for the session to work
        console.warn('Could not save to database (column might not exist or RLS issue):', error.message)
      }

      // Continue to game selection step
      setStep('select-game')
    } catch (error: any) {
      console.error('Error saving selected blocks:', error)
      // Even if database save fails, continue with sessionStorage and localStorage
      sessionStorage.setItem('selectedBlocks', JSON.stringify(selectedBlocks))
      localStorage.setItem(`selectedBlocks_${sessionId}`, JSON.stringify(selectedBlocks))
      setStep('playing')
    }
  }

  const handleGameComplete = async (allCorrect: boolean, score: number) => {
    if (!session || !participantId) return

    const currentGame = session.enabled_games[currentGameIndex]
    const requiredRounds = session.game_rounds?.[currentGame] || 1
    
    // Get current progress
    const currentProgress = progress.find(p => p.game_name === currentGame)
    const currentRoundsCompleted = currentProgress?.rounds_completed || 0
    const isAlreadyCompleted = currentProgress?.completed || false
    
    // If all correct, increment rounds_completed
    let newRoundsCompleted = currentRoundsCompleted
    if (allCorrect) {
      newRoundsCompleted = currentRoundsCompleted + 1
    }
    
    // Check if all required rounds are completed
    const allRoundsCompleted = newRoundsCompleted >= requiredRounds
    
    // Update progress
    const { error } = await supabase
      .from('session_progress')
      .upsert({
        session_id: sessionId,
        participant_id: participantId,
        game_name: currentGame,
        completed: allRoundsCompleted,
        score: score,
        rounds_completed: newRoundsCompleted,
        completed_at: allRoundsCompleted ? new Date().toISOString() : null,
        // Note: blocks_used column doesn't exist in the database schema
      }, {
        onConflict: 'session_id,participant_id,game_name'
      })

    if (error) {
      // Better error logging - extract meaningful error information
      try {
        // Check if error is actually an object with properties
        const errorType = typeof error
        const errorKeys = error && typeof error === 'object' ? Object.keys(error) : []
        const hasProperties = errorKeys.length > 0
        
        // Extract error properties safely
        let errorMessage = 'Unknown error'
        let errorCode = 'UNKNOWN'
        let errorHint = null
        
        if (errorType === 'string') {
          errorMessage = String(error)
        } else if (error && typeof error === 'object') {
          // Try to get message from various possible properties
          errorMessage = (error as any).message || 
                        (error as any).details || 
                        (error as any).error_description ||
                        (hasProperties ? `Error object with keys: ${errorKeys.join(', ')}` : 'Empty error object')
          
          errorCode = (error as any).code || 
                     (error as any).error_code || 
                     'UNKNOWN'
          
          errorHint = (error as any).hint || null
        }
        
        // Log error details individually to avoid serialization issues
        console.error('Error updating progress:')
        console.error('  Type:', errorType)
        console.error('  Message:', errorMessage)
        console.error('  Code:', errorCode)
        if (errorHint) console.error('  Hint:', errorHint)
        if (hasProperties) {
          console.error('  Error keys:', errorKeys)
          // Try to log the error object itself
          try {
            const serialized = JSON.stringify(error, null, 2)
            console.error('  Full error:', serialized)
          } catch (e) {
            console.error('  Full error (unserializable):', String(error))
          }
        } else {
          console.error('  Error object appears to be empty')
        }
      } catch (logError) {
        // Fallback if error logging itself fails
        console.error('Error updating progress (logging failed):', String(error))
        console.error('Logging error:', logError)
      }
      // Don't return early - still update local state even if DB update fails
      // This ensures UI stays responsive
    }

    // Update local progress
    setProgress(prev => {
      const existing = prev.find(p => p.game_name === currentGame)
      if (existing) {
        return prev.map(p => 
          p.game_name === currentGame 
            ? { ...p, completed: allRoundsCompleted, score, rounds_completed: newRoundsCompleted }
            : p
        )
      }
      return [...prev, { game_name: currentGame, completed: allRoundsCompleted, score, rounds_completed: newRoundsCompleted }]
    })

    // If all correct, return to game selection immediately
    if (allCorrect) {
      // Return to game selection
      setStep('select-game')
      // Reset game completed state for this round
      setGameCompleted(new Set())
    }
  }

  const getSelectedWords = (): Word[] => {
    const selected = colorBlocks.filter(b => selectedBlocks.includes(b.id))
    return selected.flatMap(b => b.words)
  }

  // Memoize words and translations to prevent re-renders
  const wordsAndTranslations = useMemo(() => {
    const words = getSelectedWords()
    const wordsArray = words.map(w => w.en)
    const translations: { [key: string]: string } = {}
    words.forEach(w => {
      translations[w.en] = w.sv
    })
    const wordObjects = words
    return { wordsArray, translations, wordObjects }
  }, [selectedBlocks, colorBlocks])

  const handleGameScoreUpdate = (score: number, total?: number, gameType?: string) => {
    const currentGame = session?.enabled_games[currentGameIndex]
    if (!currentGame) return

    // Prevent multiple calls for the same game
    if (gameCompleted.has(currentGame)) return

    // Calculate percentage
    const percentage = total && total > 0 ? Math.round((score / total) * 100) : 0
    const allCorrect = percentage === 100
    
    // Only update if game is completed (100%) or if we haven't saved progress yet
    if (allCorrect) {
      setGameCompleted(prev => new Set(prev).add(currentGame))
      handleGameComplete(allCorrect, percentage)
    } else {
      // Update progress even if not 100%, but don't advance to next game
      handleGameComplete(false, percentage)
    }
  }

  const renderGameComponent = () => {
    if (!session) {
      return (
        <div className="text-center p-8">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading session...</p>
        </div>
      )
    }
    
    const { wordsArray, translations, wordObjects } = wordsAndTranslations
    const currentGame = session.enabled_games[currentGameIndex]

    // Don't pass trackingContext - session mode is isolated from main system
    // onClose allows returning to game selection in session mode
    const gameProps = {
      words: wordsArray,
      translations,
      onClose: async () => {
        // In session mode, allow going back to game selection
        // Reload progress to ensure we have the latest state
        if (participantId) {
          const { data: progressData } = await supabase
            .from('session_progress')
            .select('game_name, completed, score, rounds_completed')
            .eq('session_id', sessionId)
            .eq('participant_id', participantId)
          
          if (progressData) {
            setProgress(progressData as GameProgress[])
          }
        }
        setStep('select-game')
      },
      onScoreUpdate: handleGameScoreUpdate,
      trackingContext: undefined, // Explicitly undefined - session mode doesn't track to main system
      themeColor: '#6366f1', // Indigo theme for sessions
      gridConfig: colorBlocks.map((block, index) => {
        const colorScheme = COLOR_GRIDS[index % COLOR_GRIDS.length]
        return {
          words: block.words.map(w => w.en),
          translations: block.words.reduce((acc, w) => {
            acc[w.en] = w.sv
            return acc
          }, {} as { [key: string]: string }),
          colorScheme: colorScheme,
          color: colorScheme.id,
          index: index
        }
      })
    }

    switch (currentGame) {
      case 'flashcards':
        return (
          <FlashcardGame
            {...gameProps}
            wordObjects={wordObjects}
            sessionMode={true}
            sessionFlashcardMode="training"
            sessionId={sessionId}
            gameName="flashcards"
          />
        )
      case 'flashcards_test':
        return (
          <FlashcardGame
            {...gameProps}
            wordObjects={wordObjects}
            sessionMode={true}
            sessionFlashcardMode="test"
            sessionId={sessionId}
            gameName="flashcards_test"
          />
        )
      case 'multiple_choice':
        return <MultipleChoiceGame {...gameProps} sessionMode={true} />
      case 'memory':
        return <WordMatchingGame {...gameProps} sessionMode={true} />
      case 'sentence_gap':
        return <StoryGapGame {...gameProps} sessionMode={true} />
      case 'word_roulette':
        return <RouletteGame {...gameProps} sessionMode={true} />
      case 'word_scramble':
        return <ScrambleGame {...gameProps} sessionMode={true} />
      case 'translate':
        return <TranslateGame {...gameProps} sessionMode={true} />
      default:
        return (
          <div className="text-center p-12">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎮</span>
            </div>
            <p className="text-gray-400">Spel "{currentGame}" är inte implementerat än</p>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
        {/* Aurora background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl animate-pulse-slow" />
          <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse-slow-reverse" />
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
        {/* Aurora background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl animate-pulse-slow" />
          <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse-slow-reverse" />
        </div>
        <div className="text-center text-red-400 relative z-10">
          <p>Session hittades inte</p>
          <button
            onClick={() => router.push('/session/join')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30"
          >
            Gå tillbaka
          </button>
        </div>
      </div>
    )
  }

  // Game selection landing page
  if (step === 'select-game') {
    // Calculate all games completed status
    const allGamesCompleted = session.enabled_games.every((game) => {
      const gameProgress = progress.find(p => p.game_name === game)
      const requiredRounds = session.game_rounds?.[game] || 1
      const roundsCompleted = gameProgress?.rounds_completed || 0
      return roundsCompleted >= requiredRounds
    })
    const quizCompleted = !session.quiz_enabled || (isQuizUnlocked() && quizResult !== null)
    const sessionComplete = allGamesCompleted && quizCompleted

    // Handler for loading quiz details
    const handleQuizDetailsClick = async () => {
      if (participantId) {
        const { data: details } = await supabase
          .from('session_quiz_responses')
          .select('word_en, word_sv, student_answer, score')
          .eq('session_id', sessionId)
          .eq('participant_id', participantId)
          .order('created_at', { ascending: true })
        
        if (details) {
          setQuizDetails(details as any[])
          setShowQuizDetails(true)
        }
      }
    }

    return (
      <GameSelectionUI
        enabledGames={session.enabled_games}
        progress={progress}
        gameRounds={session.game_rounds}
        quizEnabled={session.quiz_enabled}
        quizResult={quizResult}
        quizDetails={quizDetails}
        showQuizDetails={showQuizDetails}
        allGamesCompleted={sessionComplete}
        isQuizUnlocked={isQuizUnlocked()}
        quizSubmitted={quizSubmitted}
        quizGraded={quizGraded}
        onChangeBlocks={() => setStep('blocks')}
        onExitSession={() => {
          if (confirm('Är du säker på att du vill avsluta sessionen?')) {
            router.push('/session/join')
          }
        }}
        onSelectGame={(gameIndex, gameId) => {
          setCurrentGameIndex(gameIndex)
          setStep('playing')
          // Reset game completed state for this game when replaying
          const gameProgress = progress.find(p => p.game_name === gameId)
          const requiredRounds = session.game_rounds?.[gameId] || 1
          const roundsCompleted = gameProgress?.rounds_completed || 0
          if (gameProgress && roundsCompleted >= requiredRounds) {
            setGameCompleted(prev => {
              const newSet = new Set(prev)
              newSet.delete(gameId)
              return newSet
            })
          }
        }}
        onQuizClick={() => {
          // If quiz is already submitted, show details instead of allowing retake
          if (quizSubmitted && quizGraded) {
            handleQuizDetailsClick()
          } else if (!quizSubmitted) {
            // Only allow taking quiz if it hasn't been submitted
            setStep('quiz')
            setShowQuiz(true)
          }
          // If quiz is submitted but not graded, do nothing (locked)
        }}
        onQuizDetailsClick={handleQuizDetailsClick}
        onCloseQuizDetails={() => setShowQuizDetails(false)}
      />
    )
  }

  // Block selection step
  if (step === 'blocks') {
    // Show loading state if session is still loading or colorBlocks haven't been created yet
    if (loading || !session) {
      return (
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl" />
            <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl" />
          </div>
          <div className="text-center relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl blur-lg opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 border-2 border-amber-500/30 border-t-amber-500 rounded-xl animate-spin" />
            </div>
            <p className="text-gray-400">Loading session...</p>
          </div>
        </div>
      )
    }
    
    // If session is loaded but no color blocks, show error
    if (colorBlocks.length === 0) {
      return (
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl" />
            <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl" />
          </div>
          <div className="text-center max-w-md mx-auto p-6 relative z-10">
            <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Inga ord hittades</h2>
            <p className="text-gray-400 mb-6">
              Sessionen har inga ord att visa. Kontakta din lärare.
            </p>
            <button
              onClick={() => router.push('/session/join')}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 transition-all"
            >
              Gå tillbaka
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <BlockSelectionUI
        colorBlocks={colorBlocks}
        selectedBlocks={selectedBlocks}
        onToggleBlock={toggleBlock}
        onSubmit={handleBlocksSubmit}
      />
    )
  }

  // Quiz view - Show quiz component
  if (step === 'quiz' && showQuiz) {
    const { wordsArray, translations, wordObjects } = wordsAndTranslations
    
    return (
      <div className="min-h-screen bg-[#0a0a1a] relative overflow-hidden">
        {/* Aurora background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl animate-pulse-slow" />
          <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse-slow-reverse" />
        </div>
        <div className="relative z-10">
        <QuizGame
          words={wordsArray}
          translations={translations}
          sessionMode={true}
          onClose={async () => {
            setShowQuiz(false)
            setStep('select-game')
            // Reload progress and quiz result from database to ensure we have the latest
            if (participantId) {
              const { data: progressData } = await supabase
                .from('session_progress')
                .select('game_name, completed, score, rounds_completed')
                .eq('session_id', sessionId)
                .eq('participant_id', participantId)
              
              if (progressData) {
                setProgress(progressData as GameProgress[])
              }

              // Always reload quiz result from database when closing quiz
              if (session?.quiz_enabled) {
                const { data: quizResponses } = await supabase
                  .from('session_quiz_responses')
                  .select('score, graded_at')
                  .eq('session_id', sessionId)
                  .eq('participant_id', participantId)
                
                if (quizResponses && quizResponses.length > 0) {
                  setQuizSubmitted(true)
                  
                  const hasGradedResponses = session.quiz_grading_type === 'manual' 
                    ? quizResponses.some(r => r.graded_at !== null)
                    : true
                  
                  setQuizGraded(hasGradedResponses)
                  
                  if (hasGradedResponses) {
                    const totalPoints = quizResponses.reduce((sum, r) => {
                      const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
                      return sum + points
                    }, 0)
                    const totalPossible = quizResponses.length * 2
                    const percentage = totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0
                    
                    setQuizResult({
                      score: totalPoints,
                      total: totalPossible,
                      percentage: percentage
                    })
                    
                    console.log('✅ Quiz result loaded from database:', {
                      score: totalPoints,
                      total: totalPossible,
                      percentage: percentage
                    })
                  } else {
                    setQuizResult(null)
                  }
                } else {
                  // No responses found - clear result
                  setQuizSubmitted(false)
                  setQuizGraded(false)
                  setQuizResult(null)
                }
              }
            }
          }}
          onSubmitScore={async (score: number, total: number, evaluations: any[]) => {
            // Save quiz responses to session_quiz_responses
            if (!participantId || !session) {
              console.error('❌ Cannot save quiz: missing participantId or session', { participantId, session: !!session })
              return
            }
            
            console.log('📝 onSubmitScore called:', { score, total, evaluationsCount: evaluations.length, participantId, sessionId, gradingType: session.quiz_grading_type })
            
            // For manual grading, don't set result immediately - wait for teacher to grade
            // For AI grading, set result immediately
            if (session.quiz_grading_type === 'ai') {
              const percentage = total > 0 ? Math.round((score / total) * 100) : 0
              const initialResult = { score, total, percentage }
              setQuizResult(initialResult)
              console.log('✅ Quiz result set immediately (AI grading):', initialResult)
            } else {
              console.log('⏳ Manual grading: Result will be shown after teacher grades')
              // Don't set quizResult for manual grading - it will be loaded when teacher saves grades
            }
            
            try {
              // Get words from selected blocks
              const selectedWords = getSelectedWords()
              
              // If AI grading, grade using AI first
              let gradedEvaluations = evaluations
              if (session.quiz_grading_type === 'ai') {
                try {
                  // Prepare items for AI grading
                  const items = evaluations.map(evaluation => ({
                    prompt: evaluation.prompt,
                    expected: evaluation.expected,
                    given: evaluation.given || ''
                  }))
                  
                  // Call AI grading API
                  const response = await fetch('/api/quiz-grade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                  })
                  
                  if (response.ok) {
                    const aiResults = await response.json()
                    console.log('✅ AI grading response:', aiResults)
                    // Update evaluations with AI results
                    if (aiResults.results && Array.isArray(aiResults.results)) {
                      gradedEvaluations = evaluations.map((evaluation, index) => {
                        const aiResult = aiResults.results[index]
                        if (!aiResult) return evaluation
                        
                        // Convert AI points (0, 1, 2) to verdict
                        let verdict: 'correct' | 'partial' | 'wrong' | 'empty' = evaluation.verdict
                        if (aiResult.points === 2) {
                          verdict = 'correct'
                        } else if (aiResult.points === 1) {
                          verdict = 'partial'
                        } else if (aiResult.points === 0) {
                          verdict = evaluation.given.trim() === '' ? 'empty' : 'wrong'
                        }
                        
                        return {
                          ...evaluation,
                          verdict: verdict
                        }
                      })
                      console.log('✅ Updated evaluations with AI results:', gradedEvaluations)
                    } else {
                      console.warn('⚠️ AI results format unexpected:', aiResults)
                    }
                  } else {
                    const errorText = await response.text().catch(() => 'Unknown error')
                    console.error('❌ AI grading API error:', response.status, errorText)
                    // Continue with original evaluations if AI fails
                  }
                } catch (error) {
                  console.error('Error calling AI grading:', error)
                  // Continue with original evaluations if AI fails
                }
              }
              
              // Save each quiz response
              const responses = gradedEvaluations.map((evaluation) => {
                if (!evaluation) return null
                
                // Find the word pair - prompt can be either English or Swedish
                const wordPair = selectedWords.find(w => {
                  const promptLower = evaluation.prompt.toLowerCase().trim()
                  return w.en.toLowerCase() === promptLower || w.sv.toLowerCase() === promptLower
                })
                
                if (!wordPair) {
                  console.warn('Could not find word pair for prompt:', evaluation.prompt)
                  return null
                }
                
                // Determine if prompt was English or Swedish
                const promptIsEnglish = wordPair.en.toLowerCase() === evaluation.prompt.toLowerCase().trim()
                const expectedIsEnglish = wordPair.en.toLowerCase() === evaluation.expected.toLowerCase().trim()
                
                // Calculate score based on verdict
                let scoreValue = 0
                if (evaluation.verdict === 'correct') {
                  scoreValue = 100
                } else if (evaluation.verdict === 'partial') {
                  scoreValue = 50
                }
                
                return {
                  session_id: sessionId,
                  participant_id: participantId,
                  word_en: wordPair.en,
                  word_sv: wordPair.sv,
                  student_answer: evaluation.given || '',
                  is_correct: evaluation.verdict === 'correct',
                  score: scoreValue,
                  feedback: evaluation.verdict === 'correct' ? 'Rätt!' : evaluation.verdict === 'partial' ? 'Nästan rätt' : 'Fel',
                  graded_by: session.quiz_grading_type === 'ai' ? 'ai' : 'manual',
                  graded_at: session.quiz_grading_type === 'ai' ? new Date().toISOString() : null,
                }
              }).filter(Boolean)
              
              // Insert all responses
              if (responses.length > 0) {
                const { error: insertError } = await supabase
                  .from('session_quiz_responses')
                  .insert(responses)
                
                if (insertError) {
                  console.error('Error saving quiz responses:', insertError)
                  // Still update result even if save fails
                  const savedTotalPoints = responses.reduce((sum, r) => {
                    if (!r) return sum
                    const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
                    return sum + points
                  }, 0)
                  const savedTotalPossible = responses.length * 2
                  const savedPercentage = savedTotalPossible > 0 ? Math.round((savedTotalPoints / savedTotalPossible) * 100) : 0
                  
                  setQuizResult({
                    score: savedTotalPoints,
                    total: savedTotalPossible,
                    percentage: savedPercentage
                  })
                } else {
                  console.log(`✅ Saved ${responses.length} quiz responses`)
                  
                  // Mark quiz as submitted
                  setQuizSubmitted(true)
                  
                  // For AI grading, mark as graded immediately
                  if (session.quiz_grading_type === 'ai') {
                    setQuizGraded(true)
                    
                    // Recalculate and update quiz result after saving to ensure accuracy
                    const savedTotalPoints = responses.reduce((sum, r) => {
                      if (!r) return sum
                      const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
                      return sum + points
                    }, 0)
                    const savedTotalPossible = responses.length * 2
                    const savedPercentage = savedTotalPossible > 0 ? Math.round((savedTotalPoints / savedTotalPossible) * 100) : 0
                    
                    // Update quiz result with saved data - this ensures it persists
                    const quizResultData = {
                      score: savedTotalPoints,
                      total: savedTotalPossible,
                      percentage: savedPercentage
                    }
                    
                    setQuizResult(quizResultData)
                    
                    console.log('✅ Quiz result saved and set (AI grading):', quizResultData)
                  } else {
                    // Manual grading - wait for teacher to grade
                    setQuizGraded(false)
                    setQuizResult(null)
                    console.log('⏳ Quiz submitted, waiting for teacher to grade')
                  }
                }
                
                // Always close quiz component after processing
                setShowQuiz(false)
                setStep('select-game')
              } else {
                console.warn('No responses to save')
                // Still update result from score/total passed in
                const percentage = total > 0 ? Math.round((score / total) * 100) : 0
                setQuizResult({ score, total, percentage })
                setShowQuiz(false)
                setStep('select-game')
              }
              
              // If AI grading, the responses are already graded
              // If manual grading, teacher will grade later
            } catch (error) {
              console.error('Error saving quiz:', error)
              // Even if save fails, close quiz and show what we have
              const percentage = total > 0 ? Math.round((score / total) * 100) : 0
              setQuizResult({ score, total, percentage })
              setShowQuiz(false)
              setStep('select-game')
            }
          }}
          trackingContext={undefined}
          themeColor="#6366f1"
          gridConfig={colorBlocks
            .filter((block, index) => selectedBlocks.includes(block.id))
            .map((block, index) => {
              const colorScheme = COLOR_GRIDS[index % COLOR_GRIDS.length]
              return {
                words: block.words.map(w => ({ en: w.en, sv: w.sv })),
                translations: block.words.reduce((acc, w) => {
                  acc[w.en] = w.sv
                  return acc
                }, {} as { [key: string]: string }),
                colorScheme: colorScheme,
                color: colorScheme.id,
                index: index
              }
            })}
        />
        </div>
      </div>
    )
  }

  // Playing view - just show the game directly
  if (step === 'playing') {
    return (
      <div className="min-h-screen bg-[#0a0a1a] relative overflow-hidden">
        {/* Aurora background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl animate-pulse-slow" />
          <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse-slow-reverse" />
        </div>
        <div className="relative z-10">
          {renderGameComponent()}
        </div>
      </div>
    )
  }

  return null
}

