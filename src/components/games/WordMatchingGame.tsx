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
  const [totalAttempts, setTotalAttempts] = useState(0)
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
    // Filter out words with duplicate translations to avoid conflicts
    const translationCount: Record<string, number> = {}
    const uniqueWords: string[] = []
    
    // Count how many English words map to each Swedish translation
    words.forEach(word => {
      const translation = getTranslation(word)
      const svKey = translation.toLowerCase()
      translationCount[svKey] = (translationCount[svKey] || 0) + 1
    })
    
    // Only include words where the Swedish translation appears only once
    words.forEach(word => {
      const translation = getTranslation(word)
      const svKey = translation.toLowerCase()
      if (translationCount[svKey] === 1) {
        uniqueWords.push(word)
      }
    })
    
    // Shuffle and pick up to 8 words
    const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5)
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
        // Increment total attempts (this was a successful attempt)
        setTotalAttempts(prev => prev + 1)
        void logWordAttempt({ word: selectedCard.word, correct: true, gameType: 'match', context: trackingContext })
        void logWordAttempt({ word: card.word, correct: true, gameType: 'match', context: trackingContext })

        // Keep matched cards on the board and check if game is finished
        setTimeout(() => {
          const remainingCards = cards.filter(c => !c.isMatched)
          if (remainingCards.length === 2) { // Only 2 cards left (the ones we just matched)
            finishGame()
          }
          setSelectedCard(null)
          setIsProcessing(false)
        }, 500)
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
        setTotalAttempts(prev => prev + 1)
        
        void logWordAttempt({ word: selectedCard.word, correct: false, gameType: 'match', context: trackingContext })
        void logWordAttempt({ word: card.word, correct: false, gameType: 'match', context: trackingContext })
      }
    }
  }

  const finishGame = async () => {
    setGameFinished(true)
    
    // New scoring system: Max 25 points for perfect game, based on efficiency
    const wordPairs = words.length
    const totalAttemptsUsed = totalAttempts
    const perfectAttempts = wordPairs // Perfect would be 1 attempt per pair
    
    // Calculate efficiency percentage (0-100%)
    const efficiency = Math.max(0, Math.min(100, (perfectAttempts / totalAttemptsUsed) * 100))
    
    // Convert efficiency to points (0-25 points)
    const points = Math.round((efficiency / 100) * 25)
    
    // Ensure minimum 3 points for completing the game
    const finalPoints = Math.max(3, points)

    setAwardedPoints(finalPoints)
    const newTotal = await updateStudentProgress(finalPoints, 'match', trackingContext)
    onScoreUpdate(finalPoints, newTotal)
    
    // Session logging
    const matchesFound = Math.floor(cards.filter(c => c.isMatched).length / 2)
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'match', { 
        score: finalPoints, 
        durationSec: duration, 
        details: { 
          matches_found: matchesFound, 
          total_pairs: words.length, 
          total_attempts: totalAttemptsUsed, 
          wrong_attempts: wrongAttempts, 
          efficiency_percent: Math.round(efficiency),
          awarded_points: finalPoints 
        } 
      })
    } else {
      void endGameSession(sessionId, 'match', { 
        score: finalPoints, 
        details: { 
          matches_found: matchesFound, 
          total_pairs: words.length, 
          total_attempts: totalAttemptsUsed, 
          wrong_attempts: wrongAttempts, 
          efficiency_percent: Math.round(efficiency),
          awarded_points: finalPoints 
        } 
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
    setTotalAttempts(0)
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
      <div className="rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative bg-white text-gray-800 border border-gray-200">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">🧠 Memory Game</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Game Info (hide live points to avoid mismatch with final scoring) */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
              <span className="text-gray-700 font-semibold">⏱️ {formatTime(elapsedSec)}</span>
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
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-2xl ring-4 ring-emerald-300' 
                  : card.isFlipped 
                    ? 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white shadow-2xl' 
                    : 'bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 border-2 border-purple-200 hover:border-purple-300'
                }
                ${card.isMatched 
                  ? 'opacity-100 cursor-not-allowed' 
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
                ${feedback.type === 'correct' && feedback.ids.includes(card.id) ? ' animate-hop' : ''}
                ${feedback.type === 'wrong' && feedback.ids.includes(card.id) ? ' animate-burr' : ''}
              `}
            >
              <div className="w-full h-full flex items-center justify-center p-4">
                {card.isFlipped ? (
                  <div className="text-center p-2">
                    <div className="text-xl font-bold leading-tight drop-shadow-sm" style={{ 
                      fontSize: 'clamp(0.8rem, 2.2vw, 1.1rem)',
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      hyphens: 'none'
                    }}>
                      {card.word}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                    {/* Custom memory card back image */}
                    <img 
                      src="/images/memory-card-back.png" 
                      alt="Memory card back"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-600 mb-4">
          <p>💡 Find matching pairs: English word ↔ Swedish translation</p>
        </div>

        {/* Restart Button */}
        <div className="text-center">
          <button
            onClick={restartGame}
            className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2 mx-auto border border-gray-300"
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

