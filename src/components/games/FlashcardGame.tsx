'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { RotateCcw, ArrowLeft, Star, Trophy, Volume2 } from 'lucide-react'
import { startGameSession, endGameSession, logWordAttempt, type GameType, type TrackingContext } from '@/lib/tracking'
import GameCompleteModal from '@/components/GameCompleteModal'

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
}

export default function FlashcardGame({ words, wordObjects, translations = {}, onClose, onScoreUpdate, trackingContext, themeColor }: FlashcardGameProps) {
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

  // Use wordObjects if available, otherwise fall back to words array
  const wordList = useMemo(() => {
    if (wordObjects && wordObjects.length > 0) {
      return [...wordObjects].sort(() => Math.random() - 0.5)
    }
    // Fallback to old format
    return words.map(word => ({ en: word, sv: getTranslation(word), image_url: undefined })).sort(() => Math.random() - 0.5)
  }, [words, wordObjects])

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

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('flashcards', trackingContext)
      setSessionId(session?.id ?? null)
    })()
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">🃏 Vocabulary Flashcards</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Word {currentWordIndex + 1} of {wordList.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: themeColor || '#3b82f6' }}
            ></div>
          </div>
        </div>

        {/* Training Mode Indicator */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
            <Star className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-gray-200">Training Mode - No Points</span>
          </div>
        </div>

        {/* Flashcard with 3D Flip Animation */}
        <div className="mb-8 perspective-1000">
          <div 
            className={`relative w-full h-80 cursor-pointer transition-transform duration-500 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            onClick={handleFlip}
          >
            {/* Front of card (English word) */}
            <div 
              className={`absolute inset-0 bg-white rounded-2xl overflow-hidden shadow-2xl backface-hidden ${
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
                className={`absolute top-4 left-4 p-2 rounded-full transition-colors z-10 ${
                  isSpeaking 
                    ? 'bg-blue-500/50 text-blue-200 cursor-not-allowed' 
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-100'
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
                <div className="w-1/2 flex items-center justify-center p-6">
                  <div className="text-center w-full">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 break-words leading-tight">{currentEnglish}</h3>
                    <div className="text-gray-500 text-sm sm:text-base">English</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back of card (Swedish translation) */}
            <div 
              className={`absolute inset-0 bg-white rounded-2xl overflow-hidden shadow-2xl backface-hidden rotate-y-180 ${
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
                className={`absolute top-4 left-4 p-2 rounded-full transition-colors z-10 ${
                  isSpeaking 
                    ? 'bg-green-500/50 text-green-200 cursor-not-allowed' 
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-100'
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
                <div className="w-1/2 flex items-center justify-center p-6">
                  <div className="text-center w-full">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 break-words leading-tight">{currentSwedish}</h3>
                    <div className="text-gray-500 text-sm sm:text-base">Swedish</div>
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
            className="bg-white/10 border border-white/10 text-white py-3 px-6 rounded-lg font-medium hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">
              {currentWordIndex + 1} of {wordList.length}
            </div>
            <div className="text-xs text-gray-500">
              Click card to flip
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={currentWordIndex === wordList.length - 1}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>💡 Click the card to flip it • Use navigation to move between words • 🔊 Click the speaker to hear pronunciation</p>
        </div>
      </div>
    </div>
  )
}
