'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, X, Check, Sparkles } from 'lucide-react'
import { startGameSession, endGameSession, updateStudentProgress, logWordAttempt, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateLineMatchingScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

interface LineMatchingGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number, gameType?: string) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
}

type Pair = { en: string; sv: string }

interface FloatingWord {
  id: string
  word: string
  language: 'en' | 'sv'
  x: number
  y: number
  matched: boolean
}

export default function LineMatchingGame({ words, translations, onClose, onScoreUpdate, trackingContext, themeColor, gridConfig }: LineMatchingGameProps) {
  const [showGridSelector, setShowGridSelector] = useState(true)
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [pairs, setPairs] = useState<Pair[]>([])
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([])
  const [selectedWord, setSelectedWord] = useState<FloatingWord | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Array<{ word1: FloatingWord; word2: FloatingWord }>>([])
  const [gameFinished, setGameFinished] = useState(false)
  const [awardedPoints, setAwardedPoints] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [shake, setShake] = useState<string | null>(null)

  // Build pairs from selected grids
  const shuffledPairs = useMemo(() => {
    if (showGridSelector || selectedGrids.length === 0) return []
    
    // Combine words and translations from selected grids
    const allWords: string[] = []
    const allTranslations: { [key: string]: string } = {}
    
    selectedGrids.forEach(grid => {
      allWords.push(...grid.words)
      Object.assign(allTranslations, grid.translations)
    })
    
    const built: Pair[] = []
    const lowerMap: Record<string, string> = {}
    const reverseMap: Record<string, string> = {}
    
    // First use selected grid translations, then fallback to provided translations
    const combinedTranslations = { ...translations, ...allTranslations }
    
    for (const [k, v] of Object.entries(combinedTranslations || {})) {
      const key = String(k ?? '').trim().toLowerCase()
      const val = String(v ?? '').trim()
      if (!key || !val) continue
      lowerMap[key] = val
      reverseMap[val.toLowerCase()] = k
    }
    
    const sourceWords = (allWords && allWords.length > 0)
      ? allWords.filter(w => typeof w === 'string' && String(w).trim().length > 0)
      : (words && words.length > 0)
        ? words.filter(w => typeof w === 'string' && String(w).trim().length > 0)
        : Object.keys(lowerMap).length > 0
          ? Object.keys(lowerMap)
          : Object.keys(reverseMap)
    
    const usedPairs = new Set<string>()
    const translationCount: Record<string, number> = {}
    
    for (const w of sourceWords) {
      const wStr = String(w ?? '')
      const wTrim = wStr.trim()
      const wl = wTrim.toLowerCase()
      
      let pair: Pair | null = null
      
      if (lowerMap[wl]) {
        pair = { en: wTrim, sv: lowerMap[wl] }
      } else if (reverseMap[wl]) {
        pair = { en: wTrim, sv: reverseMap[wl] }
      } else {
        pair = { en: wTrim, sv: wTrim }
      }
      
      if (pair) {
        const pairKey = `${pair.en.toLowerCase()}|${pair.sv.toLowerCase()}`
        const svKey = pair.sv.toLowerCase()
        translationCount[svKey] = (translationCount[svKey] || 0) + 1
        
        if (!usedPairs.has(pairKey)) {
          built.push(pair)
          usedPairs.add(pairKey)
        }
      }
    }
    
    const filteredPairs = built.filter(pair => {
      const svKey = pair.sv.toLowerCase()
      return translationCount[svKey] === 1
    })
    
    const shuffled = filteredPairs.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(10, shuffled.length)) // 10 pairs = 20 cards
  }, [words, translations, selectedGrids, showGridSelector])

  // Initialize floating words with grid-based positioning (no overlap)
  useEffect(() => {
    if (showGridSelector || selectedGrids.length === 0) return
    if (shuffledPairs.length === 0) return
    if (pairs.length > 0) return // Already initialized
    
    console.log('Initializing game with', shuffledPairs.length, 'pairs')
    startedAtRef.current = Date.now()
    console.log('🎮 Line Matching: Game started (session will be created server-side)')
    setSessionId(null)
    
    setPairs(shuffledPairs)
    
    // Create floating words in grid layout with spacing
    const words: FloatingWord[] = []
    const cardWidth = 160 // Smaller card width
    const cardHeight = 70 // Smaller card height
    const horizontalSpacing = 20
    const verticalSpacing = 12
    
    // Use relative positioning based on available game area
    // Game area is approximately max-w-7xl (1280px) minus padding
    const gameAreaWidth = 1200 // Approximate game area width
    const gameAreaHeight = 600 // Approximate game area height
    
    // Create Swedish and English words separately
    const swedishWords: FloatingWord[] = []
    const englishWords: FloatingWord[] = []
    
    shuffledPairs.forEach((pair, index) => {
      swedishWords.push({
        id: `sv-${index}`,
        word: pair.sv,
        language: 'sv',
        x: 0,
        y: 0,
        matched: false
      })
      englishWords.push({
        id: `en-${index}`,
        word: pair.en,
        language: 'en',
        x: 0,
        y: 0,
        matched: false
      })
    })
    
    // Shuffle words before placing them (randomize order)
    const shuffle = <T,>(arr: T[]): T[] => {
      const shuffled = [...arr]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    
    const shuffledSwedish = shuffle(swedishWords)
    const shuffledEnglish = shuffle(englishWords)
    
    // Place Swedish words on left side - in 2 columns to fit within game area
    const swedishPerColumn = Math.ceil(shuffledSwedish.length / 2)
    const leftSectionWidth = (gameAreaWidth * 0.48) // 48% of game area for left section
    const leftMargin = 20
    const columnWidth = (leftSectionWidth - leftMargin * 2 - horizontalSpacing) / 2 // Two columns with spacing
    
    shuffledSwedish.forEach((word, index) => {
      const column = Math.floor(index / swedishPerColumn)
      const rowInColumn = index % swedishPerColumn
      
      const baseX = leftMargin + column * (columnWidth + horizontalSpacing)
      const baseY = 80 + rowInColumn * (cardHeight + verticalSpacing)
      
      // Ensure it stays within left section
      word.x = Math.min(baseX, leftSectionWidth - cardWidth - 10)
      word.y = baseY
      words.push(word)
    })
    
    // Place English words on right side - in 2 columns to fit within game area
    const englishPerColumn = Math.ceil(shuffledEnglish.length / 2)
    const rightSectionStart = gameAreaWidth * 0.52 // Start of right section at 52%
    const rightSectionWidth = gameAreaWidth * 0.48 // 48% of game area for right section
    const rightMargin = 20
    const rightColumnWidth = (rightSectionWidth - rightMargin * 2 - horizontalSpacing) / 2 // Two columns with spacing
    
    shuffledEnglish.forEach((word, index) => {
      const column = Math.floor(index / englishPerColumn)
      const rowInColumn = index % englishPerColumn
      
      // Calculate from right section start
      const baseX = rightSectionStart + rightMargin + column * (rightColumnWidth + horizontalSpacing)
      const baseY = 80 + rowInColumn * (cardHeight + verticalSpacing)
      
      // Ensure it stays within right section
      word.x = Math.min(baseX, gameAreaWidth - cardWidth - rightMargin - 10)
      word.y = baseY
      words.push(word)
    })
    
    setFloatingWords(words)
  }, [showGridSelector, selectedGrids, shuffledPairs.length, pairs.length])

  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  const handleWordClick = (word: FloatingWord) => {
    if (word.matched || gameFinished) return
    
    console.log('Word clicked:', word)
    
    if (!selectedWord) {
      // First selection
      setSelectedWord(word)
      console.log('Selected first word:', word.word)
    } else {
      // Second selection - check if match
      console.log('Checking match:', selectedWord.word, '↔', word.word)
      
      // Can't select same word
      if (selectedWord.id === word.id) {
        setSelectedWord(null)
        return
      }
      
      // Must be different languages
      if (selectedWord.language === word.language) {
        setSelectedWord(null)
        return
      }
      
      // Check if it's a correct match
      const isMatch = pairs.some(p => {
        const match1 = (p.sv.toLowerCase() === selectedWord.word.toLowerCase() && p.en.toLowerCase() === word.word.toLowerCase())
        const match2 = (p.en.toLowerCase() === selectedWord.word.toLowerCase() && p.sv.toLowerCase() === word.word.toLowerCase())
        return match1 || match2
      })
      
      console.log('Is match:', isMatch)
      
      if (isMatch) {
        // Correct match!
        console.log('✅ Correct match!')
        setMatchedPairs(prev => [...prev, { word1: selectedWord, word2: word }])
        setFloatingWords(prev => prev.map(w => 
          w.id === selectedWord.id || w.id === word.id ? { ...w, matched: true } : w
        ))
        
        void logWordAttempt({ word: word.word, correct: true, gameType: 'connect', context: trackingContext })
        
        // Check if game complete
        const newMatchCount = matchedPairs.length + 1
        if (newMatchCount >= pairs.length) {
          setTimeout(() => {
            void finishGame(newMatchCount, newMatchCount + wrongAttempts)
          }, 1500)
        }
    } else {
        // Wrong match
        console.log('❌ Wrong match')
        setWrongAttempts(prev => prev + 1)
        setShake(word.id)
        setTimeout(() => setShake(null), 500)
        
        void logWordAttempt({ word: word.word, correct: false, gameType: 'connect', context: trackingContext })
      }
      
      setSelectedWord(null)
    }
  }

  const finishGame = async (correct: number, attempts: number) => {
    const total = pairs.length
    const wrong = attempts - correct
    const scoreResult = calculateLineMatchingScore(correct, total, wrong)

    setAwardedPoints(scoreResult.pointsAwarded)
    onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'connect')
    
    // NOTE: Database sync handled by handleScoreUpdate in student dashboard via onScoreUpdate
    // No need to call updateStudentProgress here to avoid duplicate sessions

    const started = startedAtRef.current
    if (started) {
      const durationSec = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'connect', { 
        score: scoreResult.pointsAwarded, 
        durationSec, 
        accuracyPct: scoreResult.accuracy, 
        details: { pairs: total, correct, attempts, awarded_points: scoreResult.pointsAwarded } 
      })
    }
    setGameFinished(true)
  }

  const handleGridSelected = (grids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    if (grids.length === 0 || grids.length > 2) return
    setSelectedGrids(grids)
    setShowGridSelector(false)
    setPairs([]) // Reset pairs to trigger regeneration
    setFloatingWords([]) // Reset floating words
  }

  const restartGame = () => {
    setShowGridSelector(true)
    setSelectedGrids([])
    setSelectedWord(null)
    setMatchedPairs([])
    setGameFinished(false)
    setWrongAttempts(0)
    setShake(null)
    setPairs([])
    setFloatingWords([])
    startedAtRef.current = Date.now()
    setElapsedSec(0)
    console.log('🎮 Line Matching: Game restarted (session will be created server-side)')
    setSessionId(null)
    
    // Regenerate positions with grid layout
    const words: FloatingWord[] = []
    const cardWidth = 180
    const cardHeight = 80
    const horizontalSpacing = 40
    const verticalSpacing = 40
    
    const totalCards = shuffledPairs.length * 2 // Now 20 cards
    const cols = 5 // 5 columns
    const rows = Math.ceil(totalCards / cols) // Now 4 rows
    
    // Calculate cell dimensions to fit all cards properly
    const containerWidth = cols * cardWidth + (cols + 1) * horizontalSpacing // 1100px
    const containerHeight = rows * cardHeight + (rows + 1) * verticalSpacing // 480px
    const cellWidth = (containerWidth - 2 * horizontalSpacing) / cols // 204px per cell
    const cellHeight = (containerHeight - 2 * verticalSpacing) / rows // 100px per cell
    
    // Create all words - separate Swedish and English
    const swedishWords: FloatingWord[] = []
    const englishWords: FloatingWord[] = []
    
    shuffledPairs.forEach((pair, index) => {
      swedishWords.push({
        id: `sv-${index}`,
        word: pair.sv,
        language: 'sv',
        x: 0,
        y: 0,
        matched: false
      })
      englishWords.push({
        id: `en-${index}`,
        word: pair.en,
        language: 'en',
        x: 0,
        y: 0,
        matched: false
      })
    })
    
    // Shuffle each side separately
    const shuffledSwedish = swedishWords.sort(() => Math.random() - 0.5)
    const shuffledEnglish = englishWords.sort(() => Math.random() - 0.5)
    
    // Place Swedish words on left side
    shuffledSwedish.forEach((word, index) => {
      const col = 0 // Always left column
      const row = index % Math.ceil(shuffledSwedish.length / 2) // 2 columns worth of rows
      
      const baseX = horizontalSpacing + col * (cardWidth + horizontalSpacing * 2) + (horizontalSpacing * 2)
      const baseY = verticalSpacing + row * (cardHeight + verticalSpacing)
      
      const maxOffsetY = Math.min(10, verticalSpacing / 2)
      const randomOffsetY = (Math.random() - 0.5) * (maxOffsetY * 2)
      
      word.x = baseX
      word.y = baseY + randomOffsetY
      words.push(word)
    })
    
    // Place English words on right side
    shuffledEnglish.forEach((word, index) => {
      const containerWidth = 1200 // Approximate container width
      const col = 1 // Right column
      const row = index % Math.ceil(shuffledEnglish.length / 2) // 2 columns worth of rows
      
      const baseX = containerWidth - horizontalSpacing - (col + 1) * (cardWidth + horizontalSpacing * 2) - horizontalSpacing
      const baseY = verticalSpacing + row * (cardHeight + verticalSpacing)
      
      const maxOffsetY = Math.min(10, verticalSpacing / 2)
      const randomOffsetY = (Math.random() - 0.5) * (maxOffsetY * 2)
      
      word.x = baseX
      word.y = baseY + randomOffsetY
      words.push(word)
    })
    
    setFloatingWords(words)
  }

  if (gameFinished) {
    const correct = matchedPairs.length
    const attempts = correct + wrongAttempts
    const total = pairs.length
    const wrong = wrongAttempts
    const scoreResult = calculateLineMatchingScore(correct, total, wrong)
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
      <UniversalGameCompleteModal
        score={scoreResult.pointsAwarded}
        pointsAwarded={scoreResult.pointsAwarded}
        gameType="connect"
        accuracy={scoreResult.accuracy}
        time={formatTime(elapsedSec)}
        details={{
          correctAnswers: correct,
          totalQuestions: total,
          wrongAttempts: wrong,
          efficiency: scoreResult.accuracy
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        themeColor={themeColor}
      />
    )
  }

  // Grid selector
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={handleGridSelected}
        onClose={onClose}
        minGrids={1}
        maxGrids={2}
        wordsPerGrid={6}
        title="Select Color Grids"
        description="Choose 1-2 color grids to practice with. Swedish words on left, English on right!"
        gridConfig={gridConfig}
      />
    )
  }

  if (floatingWords.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-100">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Preparing words...</h2>
          <p className="text-gray-600">Loading your floating word game</p>
        </div>
      </div>
    )
  }

  const correctCount = matchedPairs.length

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 w-full max-w-7xl h-[90vh] shadow-2xl border border-gray-100 relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Floating Word Match</h2>
              <p className="text-sm text-gray-600">Click matching pairs!</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-purple-50 px-4 py-2 rounded-xl border-2 border-purple-200">
              <div className="text-xs text-purple-600 font-medium">Progress</div>
              <div className="text-xl font-bold text-purple-700">
                {correctCount} / {pairs.length}
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-2 rounded-xl border-2 border-gray-200">
              <div className="text-xs text-gray-600 font-medium">Time</div>
              <div className="text-xl font-bold text-gray-800">
                {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
              </div>
            </div>
            
            <button
              onClick={restartGame}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Game Area - Two Sides Layout */}
        <div className="flex-1 relative bg-gradient-to-br from-purple-100/30 via-pink-100/30 to-orange-100/30 rounded-2xl border-2 border-purple-200/50 overflow-hidden" style={{ minHeight: '600px' }}>
          {/* Left Side Label - Swedish */}
          <div className="absolute left-4 top-4 bg-yellow-200 px-4 py-2 rounded-lg border-2 border-yellow-400 z-30">
            <span className="font-bold text-yellow-900 text-sm">🇸🇪 Svenska</span>
          </div>
          
          {/* Right Side Label - English */}
          <div className="absolute right-4 top-4 bg-blue-200 px-4 py-2 rounded-lg border-2 border-blue-400 z-30">
            <span className="font-bold text-blue-900 text-sm">🇬🇧 English</span>
          </div>
          {/* Floating Words */}
          {floatingWords.map((word) => {
            const isSelected = selectedWord?.id === word.id
            const isSwedish = word.language === 'sv'
            
            return (
              <div
                key={word.id}
                onClick={() => handleWordClick(word)}
                className={`
                  absolute cursor-pointer transition-all duration-700
                  ${word.matched ? 'opacity-0 scale-150 pointer-events-none' : 'opacity-100 scale-100'}
                  ${isSelected ? 'scale-110 z-20' : 'scale-100 z-10'}
                  ${shake === word.id ? 'animate-shake' : ''}
                `}
                  style={{ 
                  left: `${word.x}px`,
                  top: `${word.y}px`,
                  transitionDelay: word.matched ? '800ms' : '0ms'
                }}
              >
                <div
                  className={`
                    w-40 px-3 py-2.5 rounded-xl border-2 font-medium text-center shadow-md text-sm
                    transition-all duration-200 hover:scale-105 hover:shadow-xl relative
                    ${isSelected
                      ? 'bg-gradient-to-br from-blue-400 to-purple-500 border-blue-500 text-white scale-110 shadow-2xl'
                      : word.matched
                      ? 'bg-gradient-to-br from-emerald-400 to-green-500 border-emerald-500 text-white'
                      : isSwedish
                      ? 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-300 text-gray-800 hover:from-yellow-200 hover:to-orange-200'
                      : 'bg-gradient-to-br from-blue-100 to-purple-100 border-blue-300 text-gray-800 hover:from-blue-200 hover:to-purple-200'
                    }
                  `}
                  style={{
                    maxWidth: '160px',
                    minHeight: '70px',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                >
                  {word.matched && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex items-center justify-center h-full">
                    <span className={`font-bold text-sm leading-tight ${isSelected || word.matched ? 'text-white' : ''}`} style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      {word.word}
                    </span>
                  </div>
            </div>
          </div>
            )
          })}

        </div>

        {/* Instruction */}
        <div className="mt-4 text-center flex-shrink-0">
          <p className="text-sm text-gray-600">
            💡 <span className="font-medium">Click a Swedish word on the left, then click its English translation on the right!</span>
          </p>
        </div>
      </div>

      {/* Global animation styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .animate-shake {
            animation: shake 0.3s ease-in-out;
          }
        `
      }} />
    </div>
  )
}
