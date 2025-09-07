'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, ArrowLeft, Star, CheckCircle, XCircle } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import GameCompleteModal from '@/components/GameCompleteModal'

interface MemoryGameProps {
  words: string[]
  translations?: { [key: string]: string } // Optional translations object
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
}

interface WordCard {
  id: number
  word: string
  translation: string
  isMatched: boolean
  isSelected: boolean
  isFlipped: boolean
  isRemoving?: boolean
}

export default function MemoryGame({ words, translations = {}, onClose, onScoreUpdate, trackingContext, themeColor }: MemoryGameProps) {
  const [cards, setCards] = useState<WordCard[]>([])
  const [selectedCard, setSelectedCard] = useState<WordCard | null>(null)
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false) // Locks the game while waiting
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const [awardedPoints, setAwardedPoints] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | null; ids: number[] }>({ type: null, ids: [] })

  // Fallback translations if none provided
  const fallbackTranslations: { [key: string]: string } = {
    'apple': 'äpple',
    'cat': 'katt',
    'house': 'hus',
    'car': 'bil',
    'dog': 'hund',
    'book': 'bok',
    'tree': 'träd',
    'sun': 'sol',
    'moon': 'måne',
    'star': 'stjärna',
    'water': 'vatten',
    'fire': 'eld',
    'earth': 'jord',
    'air': 'luft',
    'friend': 'vän',
    'family': 'familj',
    'school': 'skola',
    'teacher': 'lärare',
    'student': 'elev',
    'homework': 'läxa'
  }

  // Use provided translations or fallback
  const allTranslations = { ...fallbackTranslations, ...translations }

  const getTranslation = (word: string) => {
    return allTranslations[word.toLowerCase()] || word
  }

  useEffect(() => {
    initializeGame()
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

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('match', trackingContext)
      setSessionId(session?.id ?? null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeGame = () => {
    // Shuffle incoming words and pick up to 8
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    const gameWords = shuffled.slice(0, Math.min(8, shuffled.length)) // Max 8 words
    const gameCards: WordCard[] = []
    
    gameWords.forEach((word, index) => {
      const translation = getTranslation(word)
      
      // Add English word
      gameCards.push({
        id: index * 2,
        word: word,
        translation: translation,
        isMatched: false,
        isSelected: false,
        isFlipped: false
      })
      
      // Add Swedish translation
      gameCards.push({
        id: index * 2 + 1,
        word: translation,
        translation: word,
        isMatched: false,
        isSelected: false,
        isFlipped: false
      })
    })
    
    // Shuffle cards
    const shuffledCards = gameCards.sort(() => Math.random() - 0.5)
    setCards(shuffledCards)
  }

  const handleCardClick = (card: WordCard) => {
    // Block clicks if game is processing, card already matched, or already selected
    if (isProcessing || card.isMatched || card.isSelected) return

    if (!selectedCard) {
      // First card selected
      setCards(prevCards => prevCards.map(c => 
        c.id === card.id ? { ...c, isSelected: true, isFlipped: true } : c
      ))
      setSelectedCard(card)
    } else {
      // Second card selected - lock game and block more clicks
      setIsProcessing(true)
      
      // Show second card
      setCards(prevCards => prevCards.map(c => 
        c.id === card.id ? { ...c, isSelected: true, isFlipped: true } : c
      ))
      
      // Check if cards match (English word with Swedish translation)
      const isMatch = (selectedCard.word === card.translation && selectedCard.translation === card.word) ||
                     (selectedCard.translation === card.word && selectedCard.word === card.translation)

      if (isMatch) {
        // Animate hop for the two matched cards
        setFeedback({ type: 'correct', ids: [selectedCard.id, card.id] })
        setTimeout(() => setFeedback({ type: null, ids: [] }), 500)
        // Step 1: Turn matched cards green (feedback)
        setCards(prevCards => prevCards.map(c => 
          c.id === selectedCard.id || c.id === card.id 
            ? { ...c, isMatched: true, isSelected: false, isFlipped: true }
            : c
        ))
        setScore(score + 20)
        void logWordAttempt({ word: selectedCard.word, correct: true, gameType: 'match', context: trackingContext })
        void logWordAttempt({ word: card.word, correct: true, gameType: 'match', context: trackingContext })

        // Step 2: After a short delay, fade them out
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === selectedCard.id || c.id === card.id
              ? { ...c, isRemoving: true }
              : c
          ))
        }, 500)

        // Step 3: Remove from grid and continue
        setTimeout(() => {
          setCards(prev => prev.filter(c => !(c.id === selectedCard.id || c.id === card.id)))
          const remainingAfter = cards.filter(c => !(c.id === selectedCard.id || c.id === card.id))
          if (remainingAfter.length === 0) {
            finishGame()
          }
          setSelectedCard(null)
          setIsProcessing(false)
        }, 900)
      } else {
        // Animate burr (shake) for the two wrong cards
        setFeedback({ type: 'wrong', ids: [selectedCard.id, card.id] })
        setTimeout(() => setFeedback({ type: null, ids: [] }), 400)
        // No match - flip cards back after delay
        setTimeout(() => {
          setCards(prevCards => prevCards.map(c => 
            c.id === selectedCard.id || c.id === card.id 
              ? { ...c, isSelected: false, isFlipped: false }
              : c
          ))
          setSelectedCard(null)
          setIsProcessing(false)
        }, 1500) // Show both cards for 1.5 seconds before flipping back
        
        // Count wrong attempts for scoring
        setWrongAttempts(prev => prev + 1)
        
        void logWordAttempt({ word: selectedCard.word, correct: false, gameType: 'match', context: trackingContext })
        void logWordAttempt({ word: card.word, correct: false, gameType: 'match', context: trackingContext })
      }
    }
  }

  const finishGame = async () => {
    setGameFinished(true)
    
    // Balanced scoring: 3-5 points per word pair based on performance
    // 0-1 wrong = 5 per pair, 2-3 wrong = 4 per pair, 4-5 wrong = 3 per pair, 6+ wrong = 2 per pair
    const wa = Math.max(0, wrongAttempts)
    const wordPairs = words.length
    let pointsPerPair = 2
    if (wa <= 1) pointsPerPair = 5
    else if (wa <= 3) pointsPerPair = 4
    else if (wa <= 5) pointsPerPair = 3
    else pointsPerPair = 2
    
    const points = wordPairs * pointsPerPair

    setAwardedPoints(points)
    const newTotal = await updateStudentProgress(points, 'match', trackingContext)
    onScoreUpdate(points, newTotal)
    
    // Session logging
    const matchesFound = Math.floor(cards.filter(c => c.isMatched).length / 2)
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'match', { 
        score: points, 
        durationSec: duration, 
        details: { matches_found: matchesFound, total_pairs: words.length, wrongAttempts: wa, awarded_points: points } 
      })
    } else {
      void endGameSession(sessionId, 'match', { 
        score: points, 
        details: { matches_found: matchesFound, total_pairs: words.length, wrongAttempts: wa, awarded_points: points } 
      })
    }
  }

  const restartGame = () => {
    setCards([])
    setSelectedCard(null)
    setScore(0)
    setGameFinished(false)
    setElapsedSec(0)
    setIsProcessing(false)
    setWrongAttempts(0)
    initializeGame()
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('match', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (gameFinished) {
    return (
      <GameCompleteModal
        score={awardedPoints}
        time={formatTime(elapsedSec)}
        details={{
          wrongAttempts,
          finalScore: awardedPoints
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        gameType="match"
        themeColor={themeColor}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">🧠 Memory Game</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Game Info (hide live points to avoid mismatch with final scoring) */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
              <span className="text-gray-200 font-semibold">⏱️ {formatTime(elapsedSec)}</span>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`
                aspect-square rounded-2xl cursor-pointer transition-all duration-500 transform hover:scale-105 shadow-xl
                ${card.isMatched 
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-2xl' 
                  : card.isFlipped 
                    ? 'bg-gradient-to-br from-indigo-400 via-blue-500 to-purple-600 text-white shadow-2xl' 
                    : 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 border-2 border-slate-400/30 hover:border-slate-400/50'
                }
                ${card.isMatched 
                  ? 'opacity-90 cursor-not-allowed' 
                  : ''
                }
                ${card.isSelected 
                  ? 'ring-4 ring-amber-400 shadow-2xl' 
                  : ''
                }
                ${isProcessing && !card.isMatched 
                  ? 'cursor-not-allowed' 
                  : ''
                }
                ${card.isRemoving ? 'opacity-0 scale-90' : ''}
                ${feedback.type === 'correct' && feedback.ids.includes(card.id) ? ' animate-hop' : ''}
                ${feedback.type === 'wrong' && feedback.ids.includes(card.id) ? ' animate-burr' : ''}
              `}
            >
              <div className="w-full h-full flex items-center justify-center p-4">
                {card.isFlipped ? (
                  <div className="text-center p-2">
                    <div className="text-xl font-bold break-words leading-tight drop-shadow-sm">
                      {card.word}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="relative">
                      {/* Modern geometric pattern */}
                      <div className="w-12 h-12 mx-auto">
                        <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-500 rounded-lg transform rotate-45 shadow-inner"></div>
                        <div className="absolute inset-2 bg-gradient-to-br from-slate-200 to-slate-300 rounded-md transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500 mb-4">
          <p>💡 Find matching pairs: English word ↔ Swedish translation</p>
        </div>

        {/* Restart Button */}
        <div className="text-center">
          <button
            onClick={restartGame}
            className="bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Game</span>
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes hop {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-6px) scale(1.03); }
          60% { transform: translateY(0) scale(1); }
          80% { transform: translateY(-2px) scale(1.01); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-hop { animation: hop 450ms ease-out; }

        @keyframes burr {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-burr { animation: burr 400ms ease-in-out; }
      `}</style>
    </div>
  )
}

