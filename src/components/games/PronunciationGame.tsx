'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Volume2, Mic, MicOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { startGameSession, endGameSession, type GameType, type TrackingContext } from '@/lib/tracking'
import GameCompleteModal from '@/components/GameCompleteModal'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface PronunciationGameProps {
  words: string[]
  wordObjects?: Word[]
  translations?: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
}

interface PronunciationResult {
  success: boolean
  transcript: string
  expectedWord: string
  isCorrect: boolean
  accuracyScore: number
  confidence: number
  fluencyScore: number
  completenessScore: number
  feedback: string
}

export default function PronunciationGame({
  words,
  wordObjects,
  translations = {},
  onClose,
  onScoreUpdate,
  trackingContext,
  themeColor,
  gridConfig
}: PronunciationGameProps) {
  const [showGridSelector, setShowGridSelector] = useState(true)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationResult | null>(null)
  const [gameFinished, setGameFinished] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Start game session
  useEffect(() => {
    const startSession = async () => {
      if (trackingContext) {
        const session = await startGameSession('pronunciation' as GameType, trackingContext)
        if (session) {
          setSessionId(session.id)
        }
      }
    }
    startSession()
  }, [trackingContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (sessionId) {
        endGameSession(sessionId, 'pronunciation' as GameType, {
          score,
          accuracyPct: selectedWords.length > 0 ? (correctCount / selectedWords.length) * 100 : 0,
          details: {
            totalWords: selectedWords.length,
            correctCount,
            totalAttempts
          }
        }, trackingContext)
      }
    }
  }, [sessionId, score, correctCount, selectedWords.length, totalAttempts, trackingContext])

  const currentWord = selectedWords[currentWordIndex] || ''

  // Request microphone permission and start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsProcessing(true)
        setPronunciationResult(null)

        // Convert WebM to WAV format for Azure
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Convert to WAV format (Azure requires WAV/PCM)
        const wavBlob = await convertToWav(audioBlob)

        // Send to backend for pronunciation assessment
        const formData = new FormData()
        formData.append('audio', wavBlob, 'recording.wav')
        formData.append('word', currentWord)

        try {
          const response = await fetch('/api/speech/pronunciation-assessment', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            throw new Error('Failed to assess pronunciation')
          }

          const result: PronunciationResult = await response.json()
          setPronunciationResult(result)
          setTotalAttempts(prev => prev + 1)

          if (result.isCorrect) {
            setCorrectCount(prev => prev + 1)
            setScore(prev => prev + 10) // 10 points per correct pronunciation
            onScoreUpdate(score + 10)
          }
        } catch (error) {
          console.error('Error assessing pronunciation:', error)
          setPronunciationResult({
            success: false,
            transcript: '',
            expectedWord: currentWord,
            isCorrect: false,
            accuracyScore: 0,
            confidence: 0,
            fluencyScore: 0,
            completenessScore: 0,
            feedback: 'Ett fel uppstod vid bedömning av uttalet. Försök igen.'
          })
        } finally {
          setIsProcessing(false)
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Kunde inte komma åt mikrofonen. Kontrollera att du har gett tillstånd.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Convert WebM to WAV format (simplified version)
  const convertToWav = async (webmBlob: Blob): Promise<Blob> => {
    // For now, return the blob as-is
    // Azure Speech Service can handle various formats, but WAV/PCM is preferred
    // In production, you might want to use a library like 'webm-to-wav' or similar
    return webmBlob
  }

  // Play correct pronunciation using text-to-speech
  const playPronunciation = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(currentWord)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleNextWord = () => {
    setPronunciationResult(null)
    if (currentWordIndex < selectedWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
    } else {
      // Game finished
      setGameFinished(true)
      if (sessionId) {
        endGameSession(sessionId, 'pronunciation' as GameType, {
          score,
          accuracyPct: (correctCount / selectedWords.length) * 100,
          details: {
            totalWords: selectedWords.length,
            correctCount,
            totalAttempts
          }
        }, trackingContext)
      }
    }
  }

  const handleGridSelection = (grids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    const allWords: string[] = []
    grids.forEach(grid => {
      allWords.push(...grid.words)
    })
    setSelectedWords(allWords)
    setShowGridSelector(false)
    setCurrentWordIndex(0)
  }

  if (showGridSelector) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <ColorGridSelector
            words={words}
            wordObjects={wordObjects}
            translations={translations}
            onSelect={handleGridSelection}
            gridConfig={gridConfig}
            themeColor={themeColor}
          />
        </div>
      </div>
    )
  }

  if (gameFinished) {
    return (
      <GameCompleteModal
        score={score}
        total={selectedWords.length * 10}
        onPlayAgain={() => {
          setGameFinished(false)
          setCurrentWordIndex(0)
          setScore(0)
          setCorrectCount(0)
          setTotalAttempts(0)
          setPronunciationResult(null)
        }}
        onBackToDashboard={onClose}
        details={{
          totalWords: selectedWords.length,
          correctCount,
          totalAttempts,
          accuracy: Math.round((correctCount / selectedWords.length) * 100)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Ord {currentWordIndex + 1} av {selectedWords.length}
            </span>
            <span className="text-sm font-semibold text-purple-600">
              Poäng: {score}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentWordIndex + 1) / selectedWords.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current word */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">{currentWord}</h2>
          <p className="text-lg text-gray-600 mb-6">
            {translations[currentWord.toLowerCase()] || 'Ingen översättning'}
          </p>

          {/* Listen button */}
          <button
            onClick={playPronunciation}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors mb-4"
          >
            <Volume2 className="w-5 h-5" />
            Lyssna på rätt uttal
          </button>
        </div>

        {/* Recording controls */}
        <div className="flex flex-col items-center gap-4 mb-6">
          {!isRecording && !isProcessing && (
            <button
              onClick={startRecording}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Mic className="w-6 h-6" />
              Säg ordet
            </button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
                <span className="font-semibold">Spelar in...</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stoppa inspelning
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyserar uttal...</span>
            </div>
          )}
        </div>

        {/* Pronunciation result */}
        {pronunciationResult && (
          <div className={`p-6 rounded-xl mb-6 ${
            pronunciationResult.isCorrect
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-yellow-50 border-2 border-yellow-200'
          }`}>
            <div className="flex items-start gap-4">
              {pronunciationResult.isCorrect ? (
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-lg mb-2">
                  {pronunciationResult.feedback}
                </p>
                {pronunciationResult.transcript && (
                  <p className="text-sm text-gray-600 mb-2">
                    Du sa: <span className="font-mono">{pronunciationResult.transcript}</span>
                  </p>
                )}
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Noggrannhet: {pronunciationResult.accuracyScore}%</span>
                  <span>Förtroende: {pronunciationResult.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next button */}
        {pronunciationResult && (
          <button
            onClick={handleNextWord}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            {currentWordIndex < selectedWords.length - 1 ? 'Nästa ord' : 'Avsluta spel'}
          </button>
        )}
      </div>
    </div>
  )
}


