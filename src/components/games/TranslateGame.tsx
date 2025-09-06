'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, ArrowLeft, Star, CheckCircle, XCircle, Languages } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, updateStudentProgress, type TrackingContext, previewDiminishedPoints, getDiminishingMeta } from '@/lib/tracking'
import { scalePoints, normalizeBySetSize } from '@/lib/scoring'

interface TranslateGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
}

interface WordPair {
  original: string
  target: string
  originalLanguage: 'en' | 'sv'
  targetLanguage: 'sv' | 'en'
}

export default function TranslateGame({ words, translations, onClose, onScoreUpdate, trackingContext, themeColor }: TranslateGameProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [wordPairs, setWordPairs] = useState<WordPair[]>([])
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [totalWords, setTotalWords] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef<number | null>(null)
  const [attemptsForCurrent, setAttemptsForCurrent] = useState(0)
  const [solutionRevealed, setSolutionRevealed] = useState(false)
  const [awardedPoints, setAwardedPoints] = useState(0)
  const [diminishInfo, setDiminishInfo] = useState<{ prior: number; factor: number }>({ prior: 0, factor: 1 })
  const [elapsedSec, setElapsedSec] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongClicks, setWrongClicks] = useState(0)

  useEffect(() => {
    initializeGame()
  }, [])

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('translate', trackingContext)
      setSessionId(session?.id ?? null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Count-up timer
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  // Keep the input focused when moving between words and after feedback
  useEffect(() => {
    if (!gameFinished && !showFeedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentWordIndex, showFeedback, gameFinished])

  const initializeGame = () => {
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(12, words.length))
    const pairs: WordPair[] = []
    
    shuffledWords.forEach((word) => {
      const translation = translations[word.toLowerCase()]
      if (translation) {
        // Add English to Swedish
        pairs.push({
          original: word,
          target: translation,
          originalLanguage: 'en',
          targetLanguage: 'sv'
        })
        
        // Add Swedish to English
        pairs.push({
          original: translation,
          target: word,
          originalLanguage: 'sv',
          targetLanguage: 'en'
        })
      }
    })
    
    // Shuffle the pairs
    const shuffledPairs = pairs.sort(() => Math.random() - 0.5)
    setWordPairs(shuffledPairs)
    setTotalWords(shuffledPairs.length)
  }

  const currentPair = wordPairs[currentWordIndex]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userAnswer.trim() || !currentPair) return

    const isAnswerCorrect = userAnswer.toLowerCase().trim() === currentPair.target.toLowerCase().trim()
    setIsCorrect(isAnswerCorrect)
    setShowFeedback(true)

    if (isAnswerCorrect) {
      // +10 for correct
      setScore(score + 10)
      setCorrectCount(prev => prev + 1)
      void logWordAttempt({ 
        word: currentPair.original, 
        correct: true, 
        gameType: 'translate', 
        context: trackingContext 
      })
      // advance only on correct
      setTimeout(() => {
        if (currentWordIndex < wordPairs.length - 1) {
          setCurrentWordIndex(currentWordIndex + 1)
          setUserAnswer('')
          setIsCorrect(null)
          setShowFeedback(false)
          setAttemptsForCurrent(0)
          setSolutionRevealed(false)
        } else {
          // Ensure the last correct answer is included in accuracy
          finishGame((correctCount + 1))
        }
      }, 500)
      return
    } else {
      // -1 for each incorrect click
      setScore(Math.max(0, score - 1))
      setWrongClicks(prev => prev + 1)
      void logWordAttempt({ 
        word: currentPair.original, 
        correct: false, 
        gameType: 'translate', 
        context: trackingContext 
      })
      const nextAttempts = attemptsForCurrent + 1
      setAttemptsForCurrent(nextAttempts)
      if (nextAttempts >= 3) {
        // Reveal the correct answer and allow advancing to next word
        setSolutionRevealed(true)
      } else {
        // stay on same word, hide feedback after a short delay
        setTimeout(() => {
          setUserAnswer('')
          setIsCorrect(null)
          setShowFeedback(false)
          if (inputRef.current) inputRef.current.focus()
        }, 600)
      }
    }
  }

  const goToNextWord = () => {
    if (currentWordIndex < wordPairs.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1)
      setUserAnswer('')
      setIsCorrect(null)
      setShowFeedback(false)
      setAttemptsForCurrent(0)
      setSolutionRevealed(false)
      if (inputRef.current) inputRef.current.focus()
    } else {
      finishGame()
    }
  }

  const finishGame = async (finalCorrectOverride?: number) => {
    // New rule: +3 per correct, -1 per wrong click, no diminishing
    const total = Math.max(1, wordPairs.length || totalWords)
    const finalCorrect = typeof finalCorrectOverride === 'number' ? finalCorrectOverride : correctCount
    const wrong = Math.max(0, wrongClicks)
    const basePoints = (finalCorrect * 3) - (wrong * 1)
    const points = Math.max(0, Math.round(basePoints))

    setAwardedPoints(points)
    const newTotal = await updateStudentProgress(points, 'translate', trackingContext)
    onScoreUpdate(points, newTotal)
    setGameFinished(true)
    
    const started = startedAtRef.current
    const accuracy = Math.max(0, Math.min(100, Math.round((finalCorrect / total) * 100)))
    
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'translate', { 
        score: points, 
        durationSec: duration, 
        accuracyPct: accuracy,
        details: { correct: finalCorrect, total, wrongClicks: wrong, awarded_points: points } 
      })
    } else {
      void endGameSession(sessionId, 'translate', { 
        score: points, 
        accuracyPct: accuracy,
        details: { correct: finalCorrect, total, wrongClicks: wrong, awarded_points: points } 
      })
    }
  }

  const restartGame = () => {
    setCurrentWordIndex(0)
    setUserAnswer('')
    setScore(0)
    setGameFinished(false)
    setIsCorrect(null)
    setShowFeedback(false)
    initializeGame()
    if (inputRef.current) {
      inputRef.current.focus()
    }
    startedAtRef.current = Date.now()
    setElapsedSec(0)
    ;(async () => {
      const session = await startGameSession('translate', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }

  if (gameFinished) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="mb-6">
            {score >= totalWords * 8 ? (
              <div className="text-6xl mb-4">🏆</div>
            ) : score >= totalWords * 6 ? (
              <div className="text-6xl mb-4">🥈</div>
            ) : (
              <div className="text-6xl mb-4">🎯</div>
            )}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Translation Complete!</h2>
            <p className="text-gray-600">You scored {awardedPoints} points</p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-semibold text-yellow-600">{awardedPoints} points</span>
          </div>
          
          <div className="space-y-2 mb-6 text-sm text-gray-600">
            <p>Time: {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={restartGame}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentPair) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing your translation challenge</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Languages className="w-6 h-6 mr-2 text-blue-400" />
            Translate Challenge
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Game Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
              <span className="text-gray-200 font-medium">Time {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentWordIndex + 1) / totalWords) * 100}%` }}
          ></div>
        </div>

        {/* Word Display */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <span className="text-sm text-gray-400 uppercase tracking-wide">
              {currentPair.originalLanguage === 'en' ? 'English' : 'Swedish'}
            </span>
          </div>
          <div className="text-4xl font-bold text-white mb-6 p-6 bg-white/5 rounded-2xl border border-white/10">
            {currentPair.original}
          </div>
          <div className="mb-4">
            <span className="text-sm text-gray-400 uppercase tracking-wide">
              Translate to {currentPair.targetLanguage === 'en' ? 'English' : 'Swedish'}
            </span>
          </div>
        </div>

        {/* Answer Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex items-center space-x-4">
            <input
              ref={inputRef}
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={`Type your answer...`}
              className="flex-1 px-4 py-3 text-lg border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-white placeholder:text-gray-400 bg-white/5"
              disabled={showFeedback}
              autoFocus
            />
            <button
              type="submit"
              disabled={!userAnswer.trim() || showFeedback}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-500/50 disabled:cursor-not-allowed transition-colors"
            >
              Submit
            </button>
          </div>
        </form>

        {/* Feedback */}
        {showFeedback && (
          <div className={`text-center p-4 rounded-xl mb-6 ${
            isCorrect 
              ? 'bg-emerald-600/15 border border-emerald-400/40' 
              : 'bg-red-600/15 border border-red-400/40'
          }`}>
            {isCorrect ? (
              <div className="flex items-center justify-center space-x-2 text-emerald-300">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Correct!</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-red-300">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5" />
                  {solutionRevealed ? (
                    <span className="font-medium">Correct answer: <strong className="text-white">{currentPair.target}</strong></span>
                  ) : (
                    <span className="font-medium">Incorrect. Try again.</span>
                  )}
                </div>
                {solutionRevealed && (
                  <button
                    type="button"
                    onClick={goToNextWord}
                    className="mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Next word
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-gray-400 mb-4">
          <p>💡 Translate the word to the target language. After 3 tries, the correct answer is shown.</p>
        </div>

        {/* Restart Button */}
        <div className="text-center">
          <button
            onClick={restartGame}
            className="bg-white/10 border border-white/10 text-white py-2 px-4 rounded-lg font-medium hover:bg-white/15 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Game</span>
          </button>
        </div>
      </div>
    </div>
  )
}
