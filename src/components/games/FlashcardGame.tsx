'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { RotateCcw, ArrowLeft, Star, Trophy, Volume2, Mic, MicOff, Loader2, CheckCircle2, XCircle, AlertCircle, BookOpen, X } from 'lucide-react'
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
  onScoreUpdate: (score: number, total?: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
  sessionFlashcardMode?: 'training' | 'test' // Which mode to use in session mode
  sessionId?: string // Session ID for saving progress
  gameName?: string // Game name for saving progress
}

export default function FlashcardGame({ words, wordObjects, translations = {}, onClose, onScoreUpdate, trackingContext, themeColor, gridConfig, sessionMode = false, sessionFlashcardMode = 'training', sessionId, gameName }: FlashcardGameProps) {
  // In session mode, skip grid selector and use provided words directly
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode) // Skip in session mode
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(sessionMode && sessionFlashcardMode === 'test') // Start flipped in test mode
  const [gameFinished, setGameFinished] = useState(false)
  const [internalSessionId, setInternalSessionId] = useState<string | null>(null) // Internal session ID for tracking (non-session mode)
  const startedAtRef = useRef<number | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingElevenLabsRef = useRef(false)
  
  // Pronunciation functionality - use session mode setting if provided, otherwise default to training
  const [pronunciationMode, setPronunciationMode] = useState<'training' | 'test'>(sessionMode ? sessionFlashcardMode : 'training')
  
  // Stable word list ref for session mode to prevent re-shuffling
  const stableWordListRef = useRef<Word[]>([])
  // Ref to track the last wordObjects prop to detect actual changes
  const lastWordObjectsRef = useRef<Word[]>([])
  const lastWordsRef = useRef<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pronunciationResults, setPronunciationResults] = useState<Map<number, { isCorrect: boolean; accuracyScore: number; feedback: string; transcript: string; xpAwarded?: boolean }>>(new Map())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const [xpAnimations, setXpAnimations] = useState<Array<{ id: number; x: number; y: number }>>([])
  const xpAnimationIdRef = useRef(0)
  const recordingTimeoutRef = useRef<number | null>(null)
  const continuousAssessmentIntervalRef = useRef<number | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const [totalXP, setTotalXP] = useState(0)
  const xpAwardedRef = useRef<Set<number>>(new Set()) // Track which word indices have already been awarded XP
  const resultProcessedRef = useRef<boolean>(false) // Track if result has already been processed to avoid double processing
  const soundPlayedRef = useRef<Set<number>>(new Set()) // Track which word indices have already played sound
  const [failedWordIndices, setFailedWordIndices] = useState<number[]>([]) // Track indices of failed words for redo

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

  // Memoize getTranslation to prevent it from changing on every render
  const getTranslation = useMemo(() => {
    return (word: string) => {
      return allTranslations[word.toLowerCase()] || `[${word}]`
    }
  }, [allTranslations])

  // Stop text-to-speech (both ElevenLabs and browser TTS)
  const stopSpeech = () => {
    // Stop browser TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    
    // Stop HTML5 audio (ElevenLabs)
    const audio = document.querySelector('audio[data-elevenlabs]') as HTMLAudioElement
    if (audio) {
      audio.pause()
      audio.remove()
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src)
      }
    }
    
    // Also stop audioRef if it exists
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.remove()
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src)
      }
      audioRef.current = null
    }
    
    setIsSpeaking(false)
    isPlayingElevenLabsRef.current = false
  }

  // Play text-to-speech using ElevenLabs
  const speakTextWithElevenLabs = async (text: string, language: 'en-US' | 'sv-SE') => {
    // Stop any ongoing speech first
    stopSpeech()
    
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Check if we're already playing (prevent double calls)
    if (isSpeaking || isPlayingElevenLabsRef.current) {
      return
    }
    
    setIsSpeaking(true)
    
    try {
      // Mark that we're using ElevenLabs
      isPlayingElevenLabsRef.current = true
      
      // Select voice based on language
      // English voices (American)
      const englishVoices = {
        female: '21m00Tcm4TlvDq8ikWAM', // Rachel - American female
        male: 'pNInz6obpgDQGcFmaJgB' // Adam - American male
      }
      
      // Swedish voices (using multilingual model)
      // Note: ElevenLabs multilingual model can handle Swedish
      const swedishVoices = {
        female: 'EXAVITQu4vr4xnSDxMaL', // Bella - multilingual
        male: 'ThT5KcBeYPX3keUQqHPh' // Multilingual male
      }
      
      const voiceId = language === 'en-US' 
        ? englishVoices.female // Default to female for English
        : swedishVoices.female // Default to female for Swedish
      
      // Call ElevenLabs API
      const response = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          stability: 0.5,
          similarity_boost: 0.75,
          speed: 1.0 // Normal speed for flashcards
        })
      })
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to generate speech'
        try {
          const errorText = await response.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
            } catch {
              // If not JSON, use the text as error message
              errorMessage = errorText || errorMessage
            }
          }
        } catch (e) {
          // If we can't read the response, use status text
          errorMessage = response.statusText || `HTTP ${response.status}`
        }
        
        console.error('❌ ElevenLabs TTS failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage
        })
        
        // Check if it's an environment variable issue
        if (errorMessage.includes('configuration missing') || errorMessage.includes('env var')) {
          console.error('⚠️ ElevenLabs API configuration missing in production. Check Vercel environment variables.')
          // Fall through to browser TTS fallback
        }
        
        throw new Error(errorMessage)
      }
      
      // Create audio from blob
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.setAttribute('data-elevenlabs', 'true')
      
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audio.remove()
        isPlayingElevenLabsRef.current = false
        audioRef.current = null
      }
      
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audio.remove()
        isPlayingElevenLabsRef.current = false
        audioRef.current = null
      }
      
      await audio.play()
      
      // Store reference for cleanup
      audioRef.current = audio
      
      return
    } catch (error) {
      console.warn('ElevenLabs TTS error, falling back to browser TTS:', error)
      isPlayingElevenLabsRef.current = false
      
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language
        utterance.rate = 0.8
        utterance.pitch = 1.0
        
        utterance.onend = () => {
        setIsSpeaking(false)
      }
      
      utterance.onerror = () => {
        setIsSpeaking(false)
      }
      
      speechSynthesis.speak(utterance)
      }
    }
  }

  const handleSpeakEnglish = () => {
    speakTextWithElevenLabs(currentEnglish, 'en-US')
  }

  const handleSpeakSwedish = () => {
    speakTextWithElevenLabs(currentSwedish, 'sv-SE')
  }

  // Helper function to fetch with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - the pronunciation assessment took too long')
      }
      throw error
    }
  }

  // Continuously assess pronunciation during recording
  const assessPronunciationContinuously = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return
    }

    try {
      // Get current audio chunks
      const currentChunks = [...audioChunksRef.current]
      
      // Need at least some audio to assess
      if (currentChunks.length === 0) {
        return
      }

      const audioBlob = new Blob(currentChunks, { type: 'audio/webm' })
      
      // Convert WebM to WAV format for Azure Speech Service
      const wavBlob = await convertWebMToWAV(audioBlob)
      
      // Send to backend for pronunciation assessment
      const formData = new FormData()
      formData.append('audio', wavBlob, 'recording.wav')
      formData.append('word', currentEnglish)

      const response = await fetchWithTimeout('/api/speech/pronunciation-assessment', {
        method: 'POST',
        body: formData
      }, 10000) // 10 second timeout

      if (response.ok) {
        const result = await response.json()
        
        // If pronunciation is correct, stop recording immediately
        if (result.isCorrect && result.accuracyScore >= 85) {
          console.log('✅ Correct pronunciation detected - stopping recording')
          stopRecordingAndProcess(result)
        }
      }
    } catch (error: any) {
      // Handle timeout errors gracefully - they're expected when assessment takes too long
      if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
        // Timeout is expected - don't log as error, just silently continue
        // The final assessment will still happen when recording stops
        return
      }
      // Log other errors but don't stop recording
      console.error('Error in continuous assessment:', error?.message || error)
    }
  }

  // Process pronunciation result and stop recording
  const stopRecordingAndProcess = async (result?: any) => {
    // Mark that we're processing a result to prevent onstop handler from processing again
    resultProcessedRef.current = true
    
    // Clear timeout and interval
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (continuousAssessmentIntervalRef.current) {
      clearInterval(continuousAssessmentIntervalRef.current)
      continuousAssessmentIntervalRef.current = null
    }

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    // If result was passed (from continuous assessment), use it
    // Otherwise, process the final recording
    if (result) {
      setIsProcessing(true)
      
      // Get the correct index for storing results
      const resultIndex = getResultIndex()
      
      // Check if XP was already awarded for this word
      const alreadyAwardedXP = xpAwardedRef.current.has(resultIndex)
      
      // Store result for this word
      const newResults = new Map(pronunciationResults)
      const existingResult = newResults.get(resultIndex)
      const xpAwarded = existingResult?.xpAwarded || alreadyAwardedXP
      
      newResults.set(resultIndex, {
        isCorrect: result.isCorrect,
        accuracyScore: result.accuracyScore,
        feedback: result.feedback,
        transcript: result.transcript || '',
        xpAwarded: xpAwarded
      })
      setPronunciationResults(newResults)

      // Play sound for correct pronunciation - only once per word
      if (result.isCorrect && result.accuracyScore >= 85 && !soundPlayedRef.current.has(resultIndex)) {
        playSound('correct')
        soundPlayedRef.current.add(resultIndex)
      }
      
      // Only award XP in test mode (not in training mode)
      if (result.isCorrect && result.accuracyScore >= 85 && pronunciationMode === 'test' && !alreadyAwardedXP) {
        // Award XP (2 XP per correct word) - only in test mode
        setTotalXP(prev => prev + 2)
        xpAwardedRef.current.add(resultIndex)
        
        // Update result with xpAwarded flag
        newResults.set(resultIndex, {
          ...newResults.get(resultIndex)!,
          xpAwarded: true
        })
        setPronunciationResults(newResults)
        
        // Show XP animation only in test mode
        const rect = document.querySelector('.flashcard-container')?.getBoundingClientRect()
        if (rect) {
          const x = rect.left + rect.width / 2
          const y = rect.top + rect.height / 2
          showXPAnimation(x, y)
        }
      }

      // In test mode, flip card to show result (English side)
      if (pronunciationMode === 'test') {
        setIsFlipped(false) // false means English side is showing
        
        // If correct pronunciation, automatically move to next word after a delay
        if (result.isCorrect && result.accuracyScore >= 85) {
          // Wait a bit to show the result, then move to next word
          setTimeout(() => {
            if (currentWordIndex < wordList.length - 1) {
              setCurrentWordIndex(prev => prev + 1)
              setIsFlipped(true) // Start with Swedish side for next word
            }
          }, 1500) // 1.5 second delay to see the result
        } else {
          // If incorrect pronunciation, automatically play English word
          setTimeout(() => {
            handleSpeakEnglish()
          }, 400)
        }
      }
      
      // In training mode in session mode, automatically move to next word when correct
      if (pronunciationMode === 'training' && sessionMode && result.isCorrect && result.accuracyScore >= 85) {
        // Wait a bit to show the result, then move to next word
        setTimeout(() => {
          if (currentWordIndex < wordList.length - 1) {
            setCurrentWordIndex(prev => prev + 1)
            setIsFlipped(false) // Start with English side showing in training mode
          } else if (wordList.length === 1) {
            // If only 1 word, don't auto-finish - let user manually finish
            // This prevents auto-completion when there's only 1 word
            console.log('⚠️ Only 1 word: Not auto-finishing, waiting for user action')
          }
          // Don't call finishGame() here - let useEffect handle it when pronunciationResults updates
          // This ensures the last word's result is properly included
        }, 1000) // 1 second delay to see the result
      }

      setIsProcessing(false)
      
      // Clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }

  // Pronunciation assessment functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      recordingStartTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // If result was already processed by stopRecordingAndProcess, skip this handler
        if (resultProcessedRef.current) {
          resultProcessedRef.current = false // Reset for next recording
          return
        }
        
        // Clear intervals/timeouts
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current)
          recordingTimeoutRef.current = null
        }
        if (continuousAssessmentIntervalRef.current) {
          clearInterval(continuousAssessmentIntervalRef.current)
          continuousAssessmentIntervalRef.current = null
        }

        setIsProcessing(true)

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Convert WebM to WAV format for Azure Speech Service
        // Azure requires WAV/PCM format with 16kHz sample rate
        const wavBlob = await convertWebMToWAV(audioBlob)
        
        // Send to backend for pronunciation assessment
        const formData = new FormData()
        formData.append('audio', wavBlob, 'recording.wav')
        formData.append('word', currentEnglish)

        try {
          const response = await fetchWithTimeout('/api/speech/pronunciation-assessment', {
            method: 'POST',
            body: formData
          }, 15000) // 15 second timeout for final assessment

          if (!response.ok) {
            // Try to read response as text first to see what we actually got
            let errorText = ''
            let errorData: any = {}
            
            try {
              errorText = await response.text()
              
              // Try to parse as JSON
              if (errorText) {
                try {
                  errorData = JSON.parse(errorText)
                } catch {
                  // Not JSON, use text as error message
                  errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` }
                }
              } else {
                errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
              }
              
              // Check if it's a timeout error - log as info instead of error
              if (response.status === 504 || errorData.error?.includes('timeout')) {
                console.log('⏱️ Pronunciation assessment timeout (expected) - using fallback result')
              } else {
                // Only log as error if it's not a timeout
                console.error('❌ Pronunciation assessment failed - Response text:', errorText)
              }
            } catch (textError) {
              console.error('❌ Failed to read error response:', textError)
              errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
            }
            
            // Special handling for timeout (504) - if it has a valid result structure, use it
            if (response.status === 504 && errorData.isCorrect !== undefined) {
              // Already logged above as info, no need to log again
              // Treat timeout response with valid structure as a valid result
              const result = {
                isCorrect: errorData.isCorrect || false,
                accuracyScore: errorData.accuracyScore || 0,
                feedback: errorData.feedback || 'Analysen tog för lång tid. Försök igen.',
                transcript: errorData.transcript || ''
              }
              
              // Process the timeout result as if it were a normal result
              const resultIndex = getResultIndex()
              const newResults = new Map(pronunciationResults)
              newResults.set(resultIndex, {
                isCorrect: result.isCorrect,
                accuracyScore: result.accuracyScore,
                feedback: result.feedback,
                transcript: result.transcript,
                xpAwarded: false
              })
              setPronunciationResults(newResults)
              
              // In test mode, flip card to show result (English side)
              if (pronunciationMode === 'test') {
                setIsFlipped(false)
                if (!result.isCorrect || result.accuracyScore < 85) {
                  setTimeout(() => {
                    handleSpeakEnglish()
                  }, 400)
                }
              }
              
              // Important: Set processing to false before returning
              setIsProcessing(false)
              resultProcessedRef.current = false
              
              // Clean up microphone stream
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
                streamRef.current = null
              }
              
              return // Exit early, we've handled the timeout result
            }
            
            // Check for timeout without valid result structure - handle gracefully
            if (response.status === 504 || errorData.error?.includes('timeout')) {
              // Timeout already logged above as info, just throw a user-friendly error
              throw new Error('Analysen tog för lång tid. Kontrollera din internetanslutning och försök igen.')
            }
            
            // Only log as error if it's not a timeout
            console.error('❌ Pronunciation assessment failed:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              errorText
            })
            
            // Check if it's an environment variable issue
            if (errorData.error?.includes('configuration missing') || errorData.error?.includes('env var')) {
              console.error('⚠️ Azure Speech API configuration missing in production. Check Vercel environment variables.')
              throw new Error('Pronunciation assessment is not configured. Please contact support.')
            }
            
            throw new Error(errorData.error || errorData.details || `Failed to assess pronunciation (${response.status})`)
          }

          const result = await response.json()
          console.log('✅ Pronunciation result:', result)
          
          // Get the correct index for storing results
          const resultIndex = getResultIndex()
          
          // Check if XP was already awarded for this word
          const alreadyAwardedXP = xpAwardedRef.current.has(resultIndex)
          
          // Store result for this word
          const newResults = new Map(pronunciationResults)
          const existingResult = newResults.get(resultIndex)
          const xpAwarded = existingResult?.xpAwarded || alreadyAwardedXP
          
          newResults.set(resultIndex, {
            isCorrect: result.isCorrect,
            accuracyScore: result.accuracyScore,
            feedback: result.feedback,
            transcript: result.transcript || '',
            xpAwarded: xpAwarded
          })
          setPronunciationResults(newResults)

          // Play sound for correct pronunciation - only once per word
          if (result.isCorrect && result.accuracyScore >= 85 && !soundPlayedRef.current.has(resultIndex)) {
            // Play "ding" sound
            playSound('correct')
            soundPlayedRef.current.add(resultIndex)
            
            // Only award XP in test mode (not in training mode)
            if (pronunciationMode === 'test' && !alreadyAwardedXP) {
              // Award XP (2 XP per correct word) - only in test mode
              setTotalXP(prev => prev + 2)
              xpAwardedRef.current.add(resultIndex)
              
              // Update result with xpAwarded flag
              newResults.set(resultIndex, {
                ...newResults.get(resultIndex)!,
                xpAwarded: true
              })
              setPronunciationResults(newResults)
              
              // Show XP animation only in test mode
              const rect = document.querySelector('.flashcard-container')?.getBoundingClientRect()
              if (rect) {
                const x = rect.left + rect.width / 2
                const y = rect.top + rect.height / 2
                showXPAnimation(x, y)
              }
            }
          }

          // In test mode, flip card to show result (English side)
          if (pronunciationMode === 'test') {
            setIsFlipped(false) // false means English side is showing
            
            // If incorrect pronunciation, automatically play English word
            if (!result.isCorrect || result.accuracyScore < 85) {
              // Wait a bit for the flip animation, then play the English word
              setTimeout(() => {
                handleSpeakEnglish()
              }, 400)
            }
          }
        } catch (error: any) {
          // Handle timeout errors gracefully - don't log as error
          if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
            // Timeout is expected - log as info instead
            console.log('⏱️ Pronunciation assessment timeout (expected) - using fallback result')
          } else {
            // Only log non-timeout errors
            console.error('Error assessing pronunciation:', error)
          }
          const resultIndex = getResultIndex()
          const newResults = new Map(pronunciationResults)
          
          // Provide more specific error message
          let errorMessage = 'Ett fel uppstod vid bedömning av uttalet. Försök igen.'
          if (error?.message?.includes('timeout')) {
            errorMessage = 'Analysen tog för lång tid. Kontrollera din internetanslutning och försök igen.'
          } else if (error?.message) {
            errorMessage = error.message
          }
          
          newResults.set(resultIndex, {
            isCorrect: false,
            accuracyScore: 0,
            feedback: errorMessage,
            transcript: ''
          })
          setPronunciationResults(newResults)
        } finally {
          setIsProcessing(false)
          resultProcessedRef.current = false // Reset for next recording
          
          // Stop microphone stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }

          // Clean up - no audio context needed anymore
        }
      }

      setIsRecording(true)
      resultProcessedRef.current = false // Reset flag for new recording
      // Start recording with timeslice to get chunks every 1 second for continuous assessment
      mediaRecorder.start(1000) // Get chunks every 1 second
      recordingStartTimeRef.current = Date.now()
      console.log('🎤 Recording started')

      // Set timeout to auto-stop after 5.5 seconds if no correct pronunciation detected
      recordingTimeoutRef.current = window.setTimeout(() => {
        console.log('⏱️ Recording timeout - stopping and marking as incorrect')
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
          setIsRecording(false)
          
          // Mark as incorrect (will be processed in onstop handler)
          // The onstop handler will assess and mark as red if incorrect
        }
      }, 5500) // 5.5 seconds

      // Start continuous pronunciation assessment - check every 1.5 seconds
      // This allows Azure to assess the pronunciation as it's being recorded
      continuousAssessmentIntervalRef.current = window.setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          // Only assess if we've been recording for at least 1 second
          const recordingTime = Date.now() - recordingStartTimeRef.current
          if (recordingTime > 1000) {
            assessPronunciationContinuously()
          }
        } else {
          // Recording has stopped, clear interval
          if (continuousAssessmentIntervalRef.current) {
            clearInterval(continuousAssessmentIntervalRef.current)
            continuousAssessmentIntervalRef.current = null
          }
        }
      }, 1500) // Check every 1.5 seconds
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Kunde inte komma åt mikrofonen. Kontrollera att du har gett tillstånd.')
    }
  }

  const stopRecording = () => {
    // Clear timeout and interval
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (continuousAssessmentIntervalRef.current) {
      clearInterval(continuousAssessmentIntervalRef.current)
      continuousAssessmentIntervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Get the correct index for storing/retrieving pronunciation results
  // In redo mode, use baseWordList index; otherwise use currentWordIndex
  const getResultIndex = () => {
    if (failedWordIndices.length > 0 && gameFinished === false) {
      return failedWordIndices[currentWordIndex]
    }
    return currentWordIndex
  }

  // Get pronunciation status for current word
  const getPronunciationStatus = () => {
    return pronunciationResults.get(getResultIndex())
  }

  // Get card background color and opacity based on pronunciation result
  // Updated thresholds to match more lenient backend assessment
  const getCardColorClass = () => {
    const result = getPronunciationStatus()
    if (!result) return ''
    
    // More lenient thresholds: 85%+ for green, 70%+ for yellow, below 70% for red
    if (result.isCorrect && result.accuracyScore >= 85) {
      return 'bg-green-500/20' // Grönmarkerad med opacity
    } else if (result.accuracyScore >= 70) {
      return 'bg-yellow-500/20' // Gulmarkerad med opacity
    } else {
      return 'bg-red-500/20' // Rödmarkerad med opacity
    }
  }
  
  // Get pronunciation status for all words (for overview)
  // Updated thresholds to match more lenient backend assessment
  const getPronunciationOverview = () => {
    const overview = {
      green: [] as number[],
      yellow: [] as number[],
      red: [] as number[]
    }
    
    pronunciationResults.forEach((result, index) => {
      // More lenient thresholds: 85%+ for green, 70%+ for yellow, below 70% for red
      if (result.isCorrect && result.accuracyScore >= 85) {
        overview.green.push(index)
      } else if (result.accuracyScore >= 70) {
        overview.yellow.push(index)
      } else {
        overview.red.push(index)
      }
    })
    
    return overview
  }

  // Get status for a specific word index
  const getWordStatus = (index: number): 'green' | 'yellow' | 'red' | 'white' => {
    const result = pronunciationResults.get(index)
    if (!result) return 'white' // No pronunciation yet
    
    if (result.isCorrect && result.accuracyScore >= 85) {
      return 'green'
    } else if (result.accuracyScore >= 70) {
      return 'yellow'
    } else {
      return 'red'
    }
  }

  // Play sound for correct/wrong pronunciation
  const playSound = (type: 'correct' | 'wrong') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      if (type === 'correct') {
        // Pleasant chime for correct answer - play chord
        const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.type = 'sine'
          oscillator.frequency.value = freq
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3 + index * 0.05)
          
          oscillator.start(audioContext.currentTime + index * 0.05)
          oscillator.stop(audioContext.currentTime + 0.4)
        })
      }
    } catch (e) {
      // Fallback if audio context fails
      console.log('Audio not available:', e)
    }
  }

  // Show XP animation
  const showXPAnimation = (x: number, y: number) => {
    const id = xpAnimationIdRef.current++
    setXpAnimations(prev => [...prev, { id, x, y }])
    
    // Remove animation after it completes
    setTimeout(() => {
      setXpAnimations(prev => prev.filter(anim => anim.id !== id))
    }, 2000)
  }

  // Convert WebM to WAV format for Azure Speech Service
  // Azure requires WAV/PCM format with 16kHz sample rate, mono channel
  const convertWebMToWAV = async (webmBlob: Blob): Promise<Blob> => {
    try {
      console.log('🎤 Converting WebM to WAV...', { size: webmBlob.size, type: webmBlob.type })
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Decode WebM audio
      const arrayBuffer = await webmBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      console.log('🎤 Decoded audio:', {
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        duration: audioBuffer.duration
      })
      
      // Convert to mono and resample to 16kHz if needed
      const targetSampleRate = 16000
      const numberOfChannels = 1 // Mono
      
      // If already at target sample rate and mono, skip resampling
      if (audioBuffer.sampleRate === targetSampleRate && audioBuffer.numberOfChannels === numberOfChannels) {
        console.log('🎤 Audio already at target format, skipping resampling')
        const wavBuffer = audioBufferToWAV(audioBuffer)
        audioContext.close()
        return new Blob([wavBuffer], { type: 'audio/wav' })
      }
      
      // Create offline audio context for resampling
      const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        Math.ceil(audioBuffer.duration * targetSampleRate),
        targetSampleRate
      )
      
      // Convert to mono first if needed
      let monoBuffer = audioBuffer
      if (audioBuffer.numberOfChannels > 1) {
        const monoData = new Float32Array(audioBuffer.length)
        for (let i = 0; i < audioBuffer.length; i++) {
          let sum = 0
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            sum += audioBuffer.getChannelData(channel)[i]
          }
          monoData[i] = sum / audioBuffer.numberOfChannels
        }
        const tempBuffer = audioContext.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate)
        tempBuffer.getChannelData(0).set(monoData)
        monoBuffer = tempBuffer
      }
      
      // Create buffer source with mono buffer
      const source = offlineContext.createBufferSource()
      source.buffer = monoBuffer
      source.connect(offlineContext.destination)
      source.start(0)
      
      // Render to get resampled audio
      const resampledBuffer = await offlineContext.startRendering()
      
      console.log('🎤 Resampled audio:', {
        sampleRate: resampledBuffer.sampleRate,
        channels: resampledBuffer.numberOfChannels,
        duration: resampledBuffer.duration
      })
      
      // Convert to WAV format
      const wavBuffer = audioBufferToWAV(resampledBuffer)
      
      console.log('🎤 WAV buffer created:', { size: wavBuffer.byteLength })
      
      // Cleanup
      audioContext.close()
      
      return new Blob([wavBuffer], { type: 'audio/wav' })
    } catch (error) {
      console.error('❌ Error converting WebM to WAV:', error)
      // Fallback: return original blob (might not work with Azure)
      alert('Kunde inte konvertera ljudfilen. Försök igen.')
      throw error
    }
  }

  // Convert AudioBuffer to WAV format
  const audioBufferToWAV = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 2 // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = length * blockAlign
    const bufferSize = 44 + dataSize
    
    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // fmt chunk size
    view.setUint16(20, 1, true) // audio format (1 = PCM)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bytesPerSample * 8, true) // bits per sample
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)
    
    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return arrayBuffer
  }

  // Cleanup microphone on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Don't auto-initialize from gridConfig - always show grid selector for user to choose blocks
  // gridConfig will be passed to ColorGridSelector to show the correct blocks

  // Base word list (all words)
  const baseWordList = useMemo(() => {
    console.log('🃏 Flashcard baseWordList useMemo:', {
      showGridSelector,
      selectedGridsLength: selectedGrids.length,
      gridConfigLength: gridConfig?.length,
      wordObjectsLength: wordObjects?.length,
      wordsLength: words?.length
    })
    
    // In session mode, always use wordObjects or words directly
    // Use stable list to prevent re-shuffling during gameplay
    if (sessionMode) {
      // Only create new list if stableWordListRef is empty or wordObjects/words changed
      if (wordObjects && wordObjects.length > 0) {
        // Check if wordObjects actually changed by comparing content
        const currentWordsKey = wordObjects.map(w => `${w.en || ''}-${w.sv || ''}`).sort().join('|')
        const lastWordsKey = lastWordObjectsRef.current.length > 0
          ? lastWordObjectsRef.current.map(w => `${w.en || ''}-${w.sv || ''}`).sort().join('|')
          : ''
        
        // Only create new list if content actually changed
        if (currentWordsKey !== lastWordsKey || stableWordListRef.current.length === 0) {
          console.log('🃏 Session mode: Creating new stable word list from wordObjects:', wordObjects.length)
          // Store current wordObjects for next comparison
          lastWordObjectsRef.current = wordObjects
          // Shuffle once and store in ref
          stableWordListRef.current = [...wordObjects].sort(() => Math.random() - 0.5)
        }
        return stableWordListRef.current
      }
      if (words && words.length > 0) {
        // Check if words actually changed
        const currentWordsKey = [...words].sort().join('|')
        const lastWordsKey = lastWordsRef.current.length > 0
          ? [...lastWordsRef.current].sort().join('|')
          : ''
        
        if (currentWordsKey !== lastWordsKey || stableWordListRef.current.length === 0) {
          console.log('🃏 Session mode: Creating new stable word list from words array:', words.length)
          // Store current words for next comparison
          lastWordsRef.current = words
          // Create word objects and shuffle once
          const wordObjs = words.map(word => ({ 
            en: word, 
            sv: getTranslation(word), 
            image_url: undefined 
          }))
          stableWordListRef.current = wordObjs.sort(() => Math.random() - 0.5)
        }
        return stableWordListRef.current
      }
      return stableWordListRef.current.length > 0 ? stableWordListRef.current : []
    }
    
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
    
    console.log('🃏 Final baseWordList length:', allWords.length)
    console.log('🃏 First few words:', allWords.slice(0, 3))
    return allWords.sort(() => Math.random() - 0.5)
  }, [words, wordObjects, selectedGrids, showGridSelector, translations, sessionMode, getTranslation])

  // Use selected grids if available, otherwise fall back to wordObjects or words array
  // Filter to failed words if restarting with failed words
  const wordList = useMemo(() => {
    if (failedWordIndices.length > 0 && gameFinished === false) {
      // Return only failed words
      return failedWordIndices.map(index => baseWordList[index]).filter(Boolean)
    }
    return baseWordList
  }, [baseWordList, failedWordIndices, gameFinished])

  // Save progress to localStorage in session mode
  const saveProgress = () => {
    const currentSessionId = sessionMode ? sessionId : internalSessionId
    if (sessionMode && currentSessionId && gameName && wordList.length >= 2) {
      const progressKey = `flashcard_progress_${currentSessionId}_${gameName}`
      // Save the stable word list order along with progress to ensure consistency
      // Store word identifiers (en-sv pairs) to match words even if list is reshuffled
      const wordIdentifiers = wordList.map(w => `${w.en || ''}-${w.sv || ''}`)
      const progress = {
        pronunciationResults: Array.from(pronunciationResults.entries()),
        currentWordIndex,
        soundPlayed: Array.from(soundPlayedRef.current),
        xpAwarded: Array.from(xpAwardedRef.current),
        wordIdentifiers, // Save word order to ensure consistency
        wordListLength: wordList.length // Save length to detect if word list changed
      }
      localStorage.setItem(progressKey, JSON.stringify(progress))
      console.log('💾 Saved progress:', {
        resultsCount: pronunciationResults.size,
        currentWordIndex,
        wordListLength: wordList.length
      })
    }
  }

  // Load progress from localStorage in session mode
  const loadProgress = () => {
    const currentSessionId = sessionMode ? sessionId : internalSessionId
    if (sessionMode && currentSessionId && gameName && wordList.length > 0) {
      // If only 1 word, don't load progress at all - clear it instead to prevent auto-completion
      if (wordList.length === 1) {
        const progressKey = `flashcard_progress_${currentSessionId}_${gameName}`
        localStorage.removeItem(progressKey)
        setCurrentWordIndex(0)
        setGameFinished(false)
        setPronunciationResults(new Map())
        console.log('🧹 Cleared localStorage progress for single word game to prevent auto-completion')
        return
      }
      
      const progressKey = `flashcard_progress_${currentSessionId}_${gameName}`
      const saved = localStorage.getItem(progressKey)
      if (saved) {
        try {
          const progress = JSON.parse(saved)
          
          // Check if word list matches saved word list
          const currentWordIdentifiers = wordList.map(w => `${w.en || ''}-${w.sv || ''}`)
          const savedWordIdentifiers = progress.wordIdentifiers || []
          const wordListMatches = progress.wordListLength === wordList.length &&
            currentWordIdentifiers.length === savedWordIdentifiers.length &&
            currentWordIdentifiers.every((id, idx) => id === savedWordIdentifiers[idx])
          
          if (!wordListMatches) {
            console.warn('⚠️ Word list mismatch - clearing progress to prevent index errors', {
              savedLength: progress.wordListLength,
              currentLength: wordList.length,
              savedIdentifiers: savedWordIdentifiers.slice(0, 3),
              currentIdentifiers: currentWordIdentifiers.slice(0, 3)
            })
            // Clear progress if word list doesn't match
            localStorage.removeItem(progressKey)
            setCurrentWordIndex(0)
            setGameFinished(false)
            setPronunciationResults(new Map())
            return
          }
          
          // Restore pronunciation results (only for 2+ words and if word list matches)
          if (progress.pronunciationResults && wordList.length >= 2 && wordListMatches) {
            const restoredResults = new Map<number, { isCorrect: boolean; accuracyScore: number; feedback: string; transcript: string; xpAwarded?: boolean }>(progress.pronunciationResults as any)
            setPronunciationResults(restoredResults)
            console.log('📥 Loaded progress:', {
              resultsCount: restoredResults.size,
              resultsKeys: Array.from(restoredResults.keys())
            })
          }
          // Restore current word index (but make sure it's within bounds)
          if (typeof progress.currentWordIndex === 'number' && progress.currentWordIndex < wordList.length) {
            setCurrentWordIndex(progress.currentWordIndex)
          }
          // Restore sound played and xp awarded refs
          if (progress.soundPlayed) {
            soundPlayedRef.current = new Set(progress.soundPlayed)
          }
          if (progress.xpAwarded) {
            xpAwardedRef.current = new Set(progress.xpAwarded)
          }
        } catch (e) {
          console.error('Error loading progress:', e)
          // Clear corrupted progress
          localStorage.removeItem(progressKey)
        }
      }
    }
  }

  // Load progress when wordList is ready
  // Only load if we have at least 2 words (to avoid auto-completing with 1 word)
  useEffect(() => {
    if (sessionMode && wordList.length >= 2 && !showGridSelector) {
      loadProgress()
    } else if (sessionMode && wordList.length === 1 && !showGridSelector) {
      // Reset progress if only 1 word (shouldn't auto-complete)
      setCurrentWordIndex(0)
      setGameFinished(false)
      setPronunciationResults(new Map())
      // Also clear localStorage progress for single word to prevent auto-completion
      const currentSessionId = sessionMode ? sessionId : internalSessionId
      if (currentSessionId && gameName) {
        const progressKey = `flashcard_progress_${currentSessionId}_${gameName}`
        localStorage.removeItem(progressKey)
        console.log('🧹 Cleared localStorage progress for single word game')
      }
    }
  }, [sessionMode, wordList.length, showGridSelector])

  // Save progress whenever pronunciationResults or currentWordIndex changes
  // Only save if we have at least 2 words
  useEffect(() => {
    if (sessionMode && wordList.length >= 2 && !showGridSelector) {
      saveProgress()
    }
  }, [pronunciationResults, currentWordIndex, sessionMode, wordList.length, showGridSelector])


  const handleNext = () => {
    // In test mode, allow navigation after making an attempt
    if (pronunciationMode === 'test') {
      // Only allow next if current word has been attempted
      if (!getPronunciationStatus()) {
        return
      }
      // Move to next word or finish if last word
      if (currentWordIndex < wordList.length - 1) {
        const nextIndex = currentWordIndex + 1
        setCurrentWordIndex(nextIndex)
        setIsFlipped(true) // Start with Swedish side in test mode
      } else {
        // Only finish if user has attempted the word
        if (pronunciationResults.size > 0) {
          finishGame()
        }
      }
      return
    }
    if (currentWordIndex < wordList.length - 1) {
      const nextIndex = currentWordIndex + 1
      setCurrentWordIndex(nextIndex)
      setIsFlipped(false)
    } else {
      // Only finish if user has attempted at least one word
      if (pronunciationResults.size > 0) {
        finishGame()
      }
    }
  }

  const handlePrevious = () => {
    // In test mode, allow navigation to previous words that have been attempted
    if (pronunciationMode === 'test') {
      if (currentWordIndex > 0) {
        const prevIndex = currentWordIndex - 1
        // Only allow going back if previous word has been attempted
        if (pronunciationResults.has(prevIndex)) {
          setCurrentWordIndex(prevIndex)
          setIsFlipped(true) // Start with Swedish side in test mode
        }
      }
      return
    }
    if (currentWordIndex > 0) {
      const prevIndex = currentWordIndex - 1
      setCurrentWordIndex(prevIndex)
      setIsFlipped(false)
    }
  }

  const handleFlip = () => {
    // In test mode, only allow flipping if:
    // 1. We're on the English side (isFlipped = false) and want to go back to Swedish (not allowed if no result)
    // 2. We're on the Swedish side (isFlipped = true) and have a result (can flip to see English)
    if (pronunciationMode === 'test') {
      // If on Swedish side (isFlipped = true), only allow flip if there's a result
      if (isFlipped && getPronunciationStatus()) {
        setIsFlipped(false) // Flip to English side
      }
      // If on English side (isFlipped = false), don't allow flip back to Swedish in test mode
      // User must pronounce correctly to see English side
    } else {
      // Training mode: allow free flipping
      setIsFlipped(!isFlipped)
    }
  }

  const finishGame = async () => {
    // Prevent finishing game if there's only 1 word and user hasn't attempted it
    // This prevents auto-completion when wordList.length === 1
    if (wordList.length === 1 && pronunciationResults.size === 0) {
      console.log('⚠️ Cannot finish game: Only 1 word and no attempts made yet')
      return
    }
    
    // Prevent multiple calls to finishGame
    if (gameFinished) {
      console.log('⚠️ Game already finished, ignoring duplicate finishGame call')
      return
    }
    
    setGameFinished(true)
    
    // Use a small delay to ensure pronunciationResults state is fully updated
    // This is especially important for the last word which might have just been processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Calculate statistics - count correct words from wordList
    // Use the latest pronunciationResults by reading from state directly
    const totalWords = wordList.length
    let correctWords = 0
    let incorrectWords = 0
    
    // Get the latest pronunciationResults by reading from the Map directly
    // This ensures we have the most up-to-date results including the last word
    const latestResults = new Map(pronunciationResults)
    
    wordList.forEach((_, index) => {
      let result
      if (failedWordIndices.length > 0) {
        // We're in redo mode - map to baseWordList index
        const baseIndex = failedWordIndices[index]
        result = latestResults.get(baseIndex)
      } else {
        // Normal mode - use wordList index directly
        result = latestResults.get(index)
      }
      
      if (result && result.isCorrect && result.accuracyScore >= 85) {
        correctWords++
      } else if (result) {
        incorrectWords++
      }
    })
    
    console.log('🎯 finishGame: Final statistics', {
      totalWords,
      correctWords,
      incorrectWords,
      resultsSize: latestResults.size,
      resultsKeys: Array.from(latestResults.keys())
    })
    
    const totalAttempted = pronunciationResults.size
    
    // Track failed word indices for redo option (only in test mode, not in session mode)
    if (pronunciationMode === 'test' && !sessionMode) {
      const failedIndices: number[] = []
      pronunciationResults.forEach((result, index) => {
        if (!result.isCorrect || result.accuracyScore < 85) {
          failedIndices.push(index)
        }
      })
      setFailedWordIndices(failedIndices)
    }
    
    // Calculate percentage
    const percentage = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0
    
    // In session mode, pass correctWords and totalWords so handleGameScoreUpdate can calculate percentage
    // In normal mode, pass XP for test mode, 0 for training mode
    if (sessionMode) {
      // Save progress directly with latestResults to ensure the last word is included
      // Don't wait for state update - save immediately with the latest results
      const currentSessionId = sessionMode ? sessionId : internalSessionId
      if (currentSessionId && gameName && wordList.length >= 2) {
        const progressKey = `flashcard_progress_${currentSessionId}_${gameName}`
        const wordIdentifiers = wordList.map(w => `${w.en || ''}-${w.sv || ''}`)
        const progress = {
          pronunciationResults: Array.from(latestResults.entries()),
          currentWordIndex,
          soundPlayed: Array.from(soundPlayedRef.current),
          xpAwarded: Array.from(xpAwardedRef.current),
          wordIdentifiers,
          wordListLength: wordList.length
        }
        localStorage.setItem(progressKey, JSON.stringify(progress))
        console.log('💾 Saved final progress to localStorage:', {
          resultsCount: latestResults.size,
          correctWords,
          totalWords,
          resultsKeys: Array.from(latestResults.keys())
        })
      }
      
      // Also update state so it's consistent
      setPronunciationResults(latestResults)
      
      // Update score first, then close after a brief delay to ensure state is saved
      // Pass correctWords as score and totalWords as total so percentage can be calculated correctly
      onScoreUpdate(correctWords, totalWords)
      // Small delay to ensure score update is processed before closing
      setTimeout(() => {
        onClose()
      }, 300)
    } else if (pronunciationMode === 'test') {
      onScoreUpdate(totalXP, totalXP)
    } else {
      onScoreUpdate(0, 0)
    }
    
    // Only track to main system if not in session mode
    if (!sessionMode) {
      const started = startedAtRef.current
      const duration = started ? Math.max(1, Math.floor((Date.now() - started) / 1000)) : undefined
      
      // End game session with XP details
      await endGameSession(internalSessionId, 'flashcards', { 
        score: pronunciationMode === 'test' ? totalXP : 0, 
        durationSec: duration, 
        details: { 
          training_mode: pronunciationMode === 'training',
          test_mode: pronunciationMode === 'test',
          totalXP: totalXP,
          correctWords: correctWords,
          incorrectWords: incorrectWords,
          totalAttempted: totalAttempted,
          totalWords: baseWordList.length
        } 
      })
    }
  }
  
  // Check if all words have been correctly pronounced
  // In session mode, require 100% correct on all words in both training and test mode
  useEffect(() => {
    if (wordList.length === 0 || showGridSelector || gameFinished) return
    
    // In session mode, always require 100% correct on all words
    // In normal mode, test mode only requires attempts, training mode requires correctness
    const checkAllCorrect = () => {
      return wordList.every((_, index) => {
        let result
        if (failedWordIndices.length > 0) {
          // We're in redo mode - map to baseWordList index
          const baseIndex = failedWordIndices[index]
          result = pronunciationResults.get(baseIndex)
        } else {
          // Normal mode - use wordList index directly
          result = pronunciationResults.get(index)
        }
        // Require correct pronunciation with >= 85% accuracy
        return result && result.isCorrect && result.accuracyScore >= 85
      })
    }
    
    if (sessionMode) {
      // Session mode: always require 100% correct on all words
      // BUT: Don't auto-finish if there's only 1 word and no attempts have been made
      if (wordList.length === 1 && pronunciationResults.size === 0) {
        // Don't auto-finish single word games without attempts
        return
      }
      const allCorrect = checkAllCorrect()
      if (allCorrect && wordList.length > 0) {
        // All words are correctly pronounced - finish the game
        // finishGame() will handle score update and closing in session mode
        finishGame()
      }
    } else if (pronunciationMode === 'test') {
      // Normal test mode: finish when all words have been attempted (have a result)
      const allAttempted = wordList.every((_, index) => {
        if (failedWordIndices.length > 0) {
          const baseIndex = failedWordIndices[index]
          return pronunciationResults.has(baseIndex)
        } else {
          return pronunciationResults.has(index)
        }
      })
      
      if (allAttempted && wordList.length > 0) {
        finishGame()
      }
    } else {
      // Training mode: finish when all words are correct
      const allCorrect = checkAllCorrect()
      if (allCorrect && wordList.length > 0) {
        finishGame()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronunciationResults, wordList.length, showGridSelector, gameFinished, pronunciationMode, failedWordIndices, sessionMode])

  const restartGame = () => {
    setCurrentWordIndex(0)
    setIsFlipped(pronunciationMode === 'test' ? true : false)
    setGameFinished(false)
    setTotalXP(0)
    setPronunciationResults(new Map())
    xpAwardedRef.current.clear()
    soundPlayedRef.current.clear()
    setFailedWordIndices([]) // Reset failed words when restarting normally
    // Reset stable word list in session mode to allow re-shuffling on restart
    if (sessionMode) {
      stableWordListRef.current = []
    }
  }

  // Restart game with only failed words (for test mode)
  const restartWithFailedWords = () => {
    // Reset state but keep failedWordIndices (already set in finishGame)
    setCurrentWordIndex(0)
    setIsFlipped(pronunciationMode === 'test' ? true : false)
    setGameFinished(false)
    setTotalXP(0)
    setPronunciationResults(new Map())
    xpAwardedRef.current.clear()
    soundPlayedRef.current.clear()
    // failedWordIndices is already set, wordList will automatically filter
    // Reset stable word list in session mode to allow re-shuffling on restart
    if (sessionMode) {
      stableWordListRef.current = []
    }
  }

  const currentWord = wordList[currentWordIndex]
  const progress = ((currentWordIndex + 1) / wordList.length) * 100

  // Get current word properties - use word object's sv directly if available
  // This ensures the translation matches the word object
  const currentEnglish = currentWord?.en || ''
  const currentSwedish = currentWord?.sv || (currentEnglish ? getTranslation(currentEnglish) : '')
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
    setInternalSessionId(null)
  }, [])

  // Cleanup TTS and recording when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech()
      // Clean up recording resources
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
      if (continuousAssessmentIntervalRef.current) {
        clearInterval(continuousAssessmentIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Calculate statistics for game complete modal
  const correctWordsCount = Array.from(pronunciationResults.values()).filter(
    r => r.isCorrect && r.accuracyScore >= 85
  ).length
  
  const incorrectWordsCount = Array.from(pronunciationResults.values()).filter(
    r => !r.isCorrect || r.accuracyScore < 85
  ).length

  // In session mode, don't show GameCompleteModal - just close automatically
  if (gameFinished && !sessionMode) {
    return (
      <GameCompleteModal
        score={pronunciationMode === 'test' ? totalXP : 0}
        details={{
          wordsReviewed: baseWordList.length,
          correctWords: correctWordsCount,
          incorrectWords: incorrectWordsCount,
          totalWords: baseWordList.length,
          xpEarned: pronunciationMode === 'test' ? totalXP : 0,
          testMode: pronunciationMode === 'test',
          failedWordsCount: failedWordIndices.length
        }}
        onPlayAgain={restartGame}
        onRedoFailed={failedWordIndices.length > 0 ? restartWithFailedWords : undefined}
        onBackToDashboard={onClose}
        gameType="flashcards"
        themeColor={themeColor}
      />
    )
  }
  
  // In session mode, if game is finished, don't render anything (will close automatically)
  if (gameFinished && sessionMode) {
    return null
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
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-2 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-lg border border-gray-200 relative my-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vocabulary Flashcards</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode Selector - only show if not in session mode */}
            {!sessionMode && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setPronunciationMode('training')
                    setCurrentWordIndex(0)
                    setIsFlipped(false)
                    setPronunciationResults(new Map())
                    setTotalXP(0)
                    xpAwardedRef.current.clear()
                    soundPlayedRef.current.clear()
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    pronunciationMode === 'training'
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Training
                </button>
                <button
                  onClick={() => {
                    setPronunciationMode('test')
                    setCurrentWordIndex(0)
                    setIsFlipped(true) // Start with Swedish side in test mode
                    setPronunciationResults(new Map())
                    setTotalXP(0)
                    xpAwardedRef.current.clear()
                    soundPlayedRef.current.clear()
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    pronunciationMode === 'test'
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Test
                </button>
              </div>
            )}
            <button
              onClick={() => {
                if (sessionMode) {
                  saveProgress()
                }
                onClose()
              }}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              title={sessionMode ? 'Back to game selection' : 'Close'}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-emerald-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Word Status Mini Grid - Compact horizontal row */}
        {wordList.length > 0 && (
          <div className="mb-4 px-1">
            <div className="flex flex-wrap gap-0.5 justify-center items-center">
              {wordList.map((word, index) => {
                const status = getWordStatus(index)
                const isCurrent = index === currentWordIndex
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      // In test mode, disable navigation between words
                      if (pronunciationMode === 'test') {
                        return
                      }
                      setCurrentWordIndex(index)
                      setIsFlipped(false)
                    }}
                    disabled={pronunciationMode === 'test'}
                    className={`
                      w-2.5 h-2.5 rounded-full
                      transition-all duration-150 hover:scale-150 hover:z-10 relative
                      ${isCurrent ? 'ring-1 ring-purple-600 ring-offset-0 scale-150' : ''}
                      ${pronunciationMode === 'test' ? 'cursor-not-allowed opacity-50' : ''}
                      ${
                        status === 'green' 
                          ? 'bg-green-500' 
                          : status === 'yellow'
                          ? 'bg-yellow-500'
                          : status === 'red'
                          ? 'bg-red-500'
                          : 'bg-gray-300 border border-gray-400'
                      }
                    `}
                    title={`${word.en} - ${status === 'white' ? 'Not attempted' : status === 'green' ? 'Perfect' : status === 'yellow' ? 'Close' : 'Needs improvement'}`}
                  />
                )
              })}
            </div>
          </div>
        )}


        {/* Flashcard with 3D Flip Animation */}
        <div className="mb-6 perspective-1000 flashcard-container">
          <div 
            className={`relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            } ${
              // Only allow clicking to flip in training mode, or in test mode if there's a result
              pronunciationMode === 'training' || (pronunciationMode === 'test' && isFlipped && getPronunciationStatus())
                ? 'cursor-pointer'
                : 'cursor-default'
            }`}
            onClick={handleFlip}
          >
            {/* Front of card (English word) */}
            <div 
              className={`absolute inset-0 bg-gray-50 rounded-xl overflow-hidden shadow-lg backface-hidden border-2 border-gray-200 transition-colors ${
                isFlipped ? 'opacity-0' : 'opacity-100'
              } ${pronunciationMode === 'training' ? getCardColorClass() : ''}`}
            >
              {/* Speaker button in top-left corner */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSpeakEnglish()
                }}
                disabled={isSpeaking}
                  className={`p-3 rounded-lg transition-all shadow-md ${
                  isSpeaking 
                    ? 'bg-teal-500 text-white cursor-not-allowed' 
                    : 'bg-white hover:bg-gray-50 text-teal-600 hover:shadow-lg border border-gray-200'
                }`}
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>
              </div>
              
              <div className="flex h-full">
                {/* Left side - Image (only show if image exists) */}
                {currentImage && (
                <div className="w-1/2 relative">
                    <img 
                      src={currentImage} 
                      alt={currentEnglish}
                      className="w-full h-full object-cover"
                    />
                    </div>
                  )}
                
                {/* Right side - Word */}
                <div className={`flex items-center justify-center p-8 ${currentImage ? 'w-1/2' : 'w-full'}`}>
                  <div className="text-center w-full">
                    <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 leading-tight" style={{ 
                      fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      hyphens: 'none'
                    }}>{currentEnglish}</h3>
                    
                    {/* Recording indicator */}
                    {isRecording && (
                      <div className="mt-4 flex items-center justify-center gap-3 text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                        <span className="font-semibold">Spelar in...</span>
                      </div>
                    )}
                    
                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="mt-4 flex items-center justify-center gap-3 text-teal-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Analyzing pronunciation...</span>
                      </div>
                    )}
                    
                    {/* Pronunciation result indicator */}
                    {(() => {
                      const status = getPronunciationStatus()
                      return pronunciationMode === 'training' && status && !isRecording && !isProcessing && (
                        <div className="mt-4">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                            status.isCorrect && status.accuracyScore >= 85
                              ? 'bg-green-100 text-green-700'
                              : status.accuracyScore >= 70
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {status.isCorrect && status.accuracyScore >= 85 ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : status.accuracyScore >= 70 ? (
                              <AlertCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                            <span className="text-sm font-medium">{status.feedback}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Back of card (Swedish translation) */}
            <div 
              className={`absolute inset-0 bg-gray-50 rounded-xl overflow-hidden shadow-lg backface-hidden rotate-y-180 border-2 border-gray-200 transition-colors ${
                isFlipped ? 'opacity-100' : 'opacity-0'
              } ${pronunciationMode === 'test' && getPronunciationStatus() ? getCardColorClass() : ''}`}
            >
              {/* Speaker and Mic buttons in top-left corner */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSpeakSwedish()
                }}
                disabled={isSpeaking}
                  className={`p-3 rounded-lg transition-all shadow-md ${
                  isSpeaking 
                    ? 'bg-teal-500 text-white cursor-not-allowed' 
                    : 'bg-white hover:bg-gray-50 text-teal-600 hover:shadow-lg border border-gray-200'
                }`}
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>
                
                {/* Microphone button for test mode (when Swedish side is visible and no result yet) */}
                {pronunciationMode === 'test' && isFlipped && !isRecording && !isProcessing && !getPronunciationStatus() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startRecording()
                    }}
                    className="p-3 rounded-lg transition-all shadow-md bg-white hover:bg-gray-50 text-teal-600 hover:shadow-lg border border-gray-200"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
                {/* Disabled microphone indicator if already attempted in test mode */}
                {pronunciationMode === 'test' && isFlipped && getPronunciationStatus() && (
                  <div className="p-3 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed">
                    <Mic className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="flex h-full">
                {/* Left side - Image (only show if image exists) */}
                {currentImage && (
                <div className="w-1/2 relative">
                    <img 
                      src={currentImage} 
                      alt={currentSwedish}
                      className="w-full h-full object-cover"
                    />
                    </div>
                  )}
                
                {/* Right side - Word */}
                <div className={`flex items-center justify-center p-8 ${currentImage ? 'w-1/2' : 'w-full'}`}>
                  <div className="text-center w-full">
                    <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 leading-tight" style={{ 
                      fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      hyphens: 'none'
                    }}>{currentSwedish}</h3>
                    
                    {/* Recording indicator for test mode */}
                    {pronunciationMode === 'test' && isRecording && (
                      <div className="mt-4 flex items-center justify-center gap-3 text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                        <span className="font-semibold">Spelar in...</span>
                      </div>
                    )}
                    
                    {/* Processing indicator for test mode */}
                    {pronunciationMode === 'test' && isProcessing && (
                      <div className="mt-4 flex items-center justify-center gap-3 text-indigo-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Analyserar uttal...</span>
                      </div>
                    )}
                    
                    {/* Pronunciation Test Mode - Show result when flipped to English side (isFlipped = false means English is showing) */}
                    {(() => {
                      const status = getPronunciationStatus()
                      return pronunciationMode === 'test' && !isFlipped && status && (
                        <div className="mt-4">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                            status.isCorrect && status.accuracyScore >= 85
                              ? 'bg-green-100 text-green-700'
                              : status.accuracyScore >= 70
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {status.isCorrect && status.accuracyScore >= 85 ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : status.accuracyScore >= 70 ? (
                              <AlertCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                            <span className="text-sm font-medium">{status.feedback}</span>
                          </div>
                        </div>
                      )
                    })()}
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
            disabled={currentWordIndex === 0 || (pronunciationMode === 'test' && (!pronunciationResults.has(currentWordIndex - 1)))}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {pronunciationMode === 'test' && (
            <div className="text-sm text-gray-600 font-medium">
              {pronunciationResults.size} / {wordList.length} ord försökta
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Microphone button - positioned to the left of Next button */}
            {!isRecording && !isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  startRecording()
                }}
                className="p-3 rounded-lg transition-all shadow-md bg-white border-2 border-teal-200 hover:bg-teal-50 text-teal-600 hover:shadow-lg"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={handleNext}
              disabled={
                (pronunciationMode === 'test' && !getPronunciationStatus()) ||
                (pronunciationMode !== 'test' && currentWordIndex === wordList.length - 1)
              }
              className="bg-teal-500 hover:bg-teal-600 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
            >
              <span>{currentWordIndex === wordList.length - 1 ? 'Finish' : 'Next'}</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>

        {/* XP Animation Overlay */}
        {xpAnimations.map(anim => (
          <div
            key={anim.id}
            className="fixed pointer-events-none z-50"
            style={{
              left: `${anim.x}px`,
              top: `${anim.y}px`,
              transform: 'translate(-50%, -50%)',
              animation: 'xpFloat 2s ease-out forwards'
            }}
          >
            <div className="text-2xl font-bold text-teal-600 drop-shadow-lg">
              +2 XP
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
