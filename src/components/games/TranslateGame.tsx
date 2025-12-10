'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, ArrowLeft, Star, CheckCircle, XCircle, Languages, ArrowRight, RefreshCw, Globe, Loader2 } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateTranslateScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

interface TranslateGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number, gameType?: string) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
}

interface WordPair {
  original: string
  target: string
  originalLanguage: 'en' | 'sv'
  targetLanguage: 'sv' | 'en'
}

interface WordResult {
  word: string
  translation: string
  correct: boolean
  attempts: number
  userAnswer?: string
  firstTryCorrect: boolean // True if correct on first attempt
}

type Direction = 'en-to-sv' | 'sv-to-en' | 'mixed'

export default function TranslateGame({ words, translations, onClose, onScoreUpdate, trackingContext, themeColor, gridConfig, sessionMode = false }: TranslateGameProps) {
  // Game state
  // In session mode, skip grid selection and start at direction selection
  const [gamePhase, setGamePhase] = useState<'select-grids' | 'select-direction' | 'playing' | 'results'>(sessionMode ? 'select-direction' : 'select-grids')
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [direction, setDirection] = useState<Direction>('mixed')

  // Don't auto-initialize from gridConfig - always show grid selector for user to choose blocks
  // gridConfig will be passed to ColorGridSelector to show the correct blocks
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [wordPairs, setWordPairs] = useState<WordPair[]>([])
  const [wordResults, setWordResults] = useState<WordResult[]>([])
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef<number | null>(null)
  const [attemptsForCurrent, setAttemptsForCurrent] = useState(0)
  const [solutionRevealed, setSolutionRevealed] = useState(false)
  const [awardedPoints, setAwardedPoints] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const correctCountRef = useRef(0)
  const [wrongClicks, setWrongClicks] = useState(0)
  const wrongClicksRef = useRef(0)

  // Count-up timer
  useEffect(() => {
    if (gamePhase !== 'playing') return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gamePhase])

  // Keep the input focused
  useEffect(() => {
    if (gamePhase === 'playing' && !showFeedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentWordIndex, showFeedback, gamePhase])

  const initializeGame = (selectedDirection: Direction, wordsToUse?: WordPair[]) => {
    let pairs: WordPair[] = []
    
    if (wordsToUse) {
      // Replay with specific words
      pairs = wordsToUse
    } else if (sessionMode && words && words.length > 0) {
      // In session mode, use words/translations directly
      // words are English, translations[word] are Swedish
      console.log('🔄 Translate initializeGame (session mode):', words.length, 'words')
      const shuffledWords = [...words].sort(() => Math.random() - 0.5)
      
      shuffledWords.forEach((word) => {
        const translation = translations[word.toLowerCase()]
        if (translation && translation !== `[${word}]`) {
          if (selectedDirection === 'en-to-sv' || selectedDirection === 'mixed') {
            // English to Swedish: show English word, user translates to Swedish
            pairs.push({
              original: word,  // English word
              target: translation,  // Swedish translation
              originalLanguage: 'en',
              targetLanguage: 'sv'
            })
          }
        
          if (selectedDirection === 'sv-to-en' || selectedDirection === 'mixed') {
            // Swedish to English: show Swedish word, user translates to English
            pairs.push({
              original: translation,  // Swedish word
              target: word,  // English translation
              originalLanguage: 'sv',
              targetLanguage: 'en'
            })
          }
        }
      })
      
      // Shuffle the pairs
      pairs = pairs.sort(() => Math.random() - 0.5)
    } else {
      // New game - use selected grids
      console.log('🔄 Translate initializeGame:', {
        selectedGridsLength: selectedGrids.length,
        selectedDirection
      })
      
      // IMPORTANT: Use selectedGrids (user's selected blocks), not entire gridConfig
      const allSelectedWords: string[] = []
      const allSelectedTranslations: { [key: string]: string } = {}
      
      // Use selectedGrids which only contains the blocks the user selected
      selectedGrids.forEach((grid, gridIdx) => {
        console.log(`🔄 Selected Grid ${gridIdx}:`, grid.words.length, 'words')
        allSelectedWords.push(...grid.words)
        Object.assign(allSelectedTranslations, grid.translations)
      })
      
      const shuffledWords = [...allSelectedWords].sort(() => Math.random() - 0.5)
    
      shuffledWords.forEach((word) => {
        const translation = allSelectedTranslations[word.toLowerCase()] || translations[word.toLowerCase()]
        if (translation && translation !== `[${word}]`) {
          if (selectedDirection === 'en-to-sv' || selectedDirection === 'mixed') {
            pairs.push({
              original: translation,
              target: word,
              originalLanguage: 'en',
              targetLanguage: 'sv'
            })
          }
        
          if (selectedDirection === 'sv-to-en' || selectedDirection === 'mixed') {
            pairs.push({
              original: word,
              target: translation,
              originalLanguage: 'sv',
              targetLanguage: 'en'
            })
          }
        } else {
          console.log(`🔄 No translation found for "${word}", skipping`)
        }
      })
    
      // Shuffle the pairs
      pairs = pairs.sort(() => Math.random() - 0.5)
    }
    
    setWordPairs(pairs)
    setCurrentWordIndex(0)
    setWordResults([])
    setCorrectCount(0)
    setWrongClicks(0)
    correctCountRef.current = 0
    wrongClicksRef.current = 0
    setUserAnswer('')
    setIsCorrect(null)
    setShowFeedback(false)
    setAttemptsForCurrent(0)
    setSolutionRevealed(false)
    setElapsedSec(0)
    startedAtRef.current = Date.now()
    
    // Start game session (server-side)
    console.log('🎮 Translate: Game started (session will be created server-side)')
    setSessionId(null)
  }

  const startGame = (selectedDirection: Direction) => {
    setDirection(selectedDirection)
    initializeGame(selectedDirection)
    setGamePhase('playing')
  }

  const currentPair = wordPairs[currentWordIndex]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userAnswer.trim() || !currentPair) return

    const isAnswerCorrect = userAnswer.toLowerCase().trim() === currentPair.target.toLowerCase().trim()
    setIsCorrect(isAnswerCorrect)
    setShowFeedback(true)

    if (isAnswerCorrect) {
      setCorrectCount(prev => {
        const next = prev + 1
        correctCountRef.current = next
        return next
      })
      
      // Record successful result
      const isFirstTry = attemptsForCurrent === 0
      setWordResults(prev => [...prev, {
        word: currentPair.original,
        translation: currentPair.target,
        correct: true,
        attempts: attemptsForCurrent + 1,
        userAnswer: userAnswer.trim(),
        firstTryCorrect: isFirstTry
      }])
      
      void logWordAttempt({ 
        word: currentPair.original, 
        correct: true, 
        gameType: 'translate', 
        context: trackingContext 
      })
      
      // Advance to next word
      setTimeout(() => {
        if (currentWordIndex < wordPairs.length - 1) {
          setCurrentWordIndex(currentWordIndex + 1)
          setUserAnswer('')
          setIsCorrect(null)
          setShowFeedback(false)
          setAttemptsForCurrent(0)
          setSolutionRevealed(false)
        } else {
          finishGame()
        }
      }, 800)
      return
    } else {
      void logWordAttempt({ 
        word: currentPair.original, 
        correct: false, 
        gameType: 'translate', 
        context: trackingContext 
      })
      
      const nextAttempts = attemptsForCurrent + 1
      setAttemptsForCurrent(nextAttempts)
      
      if (nextAttempts >= 3) {
        // Only count as wrong click when all 3 attempts are used
        setWrongClicks(prev => {
          const next = prev + 1
          wrongClicksRef.current = next
          return next
        })
        
        // Reveal the correct answer
        setSolutionRevealed(true)
        
        // Record failed result (missed all attempts)
        setWordResults(prev => [...prev, {
          word: currentPair.original,
          translation: currentPair.target,
          correct: false,
          attempts: nextAttempts,
          userAnswer: userAnswer.trim(),
          firstTryCorrect: false
        }])
      } else {
        // Stay on same word, hide feedback after delay
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

  const finishGame = async () => {
    const total = wordPairs.length
    const finalCorrect = correctCountRef.current
    const wrong = wrongClicksRef.current
    
    console.log('🎮 TranslateGame BEFORE calculateTranslateScore:')
    console.log('  total:', total)
    console.log('  finalCorrect:', finalCorrect)
    console.log('  wrong:', wrong)
    console.log('  wordPairsLength:', wordPairs.length)
    console.log('  correctCount:', correctCount)
    console.log('  wordPairs:', wordPairs.map(p => ({ original: p.original, target: p.target })))
    
    // Calculate base score
    const baseScoreResult = calculateTranslateScore(finalCorrect, total, wrong)
    
    // Multiply by number of grids selected (more grids = more XP potential)
    const gridMultiplier = selectedGrids.length
    const adjustedPoints = Math.round(baseScoreResult.pointsAwarded * gridMultiplier)
    const scoreResult = {
      ...baseScoreResult,
      pointsAwarded: adjustedPoints
    }

    console.log('🎮 TranslateGame FINISH DEBUG:')
    console.log('  total:', total)
    console.log('  correctCount:', finalCorrect)
    console.log('  wrongClicks:', wrong)
    console.log('  grids selected:', selectedGrids.length)
    console.log('  base points:', baseScoreResult.pointsAwarded)
    console.log('  grid multiplier:', gridMultiplier)
    console.log('  final points:', adjustedPoints)
    console.log('  calculatedAccuracy:', scoreResult.accuracy)
    console.log('  wordPairs:', wordPairs.map(p => ({ original: p.original, target: p.target })))
    console.log('  wordResults:', wordResults)

    setAwardedPoints(scoreResult.pointsAwarded)
    
    if (sessionMode) {
      // In session mode, pass correctAnswers and totalQuestions for percentage calculation
      onScoreUpdate(finalCorrect, total, 'translate')
      
      // If 100% correct, automatically return to game selection after a delay
      if (finalCorrect === total) {
        setTimeout(() => {
          onClose()
        }, 500)
        return
      } else {
        // Show results but allow replay
        setGamePhase('results')
      }
    } else {
      // INSTANT UI UPDATE: Send points to parent for immediate UI update
      onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'translate')
      
      // BACKGROUND SYNC: Update database in background (non-blocking)
      // NOTE: Database sync handled by handleScoreUpdate in student dashboard via onScoreUpdate
      // No need to call updateStudentProgress here to avoid duplicate sessions
      
      const started = startedAtRef.current
      
      if (started) {
        const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
        console.log('📊 TranslateGame calling endGameSession with:', {
          sessionId,
          gameType: 'translate',
          metrics: {
            score: scoreResult.pointsAwarded,
            durationSec: duration,
            accuracyPct: scoreResult.accuracy,
            details: { correct: finalCorrect, total, wrongClicks: wrong }
          }
        })
        
        void endGameSession(sessionId, 'translate', { 
          score: scoreResult.pointsAwarded, 
          durationSec: duration, 
          accuracyPct: scoreResult.accuracy,
          details: { correct: finalCorrect, total, wrongClicks: wrong, awarded_points: scoreResult.pointsAwarded } 
        })
      }
      
      setGamePhase('results')
    }
  }

  const playAgainAllWords = () => {
    setGamePhase('select-grids')
    setCurrentWordIndex(0)
    setUserAnswer('')
    setIsCorrect(null)
    setShowFeedback(false)
    setAttemptsForCurrent(0)
    setSolutionRevealed(false)
    setAwardedPoints(0)
  }

  const playAgainMissedWords = () => {
    // Include words that were not correct on first try (yellow + red)
    const missedWords = wordPairs.filter((_, index) => {
      const result = wordResults[index]
      return result && !result.firstTryCorrect
    })
    
    if (missedWords.length === 0) {
      // All words were correct on first try, just restart
      playAgainAllWords()
      return
    }
    
    initializeGame(direction, missedWords)
    setGamePhase('playing')
  }

  // ========== RENDER: Grid Selector ==========
  if (gamePhase === 'select-grids') {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={(grids) => {
          setSelectedGrids(grids)
          setGamePhase('select-direction')
        }}
        onClose={onClose}
        minGrids={1}
        maxGrids={10}
        wordsPerGrid={6}
        title="Select Color Grids"
        description="Choose which color grids you want to practice with. More grids = more XP potential!"
        gridConfig={gridConfig}
      />
    )
  }

  // ========== RENDER: Direction Selector ==========
  if (gamePhase === 'select-direction') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative w-full max-w-2xl">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-rose-500/30 rounded-3xl blur-xl" />
          
          <div className="relative rounded-2xl p-8 shadow-2xl bg-[#12122a] border border-white/10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Välj riktning</h2>
              <p className="text-gray-400 text-sm">Välj vilken riktning du vill översätta</p>
            </div>

            <div className="space-y-3 mb-8">
              {/* English to Swedish */}
              <button
                onClick={() => startGame('en-to-sv')}
                className="w-full group p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-white/10">
                      <Languages className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg mb-1 text-white group-hover:text-cyan-400 transition-colors">Engelska → Svenska</div>
                      <div className="text-sm text-gray-400">Översätt från engelska till svenska</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Swedish to English */}
              <button
                onClick={() => startGame('sv-to-en')}
                className="w-full group p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-white/10">
                      <Languages className="w-6 h-6 text-violet-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg mb-1 text-white group-hover:text-violet-400 transition-colors">Svenska → Engelska</div>
                      <div className="text-sm text-gray-400">Översätt från svenska till engelska</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Mixed */}
              <button
                onClick={() => startGame('mixed')}
                className="w-full group p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-white/10">
                      <RefreshCw className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg mb-1 text-white group-hover:text-amber-400 transition-colors">Blandat</div>
                      <div className="text-sm text-gray-400">Slumpmässig mix av båda riktningarna</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== RENDER: Results Screen ==========
  if (gamePhase === 'results') {
    const total = wordPairs.length
    const finalCorrect = correctCount
    const wrong = wrongClicks
    const scoreResult = calculateTranslateScore(finalCorrect, total, wrong)
    const missedWordsCount = wordResults.filter(r => !r.firstTryCorrect).length // Include yellow + red
    
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="relative w-full max-w-3xl my-8">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-rose-500/20 rounded-3xl blur-xl" />
          
          <div className="relative bg-[#12122a] rounded-2xl p-8 shadow-2xl border border-white/10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 shadow-lg shadow-amber-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Spelet klart!</h2>
              <div className="flex items-center justify-center gap-6 text-lg">
                <div className="text-gray-300">
                  <span className="font-bold text-emerald-400">{finalCorrect}</span> / {total} rätt
                </div>
                <div className="text-gray-600">•</div>
                <div className="text-gray-300">
                  <span className="font-bold text-amber-400">{scoreResult.accuracy}%</span> accuracy
                </div>
                <div className="text-gray-600">•</div>
                <div className="text-gray-300">
                  <span className="font-bold text-amber-400">+{awardedPoints}</span> XP
                </div>
              </div>
            </div>

            {/* Word Results Checklist */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Dina resultat</h3>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {wordResults.map((result, index) => {
                    // Determine color: Green (first try), Yellow (eventually correct), Red (failed)
                    const isGreen = result.firstTryCorrect
                    const isYellow = result.correct && !result.firstTryCorrect
                    const isRed = !result.correct
                    
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border transition-all ${
                          isGreen
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isYellow
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">
                              {isGreen ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              ) : isYellow ? (
                                <CheckCircle className="w-5 h-5 text-amber-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-white">{result.word}</div>
                              <div className="text-sm text-gray-400">
                                Rätt svar: <span className="font-medium text-gray-300">{result.translation}</span>
                              </div>
                              {isYellow && (
                                <div className="text-sm text-amber-400 mt-1">
                                  ⚠️ Rätt, men inte på första försöket
                                </div>
                              )}
                              {isRed && result.userAnswer && (
                                <div className="text-sm text-red-400 mt-1">
                                  Ditt svar: <span className="font-medium">{result.userAnswer}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`text-xs font-medium mt-1 ${
                            isGreen ? 'text-emerald-400' : isYellow ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {result.attempts} försök
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {missedWordsCount > 0 && (
                <button
                  onClick={playAgainMissedWords}
                  className="w-full group bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span>Öva på ord att förbättra ({missedWordsCount})</span>
                </button>
              )}
              
              <button
                onClick={playAgainAllWords}
                className="w-full group bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Spela igen (alla ord)</span>
              </button>

              <button
                onClick={onClose}
                className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 font-medium rounded-xl transition-colors"
              >
                Tillbaka till Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== RENDER: Playing ==========
  if (!currentPair) {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50">
        <div className="bg-[#12122a] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-white/10">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Laddar...</h2>
          <p className="text-gray-400">Förbereder din översättningsutmaning</p>
        </div>
      </div>
    )
  }

  const progressPercent = ((currentWordIndex + 1) / wordPairs.length) * 100

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50">
      {/* Aurora background effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative w-full max-w-2xl">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-rose-500/20 rounded-3xl blur-xl" />
        
        <div className="relative bg-[#12122a] rounded-2xl p-8 shadow-2xl border border-white/10">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Languages className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Översätt</h2>
                <div className="text-sm text-gray-400">
                  {direction === 'en-to-sv' ? '🇬🇧 → 🇸🇪' : direction === 'sv-to-en' ? '🇸🇪 → 🇬🇧' : '🔀 Blandat'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-gray-300 font-medium">
                  {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">
                Ord {currentWordIndex + 1} av {wordPairs.length}
              </span>
              <span className="text-sm font-medium text-amber-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Word Display Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-8 mb-6 border border-white/10">
            <div className="text-center">
              <div className="inline-block bg-white/10 px-4 py-2 rounded-lg mb-4 border border-white/10">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  {currentPair.originalLanguage === 'en' ? '🇬🇧 Engelska' : '🇸🇪 Svenska'}
                </span>
              </div>
              <div className="text-5xl font-bold text-white mb-6">
                {currentPair.original}
              </div>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/50"></div>
                <ArrowRight className="w-5 h-5 text-amber-400" />
                <div className="h-px w-12 bg-gradient-to-r from-amber-500/50 to-transparent"></div>
              </div>
              <div className="inline-block bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Översätt till {currentPair.targetLanguage === 'en' ? '🇬🇧 Engelska' : '🇸🇪 Svenska'}
                </span>
              </div>
            </div>
          </div>

          {/* Answer Form */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex items-center space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Skriv ditt svar..."
                className="flex-1 px-5 py-4 text-lg border border-white/10 rounded-xl focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/20 focus:outline-none transition-all text-white placeholder:text-gray-500 bg-white/5 shadow-sm"
                disabled={showFeedback}
                autoFocus
              />
              <button
                type="submit"
                disabled={!userAnswer.trim() || showFeedback}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
              >
                Skicka
              </button>
            </div>
          </form>

          {/* Feedback */}
          {showFeedback && (
            <div className={`rounded-2xl p-5 mb-6 border ${
              isCorrect 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              {isCorrect ? (
                <div className="flex items-center justify-center space-x-3 text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-bold text-lg">Rätt! Bra jobbat! 🎉</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3 text-red-400">
                    <XCircle className="w-6 h-6" />
                    <span className="font-bold text-lg">
                      {solutionRevealed ? 'Inte riktigt!' : `Försök igen (${3 - attemptsForCurrent} försök kvar)`}
                    </span>
                  </div>
                  {solutionRevealed && (
                    <>
                      <div className="text-center bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="text-sm text-gray-400 mb-1">Rätt svar:</div>
                        <div className="text-xl font-bold text-white">{currentPair.target}</div>
                      </div>
                      <button
                        type="button"
                        onClick={goToNextWord}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl flex items-center justify-center space-x-2"
                      >
                        <span>Fortsätt</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Score Display */}
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/30">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-400">{correctCount} / {wordPairs.length} ord</span>
            </div>
            {wrongClicks > 0 && (
              <div className="flex items-center space-x-2 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="font-bold text-red-400">{wrongClicks} missade</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
