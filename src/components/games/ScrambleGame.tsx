'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { CheckCircle2, XCircle, Scissors, X, Loader2, RotateCcw, ArrowRight } from 'lucide-react'

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
        for (let j = 0; j < shuffledLetters.length; j++) {
          if (shuffledLetters[j] === inputChar && !usedIndices.has(j)) {
            newStatuses.set(j, 'correct')
            usedIndices.add(j)
            break
          }
        }
      }
    }

    // Second pass: Mark wrong positions (red)
    for (let i = 0; i < normalizedValue.length; i++) {
      const inputChar = normalizedValue[i]
      const correctChar = currentWordLetters[i]
      
      if (inputChar !== correctChar) {
        // Find any unused letter that matches this char
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
      setScore(prev => prev + 1)
      
      // Auto advance after a short delay
      setTimeout(() => {
        if (currentWordIndex + 1 < wordPairs.length) {
          setCurrentWordIndex(prev => prev + 1)
          initializeWord(currentWordIndex + 1)
        } else {
          // Game finished
          finishGame(score + 1)
        }
      }, 800)
    }
  }

  // Finish game
  const finishGame = (finalScore?: number) => {
    setGameFinished(true)
    const totalWords = wordPairs.length
    const correctWords = finalScore !== undefined ? finalScore : score
    
    if (sessionMode) {
      onScoreUpdate(correctWords, totalWords, 'scramble')
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
      <div className="fixed inset-0 bg-[#08080f] flex items-center justify-center p-4 z-50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[100px]" />
        </div>
        <div className="relative bg-[#161622] rounded-2xl p-8 text-center border border-white/[0.08]">
          <div className="w-16 h-16 bg-[#1a1a2e] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-gray-400 mb-6">Inga ord tillgängliga</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            Stäng
          </button>
        </div>
      </div>
    )
  }

  if (gameFinished) {
    if (sessionMode) {
      return null
    }
    
    const percentage = Math.round((score / wordPairs.length) * 100)
    
    return (
      <div className="fixed inset-0 bg-[#08080f] flex items-center justify-center p-4 z-50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[80px]" />
        </div>
        
        <div className="relative bg-[#161622] rounded-2xl p-10 text-center max-w-md w-full border border-white/[0.08]">
          <div className="w-20 h-20 bg-[#1a1a2e] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Spel Klart!</h2>
          <p className="text-gray-400 mb-8">
            Du fick <span className="text-white font-bold">{score}</span> av <span className="text-white font-bold">{wordPairs.length}</span> ord rätt!
          </p>
          
          <div className={`text-5xl font-bold mb-8 ${
            percentage >= 80 ? 'text-emerald-400' : percentage >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {percentage}%
          </div>
          
          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-400 hover:to-orange-400 transition-all"
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
    <div className="fixed inset-0 bg-[#08080f] flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-teal-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[80px]" />
      </div>
      
      <div className="relative w-full max-w-3xl my-4">
        <div className="relative bg-[#161622] rounded-2xl p-6 md:p-8 border border-white/[0.08]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a2e] border border-white/[0.08] rounded-xl flex items-center justify-center">
                <Scissors className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Word Scramble</h2>
                <p className="text-sm text-gray-500">Ord {currentWordIndex + 1} av {wordPairs.length}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/[0.08]"
              title="Tillbaka till spelval"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500 font-medium">{Math.round(progress)}%</span>
              <span className="text-teal-400 font-semibold">{score} rätt</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Swedish Word Display */}
          <div className="mb-8 text-center">
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-3">Vad heter detta på engelska?</p>
            <h3 className="text-4xl md:text-5xl font-bold text-white px-8 py-4 bg-white/5 rounded-2xl border border-white/[0.08]">
              {currentPair.swedish}
            </h3>
          </div>

          {/* Input Field */}
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-3 text-center">Skriv ordet:</p>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                disabled={isComplete}
                className={`
                  w-full px-6 py-5 text-2xl md:text-3xl font-bold text-center rounded-2xl border-2 transition-all tracking-wider
                  ${isComplete
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border-white/[0.08] text-white focus:border-teal-500/30 focus:ring-2 focus:ring-teal-500/10'
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
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              )}
            </div>
          </div>

          {/* Shuffled Letters */}
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-4 text-center">Blandade bokstäver:</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {shuffledLetters.map((letter, index) => {
                const status = letterStatuses.get(index) || 'neutral'
                return (
                  <div
                    key={index}
                    className={`
                      w-12 h-12 md:w-14 md:h-14 rounded-xl font-bold text-xl md:text-2xl flex items-center justify-center transition-all duration-300
                      ${status === 'correct'
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                        : status === 'incorrect'
                        ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                        : 'bg-white/5 border border-white/[0.08] text-white'
                      }
                    `}
                  >
                    {letter.toUpperCase()}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Success Feedback */}
          {isComplete && (
            <div className="mb-8 text-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-lg">Rätt! 🎉</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Loading next word...</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={resetWord}
              disabled={isComplete}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/[0.08] text-gray-400 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Börja om
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-white font-bold">{userInput.length}</span>
              <span>/</span>
              <span>{currentWord.length}</span>
              <span>tecken</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
