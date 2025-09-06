'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, ArrowLeft, Star, CheckCircle, XCircle, Send } from 'lucide-react'
import { startGameSession, endGameSession, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import GameCompleteModal from '@/components/GameCompleteModal'

interface RouletteGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
}

type SpinMode = 1 | 2 | 3

interface SpunWord {
  word: string
  translation: string
}

export default function RouletteGame({ words, translations, onClose, onScoreUpdate, trackingContext, themeColor }: RouletteGameProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [gameFinished, setGameFinished] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [awardedPoints, setAwardedPoints] = useState(0)
  
  // Game state
  const [spinMode, setSpinMode] = useState<SpinMode | null>(null)
  const [spinsRemaining, setSpinsRemaining] = useState(0)
  const [spunWords, setSpunWords] = useState<SpunWord[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentSentence, setCurrentSentence] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [showFinishButton, setShowFinishButton] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  // Wheel animation
  const [wheelRotation, setWheelRotation] = useState(0)
  const [selectedWordIndex, setSelectedWordIndex] = useState(-1)
  const wheelRef = useRef<HTMLCanvasElement>(null)

  // Get translation for a word
  const getTranslation = (word: string) => {
    return translations[word.toLowerCase()] || word
  }

  // List of inappropriate words to block
  const inappropriateWords = [
    'fuck', 'shit', 'damn', 'hell', 'bitch', 'ass', 'crap', 'piss', 'bastard',
    'fucking', 'shitting', 'damned', 'hellish', 'bitching', 'asshole', 'crappy',
    'fan', 'jävla', 'helvete', 'skit', 'kuk', 'fitta', 'hora', 'idiot', 'dum',
    'jävlar', 'helvetes', 'skitig', 'kukig', 'fittig', 'horig', 'idiotisk', 'dumma'
  ]

  // Check if sentence contains inappropriate words
  const containsInappropriateWords = (sentence: string): boolean => {
    const lowerSentence = sentence.toLowerCase()
    return inappropriateWords.some(word => lowerSentence.includes(word))
  }

  // Initialize game session
  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
            const session = await startGameSession('roulette' as any, trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }, [trackingContext])

  // Timer
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  // Draw wheel on canvas
  useEffect(() => {
    const drawWheel = () => {
      const canvas = wheelRef.current
      if (!canvas) {
        console.log('Canvas not found, retrying...')
        return false
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.log('Canvas context not found')
        return false
      }

      console.log('Drawing wheel with', words.length, 'words:', words)

      const colors = [
        '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#e67e22', '#16a085', '#c0392b', '#2ecc71',
        '#e74c3c', '#9b59b6', '#1abc9c', '#34495e', '#f1c40f', '#e67e22', '#95a5a6', '#2c3e50'
      ]
      const arc = (2 * Math.PI) / words.length

      // Clear canvas
      ctx.clearRect(0, 0, 400, 400)

      // Draw segments - start from 3 o'clock (0 degrees) and go clockwise
      for (let i = 0; i < words.length; i++) {
        const angle = i * arc // Start from 3 o'clock (0 degrees)
        const isSelected = selectedWordIndex === i && !isSpinning
        const isUsed = spunWords.some(spun => spun.word.toLowerCase() === words[i].toLowerCase())
        
        // Draw segment
        ctx.beginPath()
        if (isSelected) {
          ctx.fillStyle = '#ff3b30' // Red for selected
        } else if (isUsed) {
          ctx.fillStyle = '#666666' // Gray for used words
        } else {
          ctx.fillStyle = colors[i % colors.length] // Normal colors for available words
        }
        ctx.moveTo(200, 200)
        ctx.arc(200, 200, 190, angle, angle + arc)
        ctx.lineTo(200, 200)
        ctx.fill()

        // Draw black border between segments
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw thick white border for selected segment
        if (isSelected) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 4
          ctx.stroke()
          
          // Add inner glow effect
          ctx.strokeStyle = '#ffdddd'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Draw text with sharper rendering
        ctx.save()
        ctx.translate(200, 200)
        ctx.rotate(angle + arc / 2)
        
        // Set text color based on state
        if (isSelected) {
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 18px Arial'
        } else if (isUsed) {
          ctx.fillStyle = '#cccccc' // Light gray for used words
          ctx.font = 'bold 16px Arial'
        } else {
          ctx.fillStyle = 'white'
          ctx.font = 'bold 16px Arial'
        }
        
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.imageSmoothingEnabled = false
        
        // Remove shadow for sharper text
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        const displayText = words[i].length > 12 ? words[i].substring(0, 12) + '...' : words[i]
        ctx.fillText(displayText, 170, 0)
        ctx.restore() 
      }

      console.log('Wheel drawn successfully')
      return true
    }

    // Try to draw multiple times with increasing delays
    const tryDraw = () => {
      if (!drawWheel()) {
        setTimeout(tryDraw, 50)
      }
    }

    // Start trying to draw
    tryDraw()
  }, [words, selectedWordIndex, isSpinning, spunWords])

  // Validate sentence
  const validateSentence = (sentence: string): boolean => {
    const trimmed = sentence.trim()
    if (!trimmed) return false
    
    // Check if starts with capital letter and ends with proper punctuation
    const startsWithCapital = /^[A-ZÅÄÖ]/.test(trimmed)
    const endsWithPunctuation = /[.!?]$/.test(trimmed)
    
    return startsWithCapital && endsWithPunctuation
  }

  // Check if sentence contains all required words (including quotes and inflections)
  const containsRequiredWords = (sentence: string): boolean => {
    const lowerSentence = sentence.toLowerCase()
    return spunWords.every(spun => {
      const word = spun.word.toLowerCase()
      const translation = spun.translation.toLowerCase()
      
      // Check for exact word match
      if (lowerSentence.includes(word) || lowerSentence.includes(translation)) {
        return true
      }
      
      // Check for word with quotes around it
      if (lowerSentence.includes(`"${word}"`) || lowerSentence.includes(`"${translation}"`)) {
        return true
      }
      
      // Check for common inflections (basic word variations)
      const wordVariations = getWordVariations(word)
      const translationVariations = getWordVariations(translation)
      
      return wordVariations.some(variation => lowerSentence.includes(variation)) ||
             translationVariations.some(variation => lowerSentence.includes(variation))
    })
  }

  // Get common word variations/inflections
  const getWordVariations = (word: string): string[] => {
    const variations = [word]
    
    // Common English inflections
    if (word.endsWith('y')) {
      variations.push(word.slice(0, -1) + 'ier') // happy -> happier
      variations.push(word.slice(0, -1) + 'iest') // happy -> happiest
    }
    
    if (word.endsWith('e')) {
      variations.push(word + 'r') // nice -> nicer
      variations.push(word + 'st') // nice -> nicest
    }
    
    // Add -ing, -ed, -s variations for verbs
    variations.push(word + 'ing')
    variations.push(word + 'ed')
    variations.push(word + 's')
    
    // Add -er, -est for adjectives
    if (!word.endsWith('er') && !word.endsWith('est')) {
      variations.push(word + 'er')
      variations.push(word + 'est')
    }
    
    return variations
  }

  // Wheel rotation state
  const [currentAngle, setCurrentAngle] = useState(0)
  
  // Normalize degrees to 0-359 range
  const normalizeDeg = (d: number) => ((d % 360) + 360) % 360
  
  // Spin wheel to specific index
  const spinWheelToIndex = (idx: number, opts: { spins?: number, duration?: number, jitterRatio?: number } = {}) => {
    const { spins = 5, duration = 4500, jitterRatio = 0.25 } = opts
    const n = words.length
    const SEG_ANGLE = 360 / n
    const DRAW_OFFSET = 0 // Canvas standard 0° (3 o'clock)
    const POINTER_ANGLE = -90 // Pointer at 12 o'clock
    
    // Segment's center + jitter within segment
    const jitter = (Math.random() * 2 - 1) * (SEG_ANGLE * jitterRatio)
    const targetSegAngle = DRAW_OFFSET + idx * SEG_ANGLE + SEG_ANGLE/2 + jitter
    
    // Calculate final rotation - always start from 0 and add full spins for consistent speed
    const baseRotation = normalizeDeg(POINTER_ANGLE - targetSegAngle)
    const final = baseRotation + (360 * spins)
    
    // Apply rotation with CSS transition - always same duration for consistent speed
    const canvas = wheelRef.current
    if (canvas) {
      // Reset to 0 first for consistent starting point
      canvas.style.transition = 'none'
      canvas.style.transform = 'rotate(0deg)'
      
      // Force a reflow
      canvas.offsetHeight
      
      // Now apply the full rotation with transition
      canvas.style.willChange = 'transform'
      canvas.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`
      canvas.style.transform = `rotate(${final}deg)`
      
      const onEnd = () => {
        canvas.removeEventListener('transitionend', onEnd)
        setCurrentAngle(normalizeDeg(final))
        setWheelRotation(final)
      }
      canvas.addEventListener('transitionend', onEnd)
    }
  }

  // Spin the wheel
  const spinWheel = () => {
    if (isSpinning || spinsRemaining <= 0) return
    
    setIsSpinning(true)
    setFeedback(null)
    
    // Get available words (not already selected)
    const usedWords = spunWords.map(spun => spun.word.toLowerCase())
    const availableWords = words.filter(word => !usedWords.includes(word.toLowerCase()))
    
    // If no more words available, don't spin
    if (availableWords.length === 0) {
      setIsSpinning(false)
      return
    }
    
    // Random word selection from available words
    const randomAvailableIndex = Math.floor(Math.random() * availableWords.length)
    const selectedWord = availableWords[randomAvailableIndex]
    const translation = getTranslation(selectedWord)
    
    // Find the original index of the selected word
    const originalIndex = words.findIndex(word => word.toLowerCase() === selectedWord.toLowerCase())
    
    setSelectedWordIndex(originalIndex)
    
    // Spin to the selected index with consistent speed
    spinWheelToIndex(originalIndex, { spins: 5, duration: 4500, jitterRatio: 0.25 })
    
    // Wait for animation to complete
    setTimeout(() => {
      const newSpunWord: SpunWord = { word: selectedWord, translation }
      setSpunWords(prev => [...prev, newSpunWord])
      setSpinsRemaining(prev => prev - 1)
      setIsSpinning(false)
      
      // If no more spins, enable sentence input
      if (spinsRemaining === 1) {
        setFeedback({ type: 'info', message: 'Now write a sentence using all the words!' })
      }
    }, 4700) // Slightly longer than animation duration
  }



  // Submit sentence for AI analysis
  const submitSentence = async () => {
    // Check if already submitted
    if (hasSubmitted) {
      setFeedback({ type: 'error', message: 'You have already submitted your sentence. Please finish the game.' })
      return
    }

    if (!validateSentence(currentSentence)) {
      setFeedback({ type: 'error', message: 'Sentence must start with a capital letter and end with . ! or ?' })
      return
    }
    
    if (containsInappropriateWords(currentSentence)) {
      setFeedback({ type: 'error', message: 'Please use appropriate language. Remove any inappropriate words from your sentence.' })
      return
    }
    
    if (!containsRequiredWords(currentSentence)) {
      setFeedback({ type: 'error', message: `Sentence must contain all words: ${spunWords.map(s => s.word).join(', ')}` })
      return
    }
    
    setIsSubmitting(true)
    setFeedback(null)
    
    try {
      // Call AI analysis API with improved prompt
      const response = await fetch('/api/analyze-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: currentSentence,
          requiredWords: spunWords,
          spinMode: 1
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze sentence')
      }
      
      const result = await response.json()
      
      // Calculate score based on new rule: Points = number of words in sentence (if grammatically correct)
      let score = 0
      if (result.quality === 0) {
        score = 0 // No points for inappropriate words or just writing words without sentences
      } else if (result.quality >= 0.8) {
        // Grammatically correct sentence - points = number of words
        const wordCount = currentSentence.trim().split(/\s+/).length
        console.log('DEBUG: Sentence:', JSON.stringify(currentSentence))
        console.log('DEBUG: Word count:', wordCount)
        console.log('DEBUG: Split result:', currentSentence.trim().split(/\s+/))
        score = wordCount
      } else {
        // Grammatically incorrect but still a sentence - half points
        const wordCount = currentSentence.trim().split(/\s+/).length
        console.log('DEBUG: Sentence (incorrect):', JSON.stringify(currentSentence))
        console.log('DEBUG: Word count (incorrect):', wordCount)
        score = Math.max(1, Math.floor(wordCount / 2))
      }
      
      setTotalScore(score)
      setAwardedPoints(score)
      
      // Update progress
      const newTotal = await updateStudentProgress(score, 'roulette', trackingContext)
      onScoreUpdate(score, newTotal)
      
      // Determine feedback type based on color
      let feedbackType = 'success'
      if (result.color === 'red') {
        feedbackType = 'error'
      } else if (result.color === 'yellow') {
        feedbackType = 'info'
      }
      
      setFeedback({ 
        type: feedbackType, 
        message: score === 0 ? result.feedback : `Great! You earned ${score} points. ${result.feedback}` 
      })
      
      // Mark as submitted and show finish button
      setHasSubmitted(true)
      setShowFinishButton(true)
      
    } catch (error) {
      console.error('Error analyzing sentence:', error)
      setFeedback({ 
        type: 'error', 
        message: 'Kunde inte analysera meningen just nu. Du får ändå poäng för att använda alla orden!' 
      })
      
      // Give some points anyway for completing the task
      const fallbackScore = 5
      setTotalScore(fallbackScore)
      setAwardedPoints(fallbackScore)
      
      // Update progress with fallback score
      try {
        const newTotal = await updateStudentProgress(fallbackScore, 'roulette', trackingContext)
        onScoreUpdate(fallbackScore, newTotal)
      } catch (progressError) {
        console.error('Error updating progress:', progressError)
      }
      
      setShowFinishButton(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Finish game
  const finishGame = async () => {
    const started = startedAtRef.current
    if (started) {
      const durationSec = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'roulette', { 
        score: totalScore, 
        durationSec,
        accuracyPct: 100, // Roulette is always 100% if they complete the sentence
        details: { 
          spinMode: 1, 
          wordsUsed: spunWords.length,
          sentence: currentSentence
        } 
      })
    } else {
      void endGameSession(sessionId, 'roulette', { 
        score: totalScore,
        accuracyPct: 100, // Roulette is always 100% if they complete the sentence
        details: { 
          spinMode: 1, 
          wordsUsed: spunWords.length,
          sentence: currentSentence
        } 
      })
    }
    setGameFinished(true)
  }

  // Restart game
  const restartGame = () => {
    setSpinMode(null)
    setSpinsRemaining(0)
    setSpunWords([])
    setIsSpinning(false)
    setCurrentSentence('')
    setIsSubmitting(false)
    setFeedback(null)
    setTotalScore(0)
    setWheelRotation(0)
    setCurrentAngle(0)
    setSelectedWordIndex(-1)
    setGameFinished(false)
    setShowFinishButton(false)
    setHasSubmitted(false)
    setElapsedSec(0)
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('roulette', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }

  // Game complete modal
  if (gameFinished) {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
      <GameCompleteModal
        score={awardedPoints}
        accuracy={100} // Always 100% if they complete the sentence
        time={formatTime(elapsedSec)}
        details={{
          spinMode: 1,
          wordsUsed: spunWords.length,
          sentence: currentSentence
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        gameType="roulette"
        themeColor={themeColor}
      />
    )
  }

  // Mode selection screen
  if (!spinMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative bg-gray-900 text-white border border-white/10">
          {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
          
          <div className="text-6xl mb-4">🎰</div>
          <h2 className="text-2xl font-bold mb-4">Roulette Game</h2>
          <p className="text-gray-300 mb-6">
            Spin the wheel and write a sentence using the selected words!
          </p>
          
          <div className="space-y-3 mb-6">
            <button
              onClick={() => {
                setSpinMode(1)
                setSpinsRemaining(1)
              }}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Game (Points = Number of words in sentence)
            </button>
          </div>
          
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Main game screen
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <span className="text-3xl mr-2">🎰</span>
            Roulette Game
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl transition-colors">×</button>
        </div>

        {/* Game Stats */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">Spins Remaining</div>
            <div className="text-xl font-bold text-blue-400">{spinsRemaining}</div>
          </div>
          <div className="text-sm text-gray-400">
            Time: {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
          </div>
        </div>

                 {/* Wheel */}
         <div className="flex justify-center mb-8">
           <div className="relative" style={{ width: '400px', height: '400px' }}>
             <style jsx>{`
               .marker {
                 position: absolute;
                 top: -48px;
                 left: 50%;
                 transform: translateX(-50%);
                 width: 0;
                 height: 0;
                 border-left: 24px solid transparent;
                 border-right: 24px solid transparent;
                 border-top: 48px solid #ff3b30;
                 z-index: 10;
                 filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
               }
             `}</style>
             {/* Large pointer at 12 o'clock */}
             <div className="marker"></div>
             <canvas 
               ref={wheelRef}
               id="wheel" 
               className="wheel" 
               width="400" 
               height="400"
               onClick={spinWheel}
               style={{
                 width: '100%',
                 height: '100%',
                 borderRadius: '50%',
                 border: '10px solid #333',
                 boxShadow: '0 0 15px rgba(0,0,0,0.3)',
                 transition: 'transform 4s cubic-bezier(0.25, 1, 0.5, 1)',
                 transform: `rotate(${wheelRotation}deg)`,
                 backgroundColor: '#2a2a2a',
                 cursor: isSpinning ? 'not-allowed' : 'pointer'
               }}
             />
           </div>
         </div>

        {/* Spun Words Display */}
        {spunWords.length > 0 && (
          <div className="mb-6 p-4 bg-gray-800/30 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Selected Words:</h3>
            <div className="flex flex-wrap gap-2">
              {spunWords.map((spun, index) => (
                <div key={index} className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                  {spun.word}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spin Instructions */}
        {spinsRemaining > 0 && (
          <div className="text-center mb-6">
            <p className="text-gray-300 text-sm">
              {isSpinning ? 'Spinning...' : `Click the wheel to spin! (${spinsRemaining} spins left)`}
            </p>
          </div>
        )}

        {/* Sentence Input */}
        {spinsRemaining === 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Write a sentence using all the words:</h3>
            <div className="space-y-3">
              <textarea
                value={currentSentence}
                onChange={(e) => setCurrentSentence(e.target.value)}
                placeholder="Write your sentence here..."
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {containsInappropriateWords(currentSentence) ? (
                    <span className="text-red-400">Please use appropriate language</span>
                  ) : (
                    "Must start with capital letter and end with . ! or ?"
                  )}
                </div>
                <button
                  onClick={submitSentence}
                  disabled={!validateSentence(currentSentence) || isSubmitting || hasSubmitted || containsInappropriateWords(currentSentence)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    !validateSentence(currentSentence) || isSubmitting || hasSubmitted || containsInappropriateWords(currentSentence)
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Analyzing...' : hasSubmitted ? 'Submitted' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

                 {/* Feedback */}
         {feedback && (
           <div className={`p-4 rounded-lg mb-4 ${
             feedback.type === 'success' ? 'bg-green-600/20 text-green-300 border border-green-600/30' :
             feedback.type === 'error' ? 'bg-red-600/20 text-red-300 border border-red-600/30' :
             'bg-blue-600/20 text-blue-300 border border-blue-600/30'
           }`}>
             <div className="mb-3">{feedback.message}</div>
             {showFinishButton && (
               <div className="text-center">
                 <button
                   onClick={finishGame}
                   className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                 >
                   Finish Game
                 </button>
               </div>
             )}
           </div>
         )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button 
            onClick={restartGame} 
            className="bg-white/10 border border-white/10 text-white py-2 px-4 rounded-lg font-medium hover:bg-white/15 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
        </div>
      </div>
    </div>
  )
}
