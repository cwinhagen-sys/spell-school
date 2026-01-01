'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Shuffle, X, RotateCcw, CheckCircle2, Trophy, Zap } from 'lucide-react'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateScrambleScore } from '@/lib/gameScoring'
import ColorGridSelector, { GridConfig } from '@/components/ColorGridSelector'

interface ScrambleGameProps {
  words: string[]
  translations?: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, total?: number, gameType?: string) => void
  sessionMode?: boolean
  themeColor?: string
  gridConfig?: GridConfig[]
}

type LetterStatus = 'neutral' | 'correct' | 'incorrect'

export default function ScrambleGame({ 
  words, 
  translations = {},
  onClose, 
  onScoreUpdate, 
  sessionMode = false,
  gridConfig,
}: ScrambleGameProps) {
  // Grid selection state
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode)
  const [activeWords, setActiveWords] = useState<string[]>([])
  
  // Game state
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([])
  const [letterStatuses, setLetterStatuses] = useState<Map<number, LetterStatus>>(new Map())
  const [animatingLetters, setAnimatingLetters] = useState<Set<number>>(new Set())
  const [gameFinished, setGameFinished] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [score, setScore] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [wordCorrect, setWordCorrect] = useState(false)
  const [streak, setStreak] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef<number | null>(null)
  const previousInputRef = useRef('')

  // Convert words to English if they are Swedish
  // translations object has bidirectional mapping: translations[englishWord] = swedishWord and translations[swedishWord] = englishWord
  // The words prop should contain English words (from vocabulary_words)
  const convertToEnglishWords = useCallback((wordList: string[], gridTranslations?: Record<string, string>): string[] => {
    // Combine main translations with grid-specific translations
    const allTranslations = gridTranslations ? { ...translations, ...gridTranslations } : translations
    
    // Create a set of English words from the original words prop for quick lookup
    const englishWordsSet = new Set(words.map(w => w.toLowerCase()))

    return wordList.map(word => {
      if (!word) return word
      const lowerWord = word.toLowerCase()
      
      // If word is already in the English words set, it's English
      if (englishWordsSet.has(lowerWord)) {
        return lowerWord
      }
      
      // Check if word has a translation
      if (allTranslations[lowerWord]) {
        const translation = allTranslations[lowerWord].toLowerCase()
        
        // If the translation is in the English words set, use it
        if (englishWordsSet.has(translation)) {
          return translation
        }
        
        // Check if translation maps back (bidirectional)
        if (allTranslations[translation]?.toLowerCase() === lowerWord) {
          // We have a bidirectional pair
          // Use the one that's in the English words set, or default to translation
          return englishWordsSet.has(translation) ? translation : lowerWord
        }
      }
      
      // Try to find word as a Swedish value in translations
      for (const [key, value] of Object.entries(allTranslations)) {
        if (value && typeof value === 'string' && value.toLowerCase() === lowerWord) {
          const lowerKey = key.toLowerCase()
          // If key is in English words set, use it
          if (englishWordsSet.has(lowerKey)) {
            return lowerKey
          }
        }
      }
      
      // If not found, assume it's already English
      return lowerWord
    })
  }, [translations, words])

  // Handle grid selection
  const handleGridSelection = (grids: Array<{ words: string[], translations: Record<string, string> }>) => {
    // Combine all grid translations
    const combinedTranslations: Record<string, string> = { ...translations }
    grids.forEach(grid => {
      Object.assign(combinedTranslations, grid.translations)
    })
    
    // Get all words from grids and convert to English
    const selectedWords = grids.flatMap(g => g.words)
    const englishWords = convertToEnglishWords(selectedWords, combinedTranslations)
    setActiveWords(englishWords)
    setShowGridSelector(false)
  }

  // Shuffle function that ensures letters are actually shuffled
  const shuffleLetters = useCallback((letters: string[]): string[] => {
    const shuffled = [...letters]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // If shuffled is same as original and word is longer than 1 char, shuffle again
    if (shuffled.join('') === letters.join('') && letters.length > 1) {
      return shuffleLetters(letters)
    }
    return shuffled
  }, [])

  // Initialize game when activeWords changes
  useEffect(() => {
    if (activeWords.length === 0) return
    startedAtRef.current = Date.now()
    initializeWord(0)
  }, [activeWords])

  // For session mode, use words directly (converted to English)
  useEffect(() => {
    if (sessionMode && words.length > 0) {
      const englishWords = convertToEnglishWords(words)
      setActiveWords(englishWords)
      setShowGridSelector(false)
    }
  }, [sessionMode, words, convertToEnglishWords])

  // Focus input when word changes
  useEffect(() => {
    if (inputRef.current && !gameFinished && !wordCorrect && !showGridSelector) {
      inputRef.current.focus()
    }
  }, [currentWordIndex, gameFinished, wordCorrect, showGridSelector])

  // Initialize current word
  const initializeWord = (index: number) => {
    if (index >= activeWords.length) {
      finishGame(score)
      return
    }

    const currentWord = activeWords[index].toLowerCase()
    const letters = currentWord.split('')
    const shuffled = shuffleLetters(letters)
    
    setShuffledLetters(shuffled)
    setUserInput('')
    setLetterStatuses(new Map())
    setAnimatingLetters(new Set())
    setWordCorrect(false)
    previousInputRef.current = ''
  }

  // Handle input change with animation
  const handleInputChange = (value: string) => {
    if (gameFinished || wordCorrect) return

    const currentWord = activeWords[currentWordIndex].toLowerCase()
    const normalizedValue = value.toLowerCase()
    
    // Limit input to word length
    if (normalizedValue.length > currentWord.length) {
      return
    }

    const previousInput = previousInputRef.current
    previousInputRef.current = normalizedValue
    setUserInput(normalizedValue)

    // Detect newly typed letters for animation
    if (normalizedValue.length > previousInput.length) {
      const newIndex = normalizedValue.length - 1
      const inputChar = normalizedValue[newIndex]
      
      // Find which shuffled letter to animate
      for (let j = 0; j < shuffledLetters.length; j++) {
        if (shuffledLetters[j] === inputChar && !animatingLetters.has(j)) {
          setAnimatingLetters(prev => new Set([...prev, j]))
          // Remove animation after delay
          setTimeout(() => {
            setAnimatingLetters(prev => {
              const next = new Set(prev)
              next.delete(j)
              return next
            })
          }, 150)
          break
        }
      }
    }

    // Update letter statuses
    const newStatuses = new Map<number, LetterStatus>()
    const currentWordLetters = currentWord.split('')
    const usedIndices = new Set<number>()

    // Mark letters based on position correctness
    for (let i = 0; i < normalizedValue.length; i++) {
      const inputChar = normalizedValue[i]
      const correctChar = currentWordLetters[i]
      
      if (inputChar === correctChar) {
        // Find matching letter in shuffled
        for (let j = 0; j < shuffledLetters.length; j++) {
          if (shuffledLetters[j] === inputChar && !usedIndices.has(j)) {
            newStatuses.set(j, 'correct')
            usedIndices.add(j)
            break
          }
        }
      } else {
        // Wrong position
        for (let j = 0; j < shuffledLetters.length; j++) {
          if (shuffledLetters[j] === inputChar && !usedIndices.has(j)) {
            newStatuses.set(j, 'incorrect')
            usedIndices.add(j)
            break
          }
        }
      }
    }

    setLetterStatuses(newStatuses)

    // Check if word is complete and correct
    if (normalizedValue === currentWord) {
      setWordCorrect(true)
      setScore(prev => prev + 1)
      setStreak(prev => prev + 1)
      
      // Auto advance after delay
      setTimeout(() => {
        if (currentWordIndex + 1 < activeWords.length) {
          setCurrentWordIndex(prev => prev + 1)
          initializeWord(currentWordIndex + 1)
        } else {
          finishGame(score + 1)
        }
      }, 600)
    }
  }

  // Finish game
  const finishGame = (finalScore: number) => {
    setGameFinished(true)
    
    const scoreResult = calculateScrambleScore(finalScore, activeWords.length, wrongAttempts)
    
    if (sessionMode) {
      onScoreUpdate(scoreResult.pointsAwarded, scoreResult.pointsAwarded, 'scramble')
      setTimeout(() => {
        onClose()
      }, 500)
    } else {
      onScoreUpdate(scoreResult.pointsAwarded, scoreResult.pointsAwarded, 'scramble')
      setShowComplete(true)
    }
  }

  // Reset current word
  const resetWord = () => {
    setStreak(0)
    setWrongAttempts(prev => prev + 1)
    initializeWord(currentWordIndex)
  }

  // Reshuffle letters
  const reshuffleLetters = () => {
    const currentWord = activeWords[currentWordIndex].toLowerCase()
    const letters = currentWord.split('')
    setShuffledLetters(shuffleLetters(letters))
    setUserInput('')
    setLetterStatuses(new Map())
    previousInputRef.current = ''
    inputRef.current?.focus()
  }

  // Play again handler
  const handlePlayAgain = () => {
    setCurrentWordIndex(0)
    setScore(0)
    setWrongAttempts(0)
    setStreak(0)
    setGameFinished(false)
    setShowComplete(false)
    setShowGridSelector(true) // Go back to grid selector
  }

  // Calculate score result for modal
  const scoreResult = calculateScrambleScore(score, activeWords.length || 1, wrongAttempts)

  // Show grid selector first (unless in session mode)
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={handleGridSelection}
        onClose={onClose}
        minGrids={1}
        maxGrids={undefined}
        wordsPerGrid={6}
        title="Select Word Blocks"
        description="Choose which word blocks you want to practice"
        gridConfig={gridConfig}
      />
    )
  }

  // Empty words state
  if (activeWords.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50">
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10 shadow-2xl">
          <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Shuffle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Words Available</h2>
          <p className="text-gray-400 mb-6">Please select a word set to play</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-400 hover:to-orange-400 transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Show complete modal
  if (showComplete) {
    return (
      <UniversalGameCompleteModal
        score={scoreResult.pointsAwarded}
        pointsAwarded={scoreResult.pointsAwarded}
        gameType="scramble"
        accuracy={scoreResult.accuracy}
        details={{
          correctAnswers: score,
          totalQuestions: activeWords.length,
          wrongAttempts
        }}
        onPlayAgain={handlePlayAgain}
        onBackToDashboard={onClose}
        themeColor="#f59e0b"
      />
    )
  }

  // Session mode finish
  if (gameFinished && sessionMode) {
    return null
  }

  const currentWord = activeWords[currentWordIndex]?.toLowerCase() || ''
  const progress = ((currentWordIndex) / activeWords.length) * 100
  const isComplete = wordCorrect

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-4">
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <Shuffle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Word Scramble</h2>
                <p className="text-sm text-gray-400">Word {currentWordIndex + 1} of {activeWords.length}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between mb-6 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-white font-bold">{score}</span>
              <span className="text-gray-400 text-sm">correct</span>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-bold text-sm">{streak} streak</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Scrambled Letters Display */}
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2 text-center font-medium uppercase tracking-wider">Unscramble these letters</p>
            {/* Translation hint */}
            {translations && currentWord && translations[currentWord] && (
              <p className="text-sm text-amber-400 mb-4 text-center font-medium">
                {translations[currentWord]}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              {shuffledLetters.map((letter, index) => {
                const status = letterStatuses.get(index) || 'neutral'
                const isAnimating = animatingLetters.has(index)
                
                return (
                  <div
                    key={`${currentWordIndex}-${index}`}
                    className={`
                      w-12 h-12 md:w-14 md:h-14 rounded-lg font-bold text-xl md:text-2xl flex items-center justify-center uppercase transition-all duration-150
                      ${status === 'correct'
                        ? 'bg-amber-500 border border-amber-400 text-white'
                        : status === 'incorrect'
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                        : 'bg-white/10 border border-white/20 text-white'
                      }
                      ${isAnimating ? 'scale-110' : 'scale-100'}
                    `}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Input Field */}
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3 text-center font-medium">Type the word</p>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                disabled={isComplete}
                className={`
                  w-full px-6 py-4 text-2xl md:text-3xl font-bold text-center rounded-xl border transition-all duration-150 tracking-[0.3em] uppercase
                  ${isComplete
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-white/5 border-white/20 text-white focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 placeholder:text-white/20'
                  }
                `}
                placeholder="..."
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {isComplete && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Character count */}
            <div className="flex justify-center mt-2">
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <span className="font-bold text-white">{userInput.length}</span>
                <span>/</span>
                <span>{currentWord.length}</span>
                <span className="ml-1">letters</span>
              </div>
            </div>
          </div>

          {/* Success Feedback */}
          {isComplete && (
            <div className="mb-6 text-center p-4 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <span className="text-amber-300 font-bold text-lg">Correct!</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={resetWord}
              disabled={isComplete}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 hover:text-white transition-colors duration-150"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={reshuffleLetters}
              disabled={isComplete}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500/30 transition-colors duration-150"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>

            <button
              onClick={() => {
                if (currentWordIndex + 1 < activeWords.length) {
                  setCurrentWordIndex(prev => prev + 1)
                  initializeWord(currentWordIndex + 1)
                  setStreak(0)
                } else {
                  finishGame(score)
                }
              }}
              disabled={isComplete}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 hover:text-white transition-colors duration-150"
            >
              <span className="hidden sm:inline">Skip</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
