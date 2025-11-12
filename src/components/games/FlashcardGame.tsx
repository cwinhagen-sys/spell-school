'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { RotateCcw, ArrowLeft, Star, Trophy, Volume2 } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, type GameType, type TrackingContext } from '@/lib/tracking'
import GameCompleteModal from '@/components/GameCompleteModal'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface FlashcardGameProps {
  words: string[] // Keep for backward compatibility
  wordObjects?: Word[] // New field for word objects with images
  translations?: { [key: string]: string } // Optional translations object
  onClose: () => void
  onScoreUpdate: (score: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
}

export default function FlashcardGame({ words, wordObjects, translations = {}, onClose, onScoreUpdate, trackingContext, themeColor, gridConfig }: FlashcardGameProps) {
  const [showGridSelector, setShowGridSelector] = useState(true) // Always show grid selector
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

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
    return allTranslations[word.toLowerCase()] || `[${word}]`
  }

  // Text-to-Speech function
  const speakText = (text: string, language: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = 0.8 // Slightly slower for learning
      utterance.pitch = 1.0
      
      setIsSpeaking(true)
      
      utterance.onend = () => {
        setIsSpeaking(false)
      }
      
      utterance.onerror = () => {
        setIsSpeaking(false)
      }
      
      speechSynthesis.speak(utterance)
    }
  }

  const handleSpeakEnglish = () => {
    speakText(currentEnglish, 'en-US')
  }

  const handleSpeakSwedish = () => {
    speakText(currentSwedish, 'sv-SE')
  }

  // Don't auto-initialize from gridConfig - always show grid selector for user to choose blocks
  // gridConfig will be passed to ColorGridSelector to show the correct blocks

  // Use selected grids if available, otherwise fall back to wordObjects or words array
  const wordList = useMemo(() => {
    console.log('🃏 Flashcard wordList useMemo:', {
      showGridSelector,
      selectedGridsLength: selectedGrids.length,
      gridConfigLength: gridConfig?.length,
      wordObjectsLength: wordObjects?.length,
      wordsLength: words?.length
    })
    
    if (showGridSelector || selectedGrids.length === 0) {
      // Return empty list while grid selector is showing
      if (wordObjects && wordObjects.length > 0) {
        console.log('🃏 Using wordObjects:', wordObjects.length)
        return [...wordObjects].sort(() => Math.random() - 0.5)
      }
      console.log('🃏 Using words array:', words.length)
      return words.map(word => ({ en: word, sv: getTranslation(word), image_url: undefined })).sort(() => Math.random() - 0.5)
    }
    
    // Use selected grids - extract word objects properly
    // IMPORTANT: Use selectedGrids (user's selected blocks), not entire gridConfig
    const allWords: Word[] = []
    
    console.log('🃏 Using selectedGrids:', selectedGrids.length, 'selected grids')
    
    // Use selectedGrids which only contains the blocks the user selected
    selectedGrids.forEach((grid, gridIdx) => {
      console.log(`🃏 Selected Grid ${gridIdx}:`, grid.words.length, 'words')
      
      grid.words.forEach((word: string) => {
        // word is a string (Swedish), find matching word object or translation
        const wordObj = wordObjects?.find((wo: any) => 
          wo.sv && wo.sv.toLowerCase() === word.toLowerCase()
        )
        
        if (wordObj) {
          console.log(`🃏 Found word object for "${word}":`, wordObj)
          allWords.push({
            en: wordObj.en || '',
            sv: wordObj.sv || '',
            image_url: wordObj.image_url
          })
        } else {
          // Fallback: use translations from grid or provided translations
          const tr = grid.translations[word.toLowerCase()] || translations?.[word.toLowerCase()]
          if (tr && tr !== `[${word}]`) {
            console.log(`🃏 Found translation for "${word}":`, tr)
            allWords.push({
              en: tr,
              sv: word,
              image_url: undefined
            })
          } else {
            console.log(`🃏 No translation found for "${word}", skipping`)
            // Skip words without translations
          }
        }
      })
    })
    
    console.log('🃏 Final wordList length:', allWords.length)
    console.log('🃏 Final wordList length:', allWords.length)
    console.log('🃏 First few words:', allWords.slice(0, 3))
    return allWords.sort(() => Math.random() - 0.5)
  }, [words, wordObjects, selectedGrids, showGridSelector, translations])

  const handleNext = () => {
    if (currentWordIndex < wordList.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1)
      setIsFlipped(false)
    } else {
      finishGame()
    }
  }

  const handlePrevious = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const finishGame = () => {
    setGameFinished(true)
    onScoreUpdate(0) // No points for flashcards (training only)
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'flashcards', { score: 0, durationSec: duration, details: { training_mode: true } })
    } else {
      void endGameSession(sessionId, 'flashcards', { score: 0, details: { training_mode: true } })
    }
  }

  const restartGame = () => {
    setCurrentWordIndex(0)
    setIsFlipped(false)
    setGameFinished(false)
  }

  const currentWord = wordList[currentWordIndex]
  const progress = ((currentWordIndex + 1) / wordList.length) * 100

  // Get current word properties
  const currentEnglish = currentWord?.en || ''
  const currentSwedish = currentWord?.sv || getTranslation(currentEnglish)
  const currentImage = currentWord?.image_url
  
  // Debug logging
  useEffect(() => {
    if (currentWord) {
      console.log('🃏 Current word:', {
        index: currentWordIndex,
        word: currentWord,
        en: currentEnglish,
        sv: currentSwedish,
        isFlipped
      })
    }
  }, [currentWordIndex, currentWord, currentEnglish, currentSwedish, isFlipped])

  useEffect(() => {
    startedAtRef.current = Date.now()
    console.log('🎮 Flashcard: Game started (session will be created server-side)')
    setSessionId(null)
  }, [])

  // Cleanup TTS when component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  if (gameFinished) {
    return (
      <GameCompleteModal
        score={0}
        details={{
          wordsReviewed: wordList.length
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        gameType="flashcards"
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
        onSelect={(grids) => {
          setSelectedGrids(grids)
          setShowGridSelector(false)
        }}
        onClose={onClose}
        minGrids={1}
        maxGrids={undefined} // No max limit for flashcards
        wordsPerGrid={6}
        title="Select Color Grids"
        description="Choose which color grids you want to practice with (select as many as you want!)"
        gridConfig={gridConfig}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-2 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-4 w-full max-w-3xl shadow-2xl border border-gray-100 relative my-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🃏</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Vocabulary Flashcards</h2>
              <p className="text-sm text-gray-600">Click to flip • Learn vocabulary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
          >
            <span className="text-gray-600 text-xl">×</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">Word {currentWordIndex + 1} of {wordList.length}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Training Mode Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-3 rounded-2xl border border-amber-200 shadow-sm">
            <Star className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Training Mode - No Points</span>
          </div>
        </div>

        {/* Flashcard with 3D Flip Animation */}
        <div className="mb-6 perspective-1000">
          <div 
            className={`relative w-full h-80 cursor-pointer transition-transform duration-700 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            onClick={handleFlip}
          >
            {/* Front of card (English word) */}
            <div 
              className={`absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl overflow-hidden shadow-2xl backface-hidden border-2 border-blue-200 ${
                isFlipped ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {/* Speaker button in top-left corner */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSpeakEnglish()
                }}
                disabled={isSpeaking}
                className={`absolute top-4 left-4 p-3 rounded-xl transition-all z-10 shadow-lg ${
                  isSpeaking 
                    ? 'bg-indigo-500 text-white cursor-not-allowed' 
                    : 'bg-white/90 hover:bg-white text-indigo-600 hover:shadow-xl'
                }`}
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>
              
              <div className="flex h-full">
                {/* Left side - Image */}
                <div className="w-1/2 relative">
                  {currentImage ? (
                    <img 
                      src={currentImage} 
                      alt={currentEnglish}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <div className="text-blue-400 text-6xl">📷</div>
                    </div>
                  )}
                </div>
                
                {/* Right side - Word */}
                <div className="w-1/2 flex items-center justify-center p-8">
                  <div className="text-center w-full">
                    <div className="inline-block bg-white/80 px-4 py-2 rounded-2xl mb-4 shadow-sm">
                      <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">English</span>
                    </div>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 leading-tight" style={{ 
                      fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      hyphens: 'none'
                    }}>{currentEnglish}</h3>
                    <div className="text-indigo-500 text-sm font-medium">🇺🇸 Click to flip</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back of card (Swedish translation) */}
            <div 
              className={`absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-100 rounded-3xl overflow-hidden shadow-2xl backface-hidden rotate-y-180 border-2 border-emerald-200 ${
                isFlipped ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Speaker button in top-left corner */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSpeakSwedish()
                }}
                disabled={isSpeaking}
                className={`absolute top-4 left-4 p-3 rounded-xl transition-all z-10 shadow-lg ${
                  isSpeaking 
                    ? 'bg-emerald-500 text-white cursor-not-allowed' 
                    : 'bg-white/90 hover:bg-white text-emerald-600 hover:shadow-xl'
                }`}
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>
              
              <div className="flex h-full">
                {/* Left side - Image */}
                <div className="w-1/2 relative">
                  {currentImage ? (
                    <img 
                      src={currentImage} 
                      alt={currentSwedish}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                      <div className="text-green-400 text-6xl">📷</div>
                    </div>
                  )}
                </div>
                
                {/* Right side - Word */}
                <div className="w-1/2 flex items-center justify-center p-8">
                  <div className="text-center w-full">
                    <div className="inline-block bg-white/80 px-4 py-2 rounded-2xl mb-4 shadow-sm">
                      <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Swedish</span>
                    </div>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 leading-tight" style={{ 
                      fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      hyphens: 'none'
                    }}>{currentSwedish}</h3>
                    <div className="text-emerald-500 text-sm font-medium">🇸🇪 Click to flip back</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentWordIndex === 0}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-center bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-3 rounded-2xl border border-purple-200">
            <div className="text-base font-bold text-gray-800 mb-1">
              {currentWordIndex + 1} of {wordList.length}
            </div>
            <div className="text-xs text-purple-600 font-medium">
              Click card to flip
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={currentWordIndex === wordList.length - 1}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:shadow-lg"
          >
            <span>Next</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-2xl border border-blue-200 shadow-sm">
            <span className="text-blue-600">💡</span>
            <span className="text-xs font-medium text-blue-800">Click the card to flip it • Use navigation to move between words • 🔊 Click the speaker to hear pronunciation</span>
          </div>
        </div>
      </div>
    </div>
  )
}
