'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, ArrowLeft, Star, CheckCircle, XCircle, Brain, Users, User, X } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateMemoryScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

// Hook to track window size for responsive layout
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

interface MemoryGameProps {
  words: string[]
  translations?: { [key: string]: string } // Optional translations object
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number, gameType?: string) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
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

export default function MemoryGame({ words, translations = {}, onClose, onScoreUpdate, trackingContext, themeColor, gridConfig, sessionMode = false }: MemoryGameProps) {
  const windowSize = useWindowSize()
  const [showPlayerSelection, setShowPlayerSelection] = useState(!sessionMode) // Skip in session mode
  const [numPlayers, setNumPlayers] = useState<1 | 2>(1)
  const [player1Name, setPlayer1Name] = useState('Player 1')
  const [player2Name, setPlayer2Name] = useState('Player 2')
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode) // Skip in session mode
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [cards, setCards] = useState<WordCard[]>([])
  const [selectedCard, setSelectedCard] = useState<WordCard | null>(null)
  const [score, setScore] = useState(0)
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1)
  const [gameFinished, setGameFinished] = useState(false)
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false)
  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false) // Locks the game while waiting
  const [waitingForFlipBack, setWaitingForFlipBack] = useState(false) // Waiting for user to click to flip back cards
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const totalAttemptsRef = useRef(0)
  const wrongAttemptsRef = useRef(0)
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

  // Define initializeGame before it's used
  const initializeGame = (gridsToUse?: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    // Use selected grids if provided, otherwise use words/translations
    let wordsToUse: string[] = words
    let translationsToUse: { [key: string]: string } = allTranslations
    
    if (gridsToUse && gridsToUse.length > 0) {
      wordsToUse = []
      translationsToUse = {}
      gridsToUse.forEach(grid => {
        wordsToUse.push(...grid.words)
        Object.assign(translationsToUse, grid.translations)
      })
    }
    
    // Filter out words with duplicate translations to avoid conflicts
    const translationCount: Record<string, number> = {}
    const uniqueWords: string[] = []
    
    // Count how many English words map to each Swedish translation
    wordsToUse.forEach(word => {
      const translation = translationsToUse[word.toLowerCase()] || getTranslation(word)
      const svKey = translation.toLowerCase()
      translationCount[svKey] = (translationCount[svKey] || 0) + 1
    })
    
    // Only include words where the Swedish translation appears only once
    wordsToUse.forEach(word => {
      const translation = translationsToUse[word.toLowerCase()] || getTranslation(word)
      const svKey = translation.toLowerCase()
      if (translationCount[svKey] === 1) {
        uniqueWords.push(word)
      }
    })
    
    // Shuffle and use all unique words (no limit)
    const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5)
    const gameWords = shuffled // Use all words, no limit
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

  useEffect(() => {
    if (sessionMode && words && words.length > 0) {
      // In session mode, use words and translations directly
      console.log('🧠 Memory: Initializing game in session mode with', words.length, 'words')
      initializeGame() // No grids needed, will use words/translations directly
    } else if (!showGridSelector && selectedGrids.length > 0) {
      initializeGame(selectedGrids)
    }
  }, [showGridSelector, selectedGrids, sessionMode, words])

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
    console.log('🎮 Word Matching: Game started (session will be created server-side)')
    setSessionId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Player selection screen
  if (showPlayerSelection) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Memory Game</h2>
            <p className="text-gray-600">Choose number of players</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => {
                setNumPlayers(1)
              }}
              className={`p-6 rounded-lg border-2 transition-all shadow-md hover:shadow-lg ${
                numPlayers === 1
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50'
              }`}
            >
              <User className="w-8 h-8 mx-auto mb-2 text-gray-700" />
              <div className="font-semibold text-gray-900">1 Player</div>
              <div className="text-sm text-gray-600 mt-1">Solo practice</div>
            </button>
            
            <button
              onClick={() => {
                setNumPlayers(2)
              }}
              className={`p-6 rounded-lg border-2 transition-all shadow-md hover:shadow-lg ${
                numPlayers === 2
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50'
              }`}
            >
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-700" />
              <div className="font-semibold text-gray-900">2 Players</div>
              <div className="text-sm text-gray-600 mt-1">Take turns</div>
            </button>
          </div>
          
          {/* Player name inputs - only for 2 players */}
          {numPlayers === 2 && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Player 1 Name</label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value || 'Player 1')}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Player 2 Name</label>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value || 'Player 2')}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-gray-900"
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowPlayerSelection(false)
                setShowGridSelector(true)
              }}
              className="flex-1 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium transition-all shadow-md"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Grid selector
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations || {}}
        onSelect={(grids) => {
          setSelectedGrids(grids)
          setShowGridSelector(false)
          // Initialize game with selected grids
          setTimeout(() => initializeGame(grids), 0)
        }}
        onClose={() => {
          setShowGridSelector(false)
          setShowPlayerSelection(true)
        }}
        minGrids={1}
        maxGrids={2}
        wordsPerGrid={6}
        title="Select Color Grids"
        description="Choose 1-2 color grids to practice with"
        gridConfig={gridConfig}
      />
    )
  }

  const handleFlipBackClick = () => {
    if (!waitingForFlipBack) return
    
    // Find both selected cards and flip them back
    setCards(prevCards => prevCards.map(c => 
      c.isSelected && !c.isMatched
        ? { ...c, isSelected: false, isFlipped: false }
        : c
    ))
    
    setSelectedCard(null)
    setIsProcessing(false)
    setWaitingForFlipBack(false)
    
    // Switch player in 2-player mode, or continue same player in 1-player mode
    if (numPlayers === 2) {
      setCurrentPlayer(prev => prev === 1 ? 2 : 1)
    }
  }

  const handleCardClick = (card: WordCard) => {
    // If waiting for flip back, clicking any card will flip them back
    if (waitingForFlipBack) {
      handleFlipBackClick()
      return
    }
    
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
        
        // Update score
        if (numPlayers === 2) {
          if (currentPlayer === 1) {
            setPlayer1Score(prev => prev + 1)
          } else {
            setPlayer2Score(prev => prev + 1)
          }
        } else {
          // 1-player mode
          setPlayer1Score(prev => prev + 1)
        }
        
        // Step 1: Turn matched cards green and check if game is complete
        setCards(prevCards => {
          const updatedCards = prevCards.map(c => 
            c.id === selectedCard.id || c.id === card.id 
              ? { ...c, isMatched: true, isSelected: false, isFlipped: true }
              : c
          )
          
          // Count matched cards in the UPDATED state
          const matchedCount = updatedCards.filter(c => c.isMatched).length
          const totalCards = updatedCards.length
          const totalPairs = Math.floor(totalCards / 2)
          const matchedPairs = Math.floor(matchedCount / 2)
          
          console.log('🎮 Memory Game match check:', { 
            matchedCount, 
            totalCards,
            totalPairs, 
            matchedPairs,
            isGameComplete: matchedPairs >= totalPairs
          })
          
          // Schedule game finish check after animation
          if (matchedPairs >= totalPairs) {
            setTimeout(() => {
              console.log('🎉 All pairs matched! Finishing game...')
              // Determine winner in 2-player mode
              if (numPlayers === 2) {
                if (player1Score > player2Score) {
                  setWinner(1)
                } else if (player2Score > player1Score) {
                  setWinner(2)
                } else {
                  setWinner(null) // Tie
                }
                setShowWinnerAnimation(true)
                setTimeout(() => {
                  finishGame()
                }, 3000) // Show animation for 3 seconds
              } else {
                finishGame()
              }
            }, 600) // Small delay for visual feedback
          }
          
          return updatedCards
        })
        
        // Increment total attempts (this was a successful attempt)
        setTotalAttempts(prev => prev + 1)
        totalAttemptsRef.current += 1
        void logWordAttempt({ word: selectedCard.word, correct: true, gameType: 'match', context: trackingContext })
        void logWordAttempt({ word: card.word, correct: true, gameType: 'match', context: trackingContext })

        // Reset selection state after animation
        // In 2-player mode, if match found, same player continues
        setTimeout(() => {
          setSelectedCard(null)
          setIsProcessing(false)
          // In 2-player mode, same player gets another turn on match
          // (no player switch needed here)
        }, 500)
      } else {
        // Animate burr (shake) for the two wrong cards
        setFeedback({ type: 'wrong', ids: [selectedCard.id, card.id] })
        setTimeout(() => setFeedback({ type: null, ids: [] }), 400)
        
        // No match - wait for user to click (anywhere or on cards) to flip back
        setWaitingForFlipBack(true)
        setIsProcessing(false) // Allow clicks to flip back
        
        // Count wrong attempts for scoring
        setWrongAttempts(prev => prev + 1)
        setTotalAttempts(prev => prev + 1)
        wrongAttemptsRef.current += 1
        totalAttemptsRef.current += 1
        
        void logWordAttempt({ word: selectedCard.word, correct: false, gameType: 'match', context: trackingContext })
        void logWordAttempt({ word: card.word, correct: false, gameType: 'match', context: trackingContext })
      }
    }
  }

  const finishGame = async () => {
    setGameFinished(true)
    
    // Use the new universal scoring system: 3 points per correct pair
    // Calculate correct pairs based on successful attempts (totalAttempts - wrongAttempts)
    const correctPairs = Math.max(0, totalAttemptsRef.current - wrongAttemptsRef.current)
    const totalPairs = Math.floor(cards.length / 2) // Use actual number of pairs from cards
    console.log('🎯 Memory Game finishGame debug:', { 
      totalAttempts: totalAttemptsRef.current,
      wrongAttempts: wrongAttemptsRef.current,
      correctPairs,
      totalPairs,
      cardsLength: cards.length,
      matchedCards: cards.filter(c => c.isMatched).length
    })
    const scoreResult = calculateMemoryScore(correctPairs, totalPairs, wrongAttempts)

    setAwardedPoints(scoreResult.pointsAwarded)
    
    // INSTANT UI UPDATE: Send points to parent for immediate UI update
    if (sessionMode) {
      // In session mode, pass correctPairs and totalPairs for percentage calculation
      onScoreUpdate(correctPairs, totalPairs, 'match')
      // Automatically close after a brief delay in session mode
      setTimeout(() => {
        onClose()
      }, 300)
    } else {
      console.log('🧠 Memory Game sending to onScoreUpdate:', { 
        accuracy: scoreResult.accuracy, 
        pointsAwarded: scoreResult.pointsAwarded, 
        gameType: 'match' 
      })
      onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'match')
    }
    
    // NOTE: Database sync handled by handleScoreUpdate in student dashboard
    // No need to call updateStudentProgress here to avoid duplicate sessions
    
    // Session logging
    const matchesFound = Math.floor(cards.filter(c => c.isMatched).length / 2)
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'match', { 
        score: scoreResult.pointsAwarded,
        accuracyPct: scoreResult.accuracy, // CRITICAL: Pass accuracy as top-level param
        durationSec: duration, 
        details: { 
          matches_found: matchesFound, 
          total_pairs: Math.floor(cards.length / 2), 
          total_attempts: totalAttempts, 
          wrong_attempts: wrongAttempts, 
          accuracy_percent: scoreResult.accuracy,
          awarded_points: scoreResult.pointsAwarded 
        } 
      })
    } else {
      void endGameSession(sessionId, 'match', { 
        score: scoreResult.pointsAwarded,
        accuracyPct: scoreResult.accuracy, // CRITICAL: Pass accuracy as top-level param
        details: { 
          matches_found: matchesFound, 
          total_pairs: Math.floor(cards.length / 2), 
          total_attempts: totalAttempts, 
          wrong_attempts: wrongAttempts, 
          accuracy_percent: scoreResult.accuracy,
          awarded_points: scoreResult.pointsAwarded 
        } 
      })
    }
  }

  const restartGame = () => {
    setCards([])
    setSelectedCard(null)
    setScore(0)
    setPlayer1Score(0)
    setPlayer2Score(0)
    setCurrentPlayer(1)
    setGameFinished(false)
    setShowWinnerAnimation(false)
    setWinner(null)
    setElapsedSec(0)
    setIsProcessing(false)
    setWaitingForFlipBack(false)
    setWrongAttempts(0)
    setTotalAttempts(0)
    totalAttemptsRef.current = 0
    wrongAttemptsRef.current = 0
    setShowPlayerSelection(true)
    setShowGridSelector(false)
    startedAtRef.current = Date.now()
    console.log('🎮 Word Matching: Game restarted (session will be created server-side)')
    setSessionId(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (gameFinished) {
    const correctPairs = Math.max(0, totalAttemptsRef.current - wrongAttemptsRef.current)
    const totalPairs = Math.floor(cards.length / 2) // Use actual number of pairs from cards
    const scoreResult = calculateMemoryScore(correctPairs, totalPairs, wrongAttempts)
    
    // In session mode, don't show modal - just return null (will close automatically)
    if (sessionMode) {
      return null
    }
    
    return (
      <UniversalGameCompleteModal
        score={scoreResult.pointsAwarded}
        pointsAwarded={scoreResult.pointsAwarded}
        gameType="match"
        accuracy={scoreResult.accuracy}
        time={formatTime(elapsedSec)}
        details={{
          correctAnswers: correctPairs,
          totalQuestions: totalPairs,
          wrongAttempts,
          efficiency: scoreResult.accuracy
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        themeColor={themeColor}
      />
    )
  }

  // Calculate grid layout based on number of cards
  // Uses viewport-based calculations to ensure everything fits on screen at any zoom level without scroll
  const getGridLayout = () => {
    const numCards = cards.length
    const numPairs = Math.floor(numCards / 2)
    
    // Calculate available space: viewport height minus header, player info, and padding
    // Header ≈ 60px, container padding ≈ 20px
    const headerHeight = 60
    const containerPadding = 20
    const availableHeight = windowSize.height - headerHeight - containerPadding
    const availableWidth = windowSize.width - 40
    
    if (numCards === 24) {
      // 12 pairs: 6 columns x 4 rows
      const gap = 8
      const cols = 6
      const rows = 4
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 6,
        gap: `${gap}px`,
        cardSize: `${Math.max(80, Math.min(cardSize, 120))}px`
      }
    } else if (numCards === 16) {
      // 8 pairs: 4 columns x 4 rows
      const gap = 10
      const cols = 4
      const rows = 4
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 4,
        gap: `${gap}px`,
        cardSize: `${Math.max(90, Math.min(cardSize, 140))}px`
      }
    } else if (numCards === 12) {
      // 6 pairs: 4 columns x 3 rows
      const gap = 12
      const cols = 4
      const rows = 3
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 4,
        gap: `${gap}px`,
        cardSize: `${Math.max(100, Math.min(cardSize, 150))}px`
      }
    } else if (numCards <= 8) {
      // 4 pairs or less: 4 columns
      const gap = 14
      const cols = 4
      const rows = Math.ceil(numCards / cols)
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 4,
        gap: `${gap}px`,
        cardSize: `${Math.max(110, Math.min(cardSize, 160))}px`
      }
    } else {
      // For other numbers, calculate dynamically
      const cols = numCards <= 20 ? 5 : 6
      const rows = Math.ceil(numCards / cols)
      const gap = 8
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: cols,
        gap: `${gap}px`,
        cardSize: `${Math.max(80, Math.min(cardSize, 120))}px`
      }
    }
  }

  const gridLayout = getGridLayout()

  const cardBoard = (
    <div
      className="flex-1 flex items-center justify-center overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridLayout.columns}, ${gridLayout.cardSize})`,
        gap: gridLayout.gap,
        justifyContent: 'center',
        alignContent: 'center',
        width: '100%',
        height: '100%',
        padding: '6px'
      }}
      onClick={() => {
        if (waitingForFlipBack) {
          handleFlipBackClick()
        }
      }}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={(e) => {
            e.stopPropagation()
            if (waitingForFlipBack) {
              handleFlipBackClick()
            } else {
              handleCardClick(card)
            }
          }}
          style={{
            width: gridLayout.cardSize,
            height: gridLayout.cardSize,
            aspectRatio: '1 / 1'
          }}
          className={`memory-card rounded-2xl cursor-pointer transition-all duration-500 transform hover:scale-105 shadow-xl
            ${card.isMatched 
              ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-2xl ring-4 ring-emerald-300' 
              : card.isFlipped 
                ? 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white shadow-2xl' 
                : 'bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 border-2 border-purple-200 hover:border-purple-300'
            }
            ${card.isMatched ? 'opacity-100 cursor-not-allowed' : ''}
            ${card.isSelected ? 'ring-4 ring-amber-400 shadow-2xl' : ''}
            ${(isProcessing || waitingForFlipBack) && !card.isMatched ? 'cursor-not-allowed' : ''}
            ${feedback.type === 'correct' && feedback.ids.includes(card.id) ? ' animate-hop' : ''}
            ${feedback.type === 'wrong' && feedback.ids.includes(card.id) ? ' animate-burr' : ''}
          `}
        >
          <div className="w-full h-full flex items-center justify-center" style={{
            padding: cards.length === 24 ? '14px' : cards.length === 16 ? '16px' : '18px'
          }}>
            {card.isFlipped ? (
              <div className="text-center w-full">
                <div className="font-bold leading-tight drop-shadow-sm" style={{ 
                  fontSize: cards.length === 24 ? 'clamp(0.95rem, 1.5vw, 1.15rem)' : cards.length === 16 ? 'clamp(1rem, 1.8vw, 1.25rem)' : 'clamp(1.1rem, 2vw, 1.3rem)',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto'
                }}>
                  {card.word}
                </div>
                {card.translation && (
                  <div className="text-xs mt-1 opacity-80">
                    {card.translation}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
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
  )

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 z-50"
      onClick={waitingForFlipBack ? handleFlipBackClick : undefined}
      style={{ cursor: waitingForFlipBack ? 'pointer' : 'default' }}
    >
      <div className="rounded-2xl p-3 w-full h-full max-w-full max-h-full shadow-2xl relative bg-white text-gray-800 border border-gray-200 flex flex-col">
        {themeColor && <div className="h-1 rounded-md mb-1" style={{ backgroundColor: themeColor }}></div>}
        
        {/* Winner Animation Overlay */}
        {showWinnerAnimation && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-2xl">
            <div className="text-center animate-bounce">
              <div className="text-8xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold text-white mb-2">
                {winner === null 
                  ? "It's a Tie!" 
                  : `${winner === 1 ? player1Name : player2Name} Wins!`
                }
              </h2>
              <div className="text-2xl text-white/90">
                {winner === null 
                  ? `${player1Score} - ${player2Score}`
                  : `Final Score: ${winner === 1 ? player1Score : player2Score}`
                }
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2" style={{ minHeight: '60px', flexShrink: 0 }}>
          <h2 className="text-lg font-bold">🧠 Memory Game</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl transition-colors w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Mobile scoreboard */}
        {numPlayers === 2 ? (
          <div
            className="sm:hidden flex items-center justify-center gap-3 mb-2"
            onClick={() => {
              if (waitingForFlipBack) {
                handleFlipBackClick()
              }
            }}
          >
            <div
              className={`flex-1 px-3 py-2 rounded-2xl border text-center shadow ${
                currentPlayer === 1
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white text-gray-800 border-gray-200'
              }`}
            >
              <div className="text-xs font-semibold mb-1">{player1Name}</div>
              <div className="text-lg font-bold">{player1Score}</div>
              <div className="text-[10px] mt-1 opacity-80">
                {currentPlayer === 1 ? 'Din tur' : 'Väntar...'}
              </div>
            </div>
            <div
              className={`flex-1 px-3 py-2 rounded-2xl border text-center shadow ${
                currentPlayer === 2
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white text-gray-800 border-gray-200'
              }`}
            >
              <div className="text-xs font-semibold mb-1">{player2Name}</div>
              <div className="text-lg font-bold">{player2Score}</div>
              <div className="text-[10px] mt-1 opacity-80">
                {currentPlayer === 2 ? 'Din tur' : 'Väntar...'}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="sm:hidden mb-3 px-3 py-2 rounded-2xl border border-purple-200 text-center bg-gradient-to-r from-purple-50 to-pink-50 shadow"
            onClick={() => {
              if (waitingForFlipBack) {
                handleFlipBackClick()
              }
            }}
          >
            <div className="text-sm font-semibold text-purple-700">Poäng {player1Score}</div>
            <div className="text-xs text-purple-600 mt-1">Tid: {formatTime(elapsedSec)}</div>
          </div>
        )}
        
        {/* Game layout with side panels */}
        <div
          className="flex-1 flex items-center justify-center gap-4 md:gap-8 px-2 md:px-6 pb-4"
          onClick={() => {
            if (waitingForFlipBack) {
              handleFlipBackClick()
            }
          }}
        >
          {numPlayers === 2 && (
            <aside className="hidden sm:flex flex-col items-center gap-3">
              <div
                className={`w-28 sm:w-32 md:w-36 rounded-3xl border-2 px-4 py-5 text-center shadow-lg transition-all ${
                  currentPlayer === 1
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500 border-blue-600 text-white scale-105 shadow-2xl'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <div className="text-sm font-semibold mb-1">{player1Name}</div>
                <div className="text-3xl font-extrabold">{player1Score}</div>
                <div className="text-xs mt-2 opacity-80">
                  {currentPlayer === 1 ? 'Din tur' : 'Väntar...'}
                </div>
              </div>
            </aside>
          )}

          {/* Game Board */}
          {cardBoard}

          {numPlayers === 2 ? (
            <aside className="hidden sm:flex flex-col items-center gap-3">
              <div
                className={`w-28 sm:w-32 md:w-36 rounded-3xl border-2 px-4 py-5 text-center shadow-lg transition-all ${
                  currentPlayer === 2
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500 border-blue-600 text-white scale-105 shadow-2xl'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <div className="text-sm font-semibold mb-1">{player2Name}</div>
                <div className="text-3xl font-extrabold">{player2Score}</div>
                <div className="text-xs mt-2 opacity-80">
                  {currentPlayer === 2 ? 'Din tur' : 'Väntar...'}
                </div>
              </div>
            </aside>
          ) : (
            <aside className="w-32 sm:w-40">
              <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-5 text-center shadow-lg">
                <div className="text-sm font-semibold text-purple-700">Poäng</div>
                <div className="text-3xl font-extrabold text-purple-900 mt-1">{player1Score}</div>
                <div className="text-xs text-purple-600 mt-3">Tid: {formatTime(elapsedSec)}</div>
              </div>
            </aside>
          )}
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

