'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { CheckCircle2, XCircle, Scissors, X, Loader2 } from 'lucide-react'

interface ScrambleGameProps {
  words: string[] // English words
  translations: { [key: string]: string } // English word -> Swedish translation
  onClose: () => void
  onScoreUpdate: (score: number, total?: number, gameType?: string) => void
  sessionMode?: boolean
  themeColor?: string
}

type LetterStatus = 'neutral' | 'correct' | 'incorrect'

export default function ScrambleGame({ 
  words, 
  translations = {}, 
  onClose, 
  onScoreUpdate, 
  sessionMode = false,
  themeColor = '#6366f1' 
}: ScrambleGameProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([])
  const [letterStatuses, setLetterStatuses] = useState<Map<number, LetterStatus>>(new Map())
  const [gameFinished, setGameFinished] = useState(false)
  const [score, setScore] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef<number | null>(null)

  // Create word pairs with Swedish translation
  const wordPairs = useMemo(() => {
    return words.map(word => ({
      english: word,
      swedish: translations[word.toLowerCase()] || translations[word] || word
    }))
  }, [words, translations])

  // Initialize game
  useEffect(() => {
    if (wordPairs.length === 0) return
    
    startedAtRef.current = Date.now()
    initializeWord(currentWordIndex)
  }, [wordPairs.length])

  // Focus input when word changes
  useEffect(() => {
    if (inputRef.current && !gameFinished) {
      inputRef.current.focus()
    }
  }, [currentWordIndex, gameFinished])

  // Initialize current word
  const initializeWord = (index: number) => {
    if (index >= wordPairs.length) {
      setGameFinished(true)
      return
    }

    const currentWord = wordPairs[index].english.toLowerCase()
    const letters = currentWord.split('')
    
    // Shuffle letters
    const shuffled = [...letters].sort(() => Math.random() - 0.5)
    
    setShuffledLetters(shuffled)
    setUserInput('')
    setLetterStatuses(new Map())
  }

  // Handle input change
  const handleInputChange = (value: string) => {
    if (gameFinished) return

    const currentWord = wordPairs[currentWordIndex].english.toLowerCase()
    const normalizedValue = value.toLowerCase()
    
    // Limit input to word length
    if (normalizedValue.length > currentWord.length) {
      return
    }

    setUserInput(normalizedValue)

    // Update letter statuses
    const newStatuses = new Map<number, LetterStatus>()
    const currentWordLetters = currentWord.split('')
    const usedIndices = new Set<number>()

    // First pass: Mark correct letters (green) - prioritize exact position matches
    for (let i = 0; i < normalizedValue.length; i++) {
      const inputChar = normalizedValue[i]
      const correctChar = currentWordLetters[i]
      
      if (inputChar === correctChar) {
        // Find this exact letter in shuffled letters that matches the position
        // We need to find which shuffled letter corresponds to this position
        // Since letters are shuffled, we need to track which letters are used
        for (let j = 0; j < shuffledLetters.length; j++) {
          if (shuffledLetters[j] === correctChar && !usedIndices.has(j)) {
            newStatuses.set(j, 'correct')
            usedIndices.add(j)
            break
          }
        }
      }
    }

    // Second pass: Mark incorrect letters (red) - for wrong characters
    for (let i = 0; i < normalizedValue.length; i++) {
      const inputChar = normalizedValue[i]
      const correctChar = currentWordLetters[i]
      
      if (inputChar !== correctChar) {
        // Wrong letter - mark as incorrect (red) in shuffled letters
        // Find a matching letter in shuffled that hasn't been used
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
    if (normalizedValue.length === currentWord.length && normalizedValue === currentWord) {
      // Word is correct - move to next after brief delay
      const newScore = score + 1
      setScore(newScore)
      
      setTimeout(() => {
        if (currentWordIndex < wordPairs.length - 1) {
          const nextIndex = currentWordIndex + 1
          setCurrentWordIndex(nextIndex)
          initializeWord(nextIndex)
        } else {
          // All words completed
          finishGame(newScore)
        }
      }, 1000)
    }
  }

  // Finish game
  const finishGame = (finalScore?: number) => {
    setGameFinished(true)
    const totalWords = wordPairs.length
    const correctWords = finalScore !== undefined ? finalScore : score
    
    if (sessionMode) {
      // In session mode, pass correctWords and totalWords for percentage calculation
      onScoreUpdate(correctWords, totalWords, 'scramble')
      // Automatically close after a brief delay
      setTimeout(() => {
        onClose()
      }, 500)
    } else {
      onScoreUpdate(correctWords, totalWords, 'scramble')
    }
  }

  // Reset current word
  const resetWord = () => {
    initializeWord(currentWordIndex)
  }

  if (wordPairs.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
          <p className="text-gray-600">Inga ord tillgängliga</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            Stäng
          </button>
        </div>
      </div>
    )
  }

  if (gameFinished) {
    // In session mode, don't show completion screen
    if (sessionMode) {
      return null
    }
    
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Spel Klart!</h2>
          <p className="text-gray-600 mb-6">
            Du fick {score} av {wordPairs.length} ord rätt!
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold"
          >
            Stäng
          </button>
        </div>
      </div>
    )
  }

  const currentPair = wordPairs[currentWordIndex]
  const currentWord = currentPair.english.toLowerCase()
  const progress = ((currentWordIndex + 1) / wordPairs.length) * 100
  const isComplete = userInput.length === currentWord.length && userInput === currentWord

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-lg border border-gray-200 relative my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Word Scramble</h2>
              <p className="text-sm text-gray-600">Word {currentWordIndex + 1} of {wordPairs.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            title="Back to game selection"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">{Math.round(progress)}%</span>
            <span className="font-medium">{score} / {wordPairs.length} correct</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-emerald-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Swedish Word Display */}
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-600 mb-2">What is the English word for:</p>
          <h3 className="text-4xl font-bold text-gray-900">{currentPair.swedish}</h3>
        </div>

        {/* Input Field */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Skriv ordet:</p>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isComplete}
              className={`
                w-full px-6 py-4 text-2xl font-bold text-center rounded-2xl border-2 transition-all
                ${isComplete
                  ? 'bg-green-50 border-green-400 text-green-700'
                  : 'bg-gray-50 border-indigo-300 text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                }
              `}
              placeholder="Skriv här..."
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {isComplete && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            )}
          </div>
        </div>

        {/* Shuffled Letters with Status Indicators */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Blandade bokstäver:</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {shuffledLetters.map((letter, index) => {
              const status = letterStatuses.get(index) || 'neutral'
              return (
                <div
                  key={index}
                  className={`
                    w-14 h-14 rounded-xl font-bold text-xl flex items-center justify-center transition-all
                    ${status === 'correct'
                      ? 'bg-green-500 text-white shadow-lg'
                      : status === 'incorrect'
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-white border-2 border-indigo-300 text-indigo-700'
                    }
                  `}
                >
                  {letter.toUpperCase()}
                </div>
              )
            })}
          </div>
        </div>

        {/* Feedback */}
        {isComplete && (
          <div className="mb-6 text-center p-4 rounded-2xl bg-green-50 border-2 border-green-200">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span className="text-green-700 font-semibold text-lg">Rätt! 🎉</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={resetWord}
            disabled={isComplete}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Börja om
          </button>

          <div className="text-sm text-gray-500">
            {userInput.length} / {currentWord.length} tecken
          </div>
        </div>
      </div>
    </div>
  )
}
