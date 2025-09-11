'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { RotateCcw, ArrowLeft, Star, Clock, Target } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import GameCompleteModal from '@/components/GameCompleteModal'

interface TypingChallengeProps {
  words: string[]
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number) => void
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const [awardedPoints, setAwardedPoints] = useState<number>(0)
  // Time-attack mechanics: start at 10s, +2s per correct, -3s per wrong
  const [timeLeft, setTimeLeft] = useState(10)

  // Shuffle words and cap to 12; re-shuffle on restart via shuffleKey
  const [shuffleKey, setShuffleKey] = useState(0)
  const wordList = useMemo(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(12, shuffled.length))
  }, [words, shuffleKey])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  // Count-up timer for duration (analytics)
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  // Countdown time-left for gameplay
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  // End game when time reaches 0
  useEffect(() => {
    if (!gameFinished && timeLeft === 0) {
      finishGame()
    }
  }, [timeLeft, gameFinished])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentWordIndex])

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('typing', trackingContext)
      setSessionId(session?.id ?? null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentWord = wordList[currentWordIndex] || ''

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkAnswer()
  }

  const checkAnswer = () => {
    const isCorrect = userInput.toLowerCase().trim() === currentWord.toLowerCase()
    setTotalAttempts(totalAttempts + 1)

    if (isCorrect) {
      // Correct answer!
      const streakBonus = Math.floor(streak / 3) * 5 // Optional: keep bonus for UI score
      const wordScore = 15 + streakBonus
      
      setScore(score + wordScore)
      setCorrectAnswers(correctAnswers + 1)
      setStreak(streak + 1)
      setMaxStreak(Math.max(maxStreak, streak + 1))
      setTimeLeft(prev => prev + 2)
      void logWordAttempt({ word: currentWord, correct: true, gameType: 'typing', context: trackingContext })
      
      // Next word
      if (currentWordIndex < wordList.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1)
        setUserInput('')
      } else {
        // All words completed – ensure the last increment is included
        const nextScore = score + wordScore
        setScore(nextScore)
        finishGame()
      }
    } else {
      // Wrong answer
      setStreak(0)
      setUserInput('')
      const nextTime = Math.max(0, timeLeft - 3)
      setTimeLeft(nextTime)
      if (nextTime === 0) {
        finishGame()
      }
      void logWordAttempt({ word: currentWord, correct: false, gameType: 'typing', context: trackingContext })
    }
  }

  const skipWord = () => {
    setStreak(0)
    setTotalAttempts(totalAttempts + 1)
    void logWordAttempt({ word: currentWord, correct: false, gameType: 'typing', context: trackingContext })
    
    if (currentWordIndex < wordList.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1)
      setUserInput('')
    } else {
      finishGame()
    }
  }

  const finishGame = async () => {
    // New rule: points = remaining time * 2, no diminishing
    const points = Math.max(0, Math.round(timeLeft * 2))
    setAwardedPoints(points)
    const newTotal = await updateStudentProgress(points, 'typing', trackingContext)
    onScoreUpdate(points, newTotal)
    setGameFinished(true)

    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'typing', { 
        score: points, 
        durationSec: duration, 
        accuracyPct: accuracy,
        details: { mode: 'time_attack', words_typed: correctAnswers, total_words: wordList.length, timeLeftEnd: timeLeft, awarded_points: points } 
      })
    } else {
      void endGameSession(sessionId, 'typing', { 
        score: points, 
        accuracyPct: accuracy,
        details: { mode: 'time_attack', words_typed: correctAnswers, total_words: wordList.length, timeLeftEnd: timeLeft, awarded_points: points } 
      })
    }
  }

  const restartGame = () => {
    setScore(0)
    setElapsedSec(0)
    setGameFinished(false)
    setStreak(0)
    setMaxStreak(0)
    setCorrectAnswers(0)
    setTotalAttempts(0)
    setCurrentWordIndex(0)
    setUserInput('')
    setTimeLeft(10)
    setShuffleKey(prev => prev + 1)
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('typing', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0

  if (gameFinished) {
    return (
      <GameCompleteModal
        score={awardedPoints}
        accuracy={accuracy}
        time={formatTime(elapsedSec)}
        details={{
          streak: maxStreak,
          correctAnswers,
          totalAttempts,
          wrongAttempts: totalAttempts - correctAnswers
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        gameType="typing"
        themeColor={themeColor}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative bg-white text-gray-800 border border-gray-200">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">⌨️ Typing Challenge</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Game Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-full border border-gray-200">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-gray-800 font-medium">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-full border border-gray-200">
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="text-gray-800 font-medium">Streak: {streak}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Word {currentWordIndex + 1} of {wordList.length}</span>
            <span>{Math.round(((currentWordIndex + 1) / wordList.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentWordIndex + 1) / wordList.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Word Display */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-4xl font-bold mb-4">Type this word:</h3>
            <div className="text-6xl font-bold mb-4">{currentWord}</div>
            <p className="text-orange-200 text-lg">Type the word as quickly as you can!</p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex items-center space-x-4">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Type here..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder:text-gray-500 text-lg bg-white transition-colors"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-colors shadow-lg"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={skipWord}
              className="bg-gray-100 border border-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Skip
            </button>
          </div>
        </form>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-400">
          <p>💡 Type the word exactly as it appears above</p>
          <p>🎯 You get bonus points for fast answers and streaks!</p>
          <p>⏰ Press Enter to submit your answer</p>
        </div>
      </div>
    </div>
  )
}
