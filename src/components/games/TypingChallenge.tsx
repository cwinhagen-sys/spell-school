'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { RotateCcw, ArrowLeft, Star, Clock, Target, Trophy } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateTypingScore } from '@/lib/gameScoring'
import { saveTypingLeaderboardEntry } from '@/lib/typingLeaderboard'
import TypingChallengeLeaderboard from '@/components/TypingChallengeLeaderboard'

interface TypingChallengeProps {
  words: string[]
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number, gameType?: string) => void
  trackingContext?: TrackingContext
  themeColor?: string
}

export default function TypingChallenge({ words, onClose, onScoreUpdate, trackingContext, themeColor }: TypingChallengeProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [score, setScore] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const correctAnswersRef = useRef(0)
  const [awardedPoints, setAwardedPoints] = useState<number>(0)
  const correctKeysPressedRef = useRef(0) // Track only correct keys pressed for KPM
  const wrongAttemptCountRef = useRef(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardRank, setLeaderboardRank] = useState<number | undefined>()
  const [finalKpm, setFinalKpm] = useState<number>(0)
  const [finalDuration, setFinalDuration] = useState<number>(0)
  const [isSavingLeaderboard, setIsSavingLeaderboard] = useState(false)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  // Shuffle words and cap to 12; re-shuffle on restart via shuffleKey
  const [shuffleKey, setShuffleKey] = useState(0)
  const wordList = useMemo(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(12, shuffled.length))
  }, [words, shuffleKey])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  // Count-up timer for duration (replaces countdown)
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentWordIndex])

  useEffect(() => {
    startedAtRef.current = Date.now()
    console.log('🎮 TypingChallenge: Game started (session will be created server-side)')
    // NOTE: Session creation moved to server-side (updateStudentProgress) for reliability
    // Client-side session creation was too slow and caused sessionId to be null
    setSessionId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentWord = wordList[currentWordIndex] || ''

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Don't track keys here - only count correct keys when answer is submitted
    setUserInput(newValue)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Prevent multiple submissions if game is finished
    if (gameFinished) {
      console.log('Game already finished, ignoring submit')
      return
    }
    checkAnswer()
  }

  const checkAnswer = () => {
    // Prevent multiple calls if game is already finished
    if (gameFinished) {
      console.log('Game already finished, ignoring checkAnswer call')
      return
    }

    const isCorrect = userInput.toLowerCase().trim() === currentWord.toLowerCase()
    const updatedTotalAttempts = totalAttempts + 1
    setTotalAttempts(updatedTotalAttempts)

    if (isCorrect) {
      // Correct answer! Only count correct keys for KPM
      correctKeysPressedRef.current += currentWord.length
      
      // Correct answer!
      const streakBonus = Math.floor(streak / 3) * 5 // Optional: keep bonus for UI score
      const wordScore = 15 + streakBonus
      
      setScore(score + wordScore)
      const newCorrectAnswers = correctAnswers + 1
      setCorrectAnswers(newCorrectAnswers)
      correctAnswersRef.current = newCorrectAnswers
      console.log('Correct answer! Updated correctAnswers:', { 
        old: correctAnswers, 
        new: newCorrectAnswers, 
        ref: correctAnswersRef.current,
        wordIndex: currentWordIndex,
        totalWords: wordList.length
      })
      setStreak(streak + 1)
      setMaxStreak(Math.max(maxStreak, streak + 1))
      void logWordAttempt({ word: currentWord, correct: true, gameType: 'typing', context: trackingContext })
      
      // Next word
      if (currentWordIndex < wordList.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1)
        setUserInput('')
      } else {
        // All words completed – ensure the last increment is included
        const nextScore = score + wordScore
        const finalCorrectAnswers = correctAnswers + 1
        setScore(nextScore)
        setCorrectAnswers(finalCorrectAnswers)
        correctAnswersRef.current = finalCorrectAnswers
        console.log('All words completed, calling finishGame with correctAnswers:', finalCorrectAnswers)
        finishGameWithCorrectAnswers(finalCorrectAnswers, updatedTotalAttempts)
      }
    } else {
      // Wrong answer
      setStreak(0)
      setUserInput('')
      const newWrongAttemptCount = wrongAttemptCountRef.current + 1
      wrongAttemptCountRef.current = newWrongAttemptCount
      setWrongAttemptCount(newWrongAttemptCount)
      console.warn('⚠️ TypingChallenge: Wrong attempt registered', {
        newWrongAttemptCount,
        maxAllowed: 3,
        wordIndex: currentWordIndex,
        word: currentWord
      })
      void logWordAttempt({ word: currentWord, correct: false, gameType: 'typing', context: trackingContext })

      if (newWrongAttemptCount >= 3) {
        console.warn('⛔ TypingChallenge: Maximum wrong attempts reached – ending game without score', {
          totalAttempts: updatedTotalAttempts,
          wrongAttempts: newWrongAttemptCount
        })
        handleFailureDueToErrors(updatedTotalAttempts, newWrongAttemptCount)
        return
      }
    }
  }


  const handleFailureDueToErrors = (totalAttemptsAtFailure: number, wrongAttemptsAtFailure: number) => {
    if (gameFinished) {
      console.log('Game already finished, skipping failure handling')
      return
    }

    const started = startedAtRef.current
    const duration = started ? Math.max(1, Math.floor((Date.now() - started) / 1000)) : elapsedSec
    if (duration > 0) {
      setElapsedSec(duration)
    }

    setGameFinished(true)
    setFailureReason('too_many_errors')
    setAwardedPoints(0)
    setFinalKpm(0)
    setFinalDuration(duration)
    setShowLeaderboard(false)
    setLeaderboardRank(undefined)
    setUserInput('')

    const correctKeysPressed = correctKeysPressedRef.current
    const totalChars = wordList.reduce((sum, word) => sum + word.length, 0)

    const sessionDetails = {
      mode: 'speed_typing',
      words_typed: correctAnswersRef.current,
      total_words: wordList.length,
      awarded_points: 0,
      kpm: 0,
      total_chars: totalChars,
      keys_pressed: correctKeysPressed,
      failure_reason: 'too_many_errors',
      total_attempts: totalAttemptsAtFailure,
      wrong_attempts: wrongAttemptsAtFailure
    }

    console.warn('🚫 TypingChallenge: Game ended due to too many errors', {
      duration,
      totalAttemptsAtFailure,
      wrongAttemptsAtFailure,
      correctAnswers: correctAnswersRef.current
    })

    if (started) {
      void endGameSession(sessionId, 'typing', {
        score: 0,
        durationSec: duration,
        accuracyPct: 0,
        details: sessionDetails
      })
    } else {
      void endGameSession(sessionId, 'typing', {
        score: 0,
        accuracyPct: 0,
        details: sessionDetails
      })
    }
  }

  const finishGameWithCorrectAnswers = async (finalCorrectAnswers: number, totalAttemptsAtFinish: number) => {
    console.log('=== TYPING CHALLENGE FINISH GAME START ===')
    console.log('finishGameWithCorrectAnswers called with:', { finalCorrectAnswers, totalWords: wordList.length, gameFinished, totalAttempts: totalAttemptsAtFinish })
    
    // Prevent multiple calls
    if (gameFinished) {
      console.log('Game already finished, skipping finishGame')
      return
    }
    
    // Set game finished immediately to prevent further interactions
    setGameFinished(true)
    setFailureReason(null)
    
    // Calculate percentage accuracy for quest tracking
    // Use wordList.length since that's what the player actually played with
    const totalWords = wordList.length
    const finalTotalAttempts = totalAttemptsAtFinish // Capture current total attempts
    const accuracyPercentage = totalWords > 0 ? Math.round((finalCorrectAnswers / totalWords) * 100) : 0
    
    // MINIMUM REQUIREMENT: Must have at least 1 correct answer to get points and count as complete
    const isComplete = finalCorrectAnswers > 0
    const points = isComplete ? Math.max(0, finalCorrectAnswers * 1) : 0
    
    console.log('WORD LENGTH COMPARISON:', {
      'words.length': words.length,
      'wordList.length': wordList.length,
      'finalCorrectAnswers': finalCorrectAnswers,
      'using totalWords (wordList.length)': totalWords,
      'isComplete': isComplete,
      'points': points
    })
    console.log('Typing Challenge - Quest tracking:', {
      finalCorrectAnswers,
      totalWords,
      accuracyPercentage,
      isPerfect: accuracyPercentage === 100,
      isComplete: isComplete,
      calculation: `${finalCorrectAnswers} / ${totalWords} * 100 = ${(finalCorrectAnswers / totalWords) * 100}`
    })
    console.log('DETAILED CALCULATION:', {
      'finalCorrectAnswers': finalCorrectAnswers,
      'totalWords': totalWords,
      'division': finalCorrectAnswers / totalWords,
      'percentage': (finalCorrectAnswers / totalWords) * 100,
      'rounded': Math.round((finalCorrectAnswers / totalWords) * 100),
      'isComplete': isComplete
    })
    
    // Update the ref to match the final value
    correctAnswersRef.current = finalCorrectAnswers
    
    setAwardedPoints(points)
    
    const started = startedAtRef.current
    const duration = started ? Math.max(1, Math.floor((Date.now() - started) / 1000)) : 0
    setElapsedSec(duration)
    
    console.log('Calling onScoreUpdate with (optimistic):', { 
      score: duration,  // SKICKA DURATION för quest tracking!
      points: points, 
      accuracy: accuracyPercentage,
      duration: duration,
      gameType: 'typing'
    })
    // VIKTIGT: För typing, skicka duration som score för quest tracking!
    // Quest "Speed God" kollar om tiden (score) är under 25 sekunder
    onScoreUpdate(duration, points, 'typing')
    console.log('=== TYPING CHALLENGE FINISH GAME END ===')

    const accuracyPct = totalWords > 0 ? Math.round((correctAnswersRef.current / totalWords) * 100) : 0
    
    console.log('🎮 TypingChallenge BEFORE accuracy calculation:')
    console.log('  correctAnswers (state):', correctAnswers)
    console.log('  correctAnswers (ref):', correctAnswersRef.current)
    console.log('  totalWords:', totalWords)
    console.log('  wordListLength:', wordList.length)
    console.log('  wordList:', wordList)
    
    console.log('🎮 TypingChallenge FINISH DEBUG:')
    console.log('  correctAnswers (state):', correctAnswers)
    console.log('  correctAnswers (ref):', correctAnswersRef.current)
    console.log('  totalWords:', totalWords)
    console.log('  wordListLength:', wordList.length)
    console.log('  accuracyPct:', accuracyPct)
    console.log('  calculation:', `${correctAnswersRef.current} / ${totalWords} * 100 = ${accuracyPct}%`)
    console.log('  wordList:', wordList)

    // Calculate KPM (Keys Per Minute) based on only correct keys pressed
    const correctKeysPressed = correctKeysPressedRef.current
    const kpm = duration > 0 ? Math.round((correctKeysPressed / duration) * 60) : 0
    setFinalKpm(kpm)
    setFinalDuration(duration)
    const totalChars = wordList.reduce((sum, word) => sum + word.length, 0)

    // Save to leaderboard if 100% accuracy
    // Only requirement: all words must be correct (finalCorrectAnswers === totalWords)
    // This means 100% accuracy even if user made mistakes along the way
    const isPerfectAccuracy = accuracyPercentage === 100 && finalCorrectAnswers === totalWords
    
    console.log('🔍 Leaderboard eligibility check:', {
      accuracyPercentage,
      finalCorrectAnswers,
      totalWords,
      totalAttempts: finalTotalAttempts,
      isPerfectAccuracy,
      requirement1: accuracyPercentage === 100,
      requirement2: finalCorrectAnswers === totalWords
    })
    
    if (isPerfectAccuracy) {
      console.log('✅ Perfect accuracy achieved - saving to leaderboard:', { 
        accuracyPercentage, 
        finalCorrectAnswers, 
        totalWords,
        totalAttempts: finalTotalAttempts,
        kpm,
        duration,
        isPerfectAccuracy 
      })
      setIsSavingLeaderboard(true)
      try {
        const leaderboardResult = await saveTypingLeaderboardEntry(
          trackingContext?.wordSetId || null,
          kpm,
          duration,
          accuracyPercentage
        )
        
        // Store result for potential leaderboard display (but don't auto-show)
        if (leaderboardResult.success) {
          console.log('✅ Leaderboard entry saved successfully:', leaderboardResult)
          setLeaderboardRank(leaderboardResult.rank)
          // Don't auto-show leaderboard - user will open it manually
        } else {
          console.error('❌ Failed to save leaderboard entry:', leaderboardResult.error)
        }
      } catch (error) {
        console.error('❌ Error during leaderboard save:', error)
      } finally {
        setIsSavingLeaderboard(false)
      }
    } else {
      console.log('❌ Not saving to leaderboard - accuracy not perfect:', { 
        accuracyPercentage, 
        finalCorrectAnswers, 
        totalWords,
        totalAttempts: finalTotalAttempts,
        isPerfectAccuracy,
        reason: accuracyPercentage !== 100 ? 'Accuracy not 100%' : 
                finalCorrectAnswers !== totalWords ? 'Not all words correct' : 'Unknown'
      })
    }

    if (started) {
      void endGameSession(sessionId, 'typing', { 
        score: points, 
        durationSec: duration, 
        accuracyPct: accuracyPct,
        details: { mode: 'speed_typing', words_typed: correctAnswers, total_words: wordList.length, awarded_points: points, kpm: kpm, total_chars: totalChars, keys_pressed: correctKeysPressed } 
      })
    } else {
      void endGameSession(sessionId, 'typing', { 
        score: points, 
        accuracyPct: accuracyPct,
        details: { mode: 'speed_typing', words_typed: correctAnswers, total_words: wordList.length, awarded_points: points, kpm: kpm, total_chars: totalChars, keys_pressed: correctKeysPressed } 
      })
    }
  }

  const finishGame = async () => {
    console.log('=== TYPING CHALLENGE FINISH GAME START ===')
    console.log('finishGame called with:', { correctAnswers: correctAnswersRef.current, totalWords: wordList.length, gameFinished })
    
    // Prevent multiple calls
    if (gameFinished) {
      console.log('Game already finished, skipping finishGame')
      return
    }
    
    // Set game finished immediately to prevent further interactions
    setGameFinished(true)
    setFailureReason(null)
    
    // Use the new universal scoring system: 1 point per correct word
    const totalWords = wordList.length
    const finalCorrectAnswers = correctAnswersRef.current
    const wrongAttempts = wrongAttemptCount
    const scoreResult = calculateTypingScore(finalCorrectAnswers, totalWords, wrongAttempts)
    
    console.log('Typing Challenge - New scoring:', {
      correctAnswers: finalCorrectAnswers,
      totalWords,
      scoreResult
    })
    
    const points = scoreResult.pointsAwarded
    setAwardedPoints(points)
    console.log('Calling onScoreUpdate with (optimistic):', { 
      score: scoreResult.accuracy, 
      points: points, 
      accuracy: scoreResult.accuracy,
      gameType: 'typing'
    })
    
    // INSTANT UI UPDATE: Send points to parent for immediate UI update
    // Send accuracy as score for quest tracking (not elapsed time!)
    onScoreUpdate(scoreResult.accuracy, points, 'typing')
    
    // BACKGROUND SYNC: Update database in background (non-blocking)
    // NOTE: Database sync handled by handleScoreUpdate in student dashboard via onScoreUpdate
    // No need to call updateStudentProgress here to avoid duplicate sessions
    console.log('=== TYPING CHALLENGE FINISH GAME END ===')

    const started = startedAtRef.current
    const accuracyPct = totalWords > 0 ? Math.round((correctAnswersRef.current / totalWords) * 100) : 0
    
    console.log('🎮 TypingChallenge FINISH DEBUG (2nd call):')
    console.log('  startedAtRef.current:', startedAtRef.current)
    console.log('  started:', started)
    console.log('  correctAnswers (state):', correctAnswers)
    console.log('  correctAnswers (ref):', correctAnswersRef.current)
    console.log('  totalWords:', totalWords)
    console.log('  wordListLength:', wordList.length)
    console.log('  accuracyPct:', accuracyPct)
    console.log('  calculation:', `${correctAnswersRef.current} / ${totalWords} * 100 = ${accuracyPct}%`)
    console.log('  wordList:', wordList)

    // Calculate KPM (Keys Per Minute) based on only correct keys pressed
    const correctKeysPressed = correctKeysPressedRef.current
    const duration = started ? Math.max(1, Math.floor((Date.now() - started) / 1000)) : 0
    const kpm = duration > 0 ? Math.round((correctKeysPressed / duration) * 60) : 0
    setElapsedSec(duration)
    setFinalKpm(kpm)
    setFinalDuration(duration)
    const totalChars = wordList.reduce((sum, word) => sum + word.length, 0)

    console.log('🎮 About to call endGameSession:', { started, duration, kpm, accuracyPct, correctKeysPressed })

    // Note: Leaderboard saving is handled in finishGameWithCorrectAnswers
    // This function is only used when game is manually closed
    // Don't save to leaderboard here to avoid duplicate entries

    if (started) {
      void endGameSession(sessionId, 'typing', { 
        score: points, 
        durationSec: duration, 
        accuracyPct: accuracyPct,
        details: { 
          mode: 'speed_typing', 
          words_typed: correctAnswers, 
          total_words: wordList.length, 
          awarded_points: points, 
          kpm: kpm, 
          total_chars: totalChars,
          keys_pressed: correctKeysPressed,
          started_at: new Date(started).toISOString() // Add started_at timestamp
        } 
      })
    } else {
      void endGameSession(sessionId, 'typing', { 
        score: points, 
        accuracyPct: accuracyPct,
        details: { 
          mode: 'speed_typing', 
          words_typed: correctAnswers, 
          total_words: wordList.length, 
          awarded_points: points, 
          kpm: kpm, 
          total_chars: totalChars,
          keys_pressed: correctKeysPressed
        } 
      })
    }
  }

  const restartGame = async () => {
    setScore(0)
    setElapsedSec(0)
    setGameFinished(false)
    setStreak(0)
    setMaxStreak(0)
    setCorrectAnswers(0)
    correctAnswersRef.current = 0
    setTotalAttempts(0)
    setWrongAttemptCount(0)
    wrongAttemptCountRef.current = 0
    setCurrentWordIndex(0)
    setUserInput('')
    correctKeysPressedRef.current = 0
    setShowLeaderboard(false)
    setLeaderboardRank(undefined)
    setFinalKpm(0)
    setFinalDuration(0)
    setFailureReason(null)
    setShuffleKey(prev => prev + 1)
    startedAtRef.current = Date.now()
    
    console.log('🎮 TypingChallenge: Game restarted (session will be created server-side)')
    setSessionId(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0

  if (gameFinished) {
    const totalWords = wordList.length
    const finalCorrectAnswers = correctAnswersRef.current
    const wrongAttempts = wrongAttemptCount
    const isFailure = failureReason === 'too_many_errors'

    if (isFailure) {
      return (
        <UniversalGameCompleteModal
          score={0}
          pointsAwarded={0}
          gameType="typing"
          accuracy={0}
          time={formatTime(elapsedSec)}
          details={{
            correctAnswers: finalCorrectAnswers,
            totalQuestions: totalWords,
            wrongAttempts,
            streak: maxStreak,
            kpm: finalKpm,
            failureReason: 'too_many_errors'
          }}
          onPlayAgain={restartGame}
          onBackToDashboard={onClose}
          themeColor={themeColor}
        />
      )
    }

    const scoreResult = calculateTypingScore(finalCorrectAnswers, totalWords, wrongAttempts)
    
    return (
      <>
        <UniversalGameCompleteModal
          score={scoreResult.pointsAwarded}
          pointsAwarded={scoreResult.pointsAwarded}
          gameType="typing"
          accuracy={scoreResult.accuracy}
          time={formatTime(elapsedSec)}
          details={{
            correctAnswers: finalCorrectAnswers,
            totalQuestions: totalWords,
            wrongAttempts,
            streak: maxStreak,
            kpm: finalKpm
          }}
          onPlayAgain={restartGame}
          onBackToDashboard={onClose}
          onViewLeaderboard={() => {
            // Open leaderboard even if still saving - it will show loading state
            setShowLeaderboard(true)
          }}
          themeColor={themeColor}
        />
        {showLeaderboard && (
          <TypingChallengeLeaderboard
            wordSetId={trackingContext?.wordSetId || null}
            onClose={() => setShowLeaderboard(false)}
            userRank={leaderboardRank}
            userKpm={finalKpm}
            userTime={finalDuration}
          />
        )}
      </>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-2 z-50 overflow-y-auto">
      {/* Aurora background effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative bg-[#12122a] rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/10 my-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Skrivutmaning</h2>
              <p className="text-sm text-gray-400">Skriv snabbt, bygg streaks!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
          >
            <span className="text-gray-400 text-xl">×</span>
          </button>
        </div>

        {/* Game Stats */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center space-x-3 flex-wrap gap-3">
            <div className="flex items-center space-x-2 bg-amber-500/10 px-4 py-3 rounded-xl border border-amber-500/30">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-300 font-bold text-lg">{formatTime(elapsedSec)}</span>
            </div>
            <div className="flex items-center space-x-2 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/30">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300 font-bold text-lg">Streak: {streak}</span>
            </div>
            <div className="flex items-center space-x-2 bg-violet-500/10 px-4 py-3 rounded-xl border border-violet-500/30">
              <Star className="w-5 h-5 text-violet-400" />
              <span className="text-violet-300 font-bold text-lg">Poäng: {correctAnswersRef.current}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
            <span className="font-medium">Ord {currentWordIndex + 1} av {wordList.length}</span>
            <span className="font-medium text-amber-400">{Math.round(((currentWordIndex + 1) / wordList.length) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentWordIndex + 1) / wordList.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Word Display */}
        <div className="text-center mb-6">
          <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-2xl p-8 text-white shadow-2xl border border-amber-500/30">
            <div className="inline-block bg-white/10 px-4 py-2 rounded-xl mb-4 backdrop-blur-sm border border-white/10">
              <h3 className="text-lg font-bold">Skriv detta ord:</h3>
            </div>
            <div className="text-5xl font-bold mb-4 drop-shadow-lg">{currentWord}</div>
            <p className="text-gray-300 text-lg font-medium">Skriv så snabbt du kan!</p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Skriv här..."
              className="flex-1 px-4 py-3 border border-white/10 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500/50 text-white placeholder:text-gray-500 text-lg bg-white/5 transition-all shadow-lg hover:shadow-xl"
              autoComplete="off"
              autoFocus
              disabled={gameFinished}
            />
            <button
              type="submit"
              disabled={gameFinished}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-3 px-6 rounded-xl font-bold text-base transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skicka
            </button>
          </div>
        </form>

        {/* Instructions */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center space-y-1 bg-white/5 px-4 py-3 rounded-xl border border-white/10">
            <div className="flex items-center space-x-3 text-xs font-medium text-gray-400 flex-wrap justify-center gap-2">
              <span>Skriv exakt som visat</span>
              <span>•</span>
              <span>Få bonus för hastighet & streaks</span>
              <span>•</span>
              <span>Tryck Enter för att skicka</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
