'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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

  // Background and layout mode state
  type LayoutMode = 'grid' | 'natural'
  
  const BACKGROUNDS = [
    { 
      id: 'aurora', 
      label: 'Aurora', 
      type: 'gradient' as const, 
      style: { 
        background: 'radial-gradient(1200px 800px at 10% 10%, rgba(72,187,255,0.25), transparent), radial-gradient(900px 700px at 90% 30%, rgba(124,58,237,0.25), transparent), linear-gradient(135deg, #0f172a, #0b1020 60%, #0b1325)' 
      } 
    },
  ]

  const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0])
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('natural')

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

  // Calculate grid layout based on number of cards
  // Uses viewport-based calculations to ensure everything fits on screen and utilizes full space
  const getGridLayout = () => {
    const numCards = cards.length
    const numPairs = Math.floor(numCards / 2)
    
    // Calculate available space accounting for sidebars and header
    const sidebarWidth = windowSize.width >= 640 ? 140 : 0
    const headerHeight = 60
    const mobileScoreboardHeight = windowSize.width < 640 ? 60 : 0
    const gameAreaPadding = 40
    const topPadding = headerHeight + mobileScoreboardHeight + 20
    
    const availableHeight = windowSize.height - topPadding - gameAreaPadding
    const availableWidth = windowSize.width - (sidebarWidth * 2) - gameAreaPadding
    
    if (numCards === 24) {
      // 12 pairs: 6 columns x 4 rows (wider layout)
      const gap = 20 // More space between cards
      const cols = 6
      const rows = 4
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 6,
        gap: `${gap}px`,
        cardSize: `${Math.max(70, Math.min(cardSize, 130))}px`
      }
    } else if (numCards === 16) {
      // 8 pairs: 4 columns x 4 rows
      const gap = 16
      const cols = 4
      const rows = 4
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 4,
        gap: `${gap}px`,
        cardSize: `${Math.max(80, Math.min(cardSize, 150))}px`
      }
    } else if (numCards === 12) {
      // 6 pairs: 4 columns x 3 rows
      const gap = 20
      const cols = 4
      const rows = 3
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 4,
        gap: `${gap}px`,
        cardSize: `${Math.max(90, Math.min(cardSize, 160))}px`
      }
    } else if (numCards <= 8) {
      // 4 pairs or less: 4 columns
      const gap = 24
      const cols = 4
      const rows = Math.ceil(numCards / cols)
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: 4,
        gap: `${gap}px`,
        cardSize: `${Math.max(100, Math.min(cardSize, 170))}px`
      }
    } else {
      // For other numbers, calculate dynamically
      const cols = numCards <= 20 ? 5 : 6
      const rows = Math.ceil(numCards / cols)
      const gap = 12
      const cardSize = Math.min(
        (availableWidth - (gap * (cols - 1))) / cols,
        (availableHeight - (gap * (rows - 1))) / rows
      )
      return {
        columns: cols,
        gap: `${gap}px`,
        cardSize: `${Math.max(70, Math.min(cardSize, 130))}px`
      }
    }
  }

  const gridLayout = getGridLayout()

  // Calculate stable positions and rotations for cards - dual mode (grid/natural)
  // This hook must be called before any early returns to follow Rules of Hooks
  const cardPositions = useMemo(() => {
    const positions = new Map<number, { x: number; y: number; rotation: number }>()
    
    if (cards.length === 0) {
      return positions
    }
    
    // Safe area inside the full-bleed canvas
    const sidebarWidth = windowSize.width >= 640 ? (numPlayers === 2 ? 140 * 2 : 140) : 0
    const headerHeight = 60
    const mobileScoreboardHeight = windowSize.width < 640 ? 60 : 0
    const padding = 24
    
    const areaW = Math.max(320, windowSize.width - sidebarWidth - padding * 2)
    const areaH = Math.max(320, windowSize.height - (headerHeight + mobileScoreboardHeight) - padding * 3)
    
    // For 24 cards, use 6 columns x 4 rows (wider layout)
    // For other card counts, calculate dynamically
    const cols = cards.length === 24 ? 6 : Math.min(6, Math.max(3, Math.ceil(Math.sqrt(cards.length))))
    const gap = cards.length === 24 ? 20 : 12 // More space for 24 cards
    
    // Card size: try to keep within area, clamp nicely
    const cardSizeGrid = (() => {
      const rows = Math.ceil(cards.length / cols)
      const sizeW = (areaW - gap * (cols - 1)) / cols
      const sizeH = (areaH - gap * (rows - 1)) / rows
      return Math.max(70, Math.min(150, Math.min(sizeW, sizeH)))
    })()
    
    const cardSizeNatural = Math.min(140, Math.max(90, Math.min(areaW, areaH) / 6))
    
    // Helper random seeded by id for stable scatter between renders
    const seeded = (seed: number) => {
      const s = Math.sin(seed * 99991) * 10000
      return s - Math.floor(s)
    }
    
    if (layoutMode === 'grid') {
      // Perfect centered grid with even spacing - no wobble for clean look
      // For 24 cards: 6 columns x 4 rows (wider layout)
      const rows = cards.length === 24 ? 4 : Math.ceil(cards.length / cols)
      
      // Calculate available game area (excluding sidebars and header)
      const gameAreaWidth = windowSize.width - sidebarWidth * 2
      const gameAreaHeight = windowSize.height - headerHeight - mobileScoreboardHeight
      
      // Calculate total grid dimensions
      const gridWidth = (cardSizeGrid * cols) + (gap * (cols - 1))
      const gridHeight = (cardSizeGrid * rows) + (gap * (rows - 1))
      
      // Center the grid both horizontally and vertically
      const startX = sidebarWidth + (gameAreaWidth - gridWidth) / 2
      const startY = headerHeight + mobileScoreboardHeight + (gameAreaHeight - gridHeight) / 2
      
      // Place cards in perfect grid - no rotation, perfectly aligned
      cards.forEach((card, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)
        
        const x = startX + col * (cardSizeGrid + gap)
        const y = startY + row * (cardSizeGrid + gap)
        
        positions.set(card.id, {
          x: x,
          y: y,
          rotation: 0 // No rotation for clean grid look
        })
      })
      
      return positions
    }
    
    // layoutMode === 'natural' — Poisson-like placement to avoid overlaps
    const placed: { x: number; y: number; r: number; id: number }[] = []
    const maxAttempts = 900
    const r = cardSizeNatural / 2
    
    const bounds = {
      minX: (windowSize.width - areaW) / 2,
      minY: headerHeight + mobileScoreboardHeight + padding,
      maxX: (windowSize.width + areaW) / 2 - cardSizeNatural,
      maxY: headerHeight + mobileScoreboardHeight + padding + areaH - cardSizeNatural,
    }
    
    // Helper: check overlap with a small padding so cards "breathe"
    const overlaps = (x: number, y: number) => {
      const pad = 8
      for (const p of placed) {
        const dx = (x + r) - (p.x + p.r)
        const dy = (y + r) - (p.y + p.r)
        if (Math.hypot(dx, dy) < r + p.r + pad) return true
      }
      return false
    }
    
    const order = [...cards]
    // Larger words first so they get nicer spots
    order.sort((a, b) => (b.word.length + b.translation.length) - (a.word.length + a.translation.length))
    
    for (const card of order) {
      let placedThis = false
      let attempts = 0
      while (!placedThis && attempts < maxAttempts) {
        attempts++
        // low-discrepancy randoms for nice coverage
        const u = seeded(card.id + attempts * 1.234)
        const v = seeded(card.id + attempts * 5.678)
        const x = bounds.minX + u * (bounds.maxX - bounds.minX)
        const y = bounds.minY + v * (bounds.maxY - bounds.minY)
        if (!overlaps(x, y)) {
          placed.push({ x, y, r, id: card.id })
          const rot = (seeded(card.id + 42) - 0.5) * 14 // -7°..7°
          positions.set(card.id, { x, y, rotation: rot })
          placedThis = true
        }
      }
    }
    
    // Fallback: if something failed to place, switch to grid for those few
    for (const card of cards) {
      if (!positions.has(card.id)) {
        const idx = cards.indexOf(card)
        const c = idx % cols
        const rI = Math.floor(idx / cols)
        const baseX = (windowSize.width - areaW) / 2 + c * (cardSizeGrid + gap)
        const baseY = headerHeight + mobileScoreboardHeight + padding + rI * (cardSizeGrid + gap)
        positions.set(card.id, { x: baseX, y: baseY, rotation: 0 })
      }
    }
    
    return positions
  }, [cards, windowSize, layoutMode, numPlayers])
  
  const getCardPosition = (cardId: number) => {
    return cardPositions.get(cardId) || { x: 0, y: 0, rotation: 0 }
  }

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
    
    // Note: Player switch already happened when no match was detected
    // (in handleCardClick when match fails), so we don't need to switch again here
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
        
        // IMPORTANT: In 2-player mode, switch player immediately when no match
        // This ensures player switch happens regardless of where user clicks to flip back
        if (numPlayers === 2) {
          setCurrentPlayer(prev => prev === 1 ? 2 : 1)
        }
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


  // UI helpers for background & layout selectors

  function LayoutToggle() {
    const availableModes: LayoutMode[] = []
    
    // Always show natural and grid
    availableModes.push('natural', 'grid')
    
    // Show placeholder if we have matching background
    if (selectedBackground.id === 'wizard-1-block' || selectedBackground.id === 'wizard-2-blocks') {
      availableModes.push('placeholder')
    }
    
    return (
      <div className="flex rounded-xl overflow-hidden border border-white/10 backdrop-blur bg-black/20">
        {availableModes.map(mode => (
          <button
            key={mode}
            onClick={() => setLayoutMode(mode)}
            className={`px-3 py-1 text-sm ${layoutMode === mode ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`}
          >
            {mode === 'natural' ? 'Naturlig' : mode === 'grid' ? 'Rutnät' : 'Placeholder'}
          </button>
        ))}
      </div>
    )
  }

  const cardBoard = (
    <div
      className="absolute inset-0"
      style={{ cursor: waitingForFlipBack ? 'pointer' : 'default' }}
      onClick={() => {
        if (waitingForFlipBack) {
          handleFlipBackClick()
        }
      }}
    >
      {cards.map((card) => {
        const position = getCardPosition(card.id)
        const cardSizeNatural = Math.min(170, Math.max(100, Math.min(windowSize.width, windowSize.height) / 6))
        // Calculate card size for placeholder mode (same as in cardPositions)
        // Calculate placeholder card size to match cardPositions calculation
        // This will be recalculated in cardPositions, but we need an estimate here
        const gameAreaWidth = windowSize.width - (windowSize.width >= 640 ? (numPlayers === 2 ? 140 * 2 : 140) : 0) * 2
        const gameAreaHeight = windowSize.height - 60 - (windowSize.width < 640 ? 60 : 0)
        const numCards = cards.length
        const cols = numCards === 12 ? 4 : numCards === 20 ? 5 : numCards === 24 ? 6 : Math.ceil(Math.sqrt(numCards))
        const rows = numCards === 24 ? 4 : Math.ceil(numCards / cols)
        const gap = numCards === 24 ? 20 : 16 // More space for 24 cards
        const totalGapWidth = gap * (cols - 1)
        const totalGapHeight = gap * (rows - 1)
        const availableWidth = gameAreaWidth - totalGapWidth
        const availableHeight = gameAreaHeight - totalGapHeight
        const cardSizePlaceholder = Math.min(
          Math.floor(availableWidth / cols),
          Math.floor(availableHeight / rows),
          150,
          90
        )
        
        // Determine card size based on layout mode
        const getCardSize = () => {
          if (layoutMode === 'placeholder') {
            return cardSizePlaceholder
          } else if (layoutMode === 'natural') {
            return cardSizeNatural
          } else {
            return parseFloat(gridLayout.cardSize)
          }
        }
        
        const currentCardSize = getCardSize()
        
        return (
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
            className={`memory-card absolute rounded-2xl cursor-pointer transition-[transform,box-shadow,opacity] duration-400 will-change-transform hover:scale-[1.07] hover:z-50 ${
              card.isMatched ? 'ring-4 ring-emerald-300 shadow-2xl' : ''
            }`}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: layoutMode === 'grid' ? gridLayout.cardSize : `${Math.round(currentCardSize)}px`,
              height: layoutMode === 'grid' ? gridLayout.cardSize : `${Math.round(currentCardSize)}px`,
              transform: `rotate(${position.rotation}deg)`,
            }}
          >
            <div
              className={`relative rounded-2xl overflow-hidden backdrop-blur-sm ${
                card.isMatched 
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white' 
                  : card.isFlipped 
                  ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-black text-white' 
                  : 'bg-white/10 text-white border border-white/20'
              } ${
                card.isSelected ? 'ring-4 ring-amber-400' : ''
              } ${
                (isProcessing || waitingForFlipBack) && !card.isMatched ? 'cursor-not-allowed' : ''
              } ${
                feedback.type === 'correct' && feedback.ids.includes(card.id) ? 'animate-hop' : ''
              } ${
                feedback.type === 'wrong' && feedback.ids.includes(card.id) ? 'animate-burr' : ''
              }`}
              style={{
                width: '100%',
                height: '100%',
                boxShadow: card.isFlipped || card.isMatched ? '0 18px 40px rgba(0,0,0,.35)' : '0 10px 25px rgba(0,0,0,.25)'
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-4">
                {card.isFlipped || card.isMatched ? (
                  <div className="text-center w-full z-10">
                    <div className="font-bold leading-tight drop-shadow-sm" style={{
                      fontSize: 'clamp(0.95rem, 2vw, 1.25rem)',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto'
                    }}>{card.word}</div>
                    {card.translation && (
                      <div className="text-xs mt-1 opacity-90">{card.translation}</div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 opacity-90" style={{ backgroundImage: 'url(/assets/wizard/wizard_novice.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={waitingForFlipBack ? handleFlipBackClick : undefined}
      style={selectedBackground.style}
    >
      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(75% 60% at 50% 40%, transparent 60%, rgba(0,0,0,.35))' }} />

      {/* Top bar (glass) */}
      <div className="relative flex items-center justify-between gap-3 px-3 sm:px-6 py-3 z-50">
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.nativeEvent.stopImmediatePropagation()
              onClose()
            }} 
            className="h-9 w-9 rounded-xl grid place-items-center backdrop-blur bg-black/30 text-white hover:bg-black/40 transition-colors cursor-pointer"
          >
            ×
          </button>
          <h2 className="text-white font-semibold text-lg drop-shadow">🧠 Memory Game</h2>
        </div>
        <div className="flex items-center gap-3">
          <LayoutToggle />
        </div>
      </div>

      {/* Score HUD (glass) */}
      <div className="absolute left-3 top-16 sm:left-6 sm:top-16 flex flex-col gap-3">
        {numPlayers === 2 ? (
          <>
            <div className={`px-4 py-3 rounded-2xl backdrop-blur border ${currentPlayer === 1 ? 'bg-white/25 text-white border-white/40' : 'bg-black/25 text-white border-white/10'}`}>
              <div className="text-xs opacity-90">{player1Name}</div>
              <div className="text-2xl font-extrabold">{player1Score}</div>
              <div className="text-[10px] opacity-80">{currentPlayer === 1 ? 'Din tur' : 'Väntar…'}</div>
            </div>
            <div className={`px-4 py-3 rounded-2xl backdrop-blur border ${currentPlayer === 2 ? 'bg-white/25 text-white border-white/40' : 'bg-black/25 text-white border-white/10'}`}>
              <div className="text-xs opacity-90">{player2Name}</div>
              <div className="text-2xl font-extrabold">{player2Score}</div>
              <div className="text-[10px] opacity-80">{currentPlayer === 2 ? 'Din tur' : 'Väntar…'}</div>
            </div>
          </>
        ) : (
          <div className="px-4 py-3 rounded-2xl backdrop-blur bg-white/20 text-white border border-white/30">
            <div className="text-xs">Poäng</div>
            <div className="text-2xl font-extrabold">{player1Score}</div>
            <div className="text-[10px] opacity-90 mt-1">Tid: {formatTime(elapsedSec)}</div>
          </div>
        )}
      </div>

      {/* CARD BOARD — full-bleed; cards absolutely positioned */}
      {cardBoard}

      {/* Winner overlay preserved */}
      {showWinnerAnimation && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center animate-bounce">
            <div className="text-8xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-2">
              {winner === null ? "It's a Tie!" : `${winner === 1 ? player1Name : player2Name} Wins!`}
            </h2>
            <div className="text-2xl text-white/90">
              {winner === null ? `${player1Score} - ${player2Score}` : `Final Score: ${winner === 1 ? player1Score : player2Score}`}
            </div>
          </div>
        </div>
      )}

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

