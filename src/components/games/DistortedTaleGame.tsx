'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, BookOpen, Send, RotateCcw, CheckCircle, Lightbulb, Play, PenTool, Volume2, Loader2, Square, Pause } from 'lucide-react'
import { startGameSession, endGameSession, type TrackingContext, updateStudentProgress } from '@/lib/tracking'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'
import FeedbackModule from '@/components/FeedbackModule'
import MagicalProgressBar from '@/components/MagicalProgressBar'
import { supabase } from '@/lib/supabase'
import type { DistortedTaleResponse } from '@/app/api/distorted-tale/route'
import type { DistortedTaleFeedbackResponse } from '@/app/api/distorted-tale-feedback/route'

interface DistortedTaleGameProps {
  words: string[]
  translations?: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (points: number, newTotal?: number, gameType?: string) => void
  gridConfig?: GridConfig[]
  sessionMode?: boolean
}

type Difficulty = 'easy' | 'medium' | 'advanced'

const DIFFICULTY_CONFIG = {
  easy: { 
    label: 'Easy', 
    description: 'Simple story with basic vocabulary (A1-A2)',
    color: 'from-emerald-500 to-green-500',
    icon: '🌱'
  },
  medium: { 
    label: 'Medium', 
    description: 'Medium story with more creative freedom (A2-B1)',
    color: 'from-amber-500 to-orange-500',
    icon: '🌿'
  },
  advanced: { 
    label: 'Advanced', 
    description: 'Complex story requiring thoughtful ending (B1-B2)',
    color: 'from-rose-500 to-red-500',
    icon: '🌳'
  }
}

// ElevenLabs voices with accent info
const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', accent: 'us', description: 'Calm & clear' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', accent: 'us', description: 'Warm & friendly' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'female', accent: 'gb', description: 'British accent' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', accent: 'us', description: 'Warm & natural' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', accent: 'us', description: 'Deep & clear' },
  { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', gender: 'male', accent: 'us', description: 'Casual & friendly' },
  { id: 'g5CIjZEefAph4nQFvHAz', name: 'Ethan', gender: 'male', accent: 'us', description: 'Young & energetic' },
]

// Abstracted AI API functions
async function fetchAIGeneratedContent(
  words: string[], 
  difficulty: Difficulty, 
  theme?: string
): Promise<DistortedTaleResponse> {
  const response = await fetch('/api/distorted-tale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words, difficulty, theme })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate story')
  }
  
  return response.json()
}

async function fetchAIFeedback(
  story: string,
  studentEnding: string,
  targetWords: string[],
  difficulty: Difficulty
): Promise<DistortedTaleFeedbackResponse> {
  const response = await fetch('/api/distorted-tale-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ story, studentEnding, targetWords, difficulty })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get feedback')
  }
  
  return response.json()
}

// TTS Panel Component
function TTSPanel({ 
  onPlay, 
  isPlaying, 
  isLoading,
  selectedVoice,
  setSelectedVoice,
  playbackSpeed,
  setPlaybackSpeed,
  onStop,
  currentAudio
}: {
  onPlay: () => void
  isPlaying: boolean
  isLoading: boolean
  selectedVoice: string
  setSelectedVoice: (id: string) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  onStop: () => void
  currentAudio: HTMLAudioElement | null
}) {
  // Real-time speed change
  useEffect(() => {
    if (currentAudio) {
      currentAudio.playbackRate = playbackSpeed
    }
  }, [playbackSpeed, currentAudio])

  return (
    <div className="p-3 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl space-y-3">
      {/* Voice Selection */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Voice</label>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {VOICES.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedVoice(v.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                selectedVoice === v.id 
                  ? 'bg-cyan-500/20 border border-cyan-500/40' 
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                v.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'
              }`}>
                {v.gender === 'female' ? '👩' : '👨'}
              </div>
              
              {/* Info */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{v.name}</span>
                  {/* Flag */}
                  <span className="text-sm">{v.accent === 'us' ? '🇺🇸' : '🇬🇧'}</span>
                </div>
                <span className="text-gray-500 text-[10px]">{v.description}</span>
              </div>
              
              {/* Selected indicator */}
              {selectedVoice === v.id && (
                <CheckCircle className="w-4 h-4 text-cyan-400" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Speed Control */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Speed</label>
          <span className="text-xs text-cyan-400 font-medium">{playbackSpeed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
          <span>Slow</span>
          <span>Normal</span>
          <span>Fast</span>
        </div>
      </div>
      
      {/* Play/Stop Button */}
      <button
        onClick={isPlaying ? onStop : onPlay}
        disabled={isLoading}
        className={`w-full px-3 py-2.5 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-2 transition-all ${
          isPlaying 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </>
        ) : isPlaying ? (
          <>
            <Square className="w-4 h-4" />
            Stop
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Play
          </>
        )}
      </button>
    </div>
  )
}

export default function DistortedTaleGame({
  words,
  translations = {},
  onClose,
  trackingContext,
  themeColor,
  onScoreUpdate,
  gridConfig,
  sessionMode = false
}: DistortedTaleGameProps) {
  // Game states
  const [gamePhase, setGamePhase] = useState<'setup' | 'writing' | 'feedback'>('setup')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [selectedGrid, setSelectedGrid] = useState<{ 
    words: string[]
    translations: { [key: string]: string }
    colorScheme: typeof COLOR_GRIDS[0] 
  } | null>(null)
  
  // Content states
  const [story, setStory] = useState<DistortedTaleResponse | null>(null)
  const [studentEnding, setStudentEnding] = useState('')
  const [feedback, setFeedback] = useState<DistortedTaleFeedbackResponse | null>(null)
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('Generating story...')
  const [error, setError] = useState<string | null>(null)
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode || (gridConfig && gridConfig.length > 1))
  
  // TTS states
  const [isPlayingStory, setIsPlayingStory] = useState(false)
  const [isPlayingEnding, setIsPlayingEnding] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [showStoryTTS, setShowStoryTTS] = useState(false)
  const [showEndingTTS, setShowEndingTTS] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  
  // Get English words from selected grid
  const getEnglishWords = useCallback(() => {
    if (!selectedGrid) return []
    
    return selectedGrid.words.map(word => {
      const translation = selectedGrid.translations[word.toLowerCase()]
      if (translation) return translation
      const reverseKey = Object.keys(selectedGrid.translations).find(
        key => selectedGrid.translations[key].toLowerCase() === word.toLowerCase()
      )
      if (reverseKey) return word
      return word
    })
  }, [selectedGrid])
  
  const targetWords = getEnglishWords()
  
  // Handle grid selection
  const handleGridSelect = (grids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    if (grids.length > 0) {
      setSelectedGrid(grids[0])
      setShowGridSelector(false)
    }
  }
  
  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlayingStory(false)
    setIsPlayingEnding(false)
  }, [])
  
  // TTS Play function
  const handlePlayTTS = async (text: string, type: 'story' | 'ending') => {
    // Stop any currently playing audio
    stopAudio()
    
    if (type === 'story') {
      setIsPlayingStory(true)
    } else {
      setIsPlayingEnding(true)
    }
    setTtsLoading(true)
    
    try {
      const response = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: selectedVoice,
          speed: playbackSpeed
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }
      
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audio.playbackRate = playbackSpeed
      audioRef.current = audio
      
      audio.onended = () => {
        setIsPlayingStory(false)
        setIsPlayingEnding(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }
      
      audio.onerror = () => {
        setIsPlayingStory(false)
        setIsPlayingEnding(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }
      
      setTtsLoading(false)
      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsPlayingStory(false)
      setIsPlayingEnding(false)
      setTtsLoading(false)
    }
  }
  
  // Handle difficulty selection and start generating
  const handleStartGame = async () => {
    if (!difficulty || !selectedGrid) return
    
    setLoading(true)
    setError(null)
    setLoadingProgress(0)
    setLoadingStatus('Creating your story...')
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => prev >= 90 ? prev : prev + Math.random() * 15)
    }, 300)
    
    try {
      if (trackingContext) {
        const session = await startGameSession('distorted_tale', trackingContext)
        if (session) {
          setSessionId(session.id)
          startedAtRef.current = Date.now()
        }
      }
      
      setLoadingStatus('Writing the beginning...')
      const result = await fetchAIGeneratedContent(targetWords, difficulty)
      
      setLoadingProgress(100)
      setLoadingStatus('Story ready!')
      
      setTimeout(() => {
        setStory(result)
        setGamePhase('writing')
        setLoading(false)
      }, 500)
      
    } catch (err: any) {
      setError(err.message || 'Failed to generate story. Please try again.')
      setLoading(false)
    } finally {
      clearInterval(progressInterval)
    }
  }
  
  // Check which words have been used
  const getUsedWords = useCallback(() => {
    const textLower = studentEnding.toLowerCase()
    return targetWords.filter(word => {
      const regex = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return regex.test(textLower)
    })
  }, [studentEnding, targetWords])
  
  // Handle submit
  const handleSubmit = async () => {
    if (!story || studentEnding.trim().length < 20) {
      setError('Please write at least 20 characters.')
      return
    }
    
    stopAudio()
    setLoading(true)
    setError(null)
    setLoadingProgress(0)
    setLoadingStatus('Analyzing your ending...')
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => prev >= 90 ? prev : prev + Math.random() * 10)
    }, 200)
    
    try {
      const result = await fetchAIFeedback(
        story.story,
        studentEnding,
        targetWords,
        difficulty!
      )
      
      setLoadingProgress(100)
      setFeedback(result)
      setGamePhase('feedback')
      
      if (sessionId && trackingContext) {
        const timeSpent = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0
        const points = Math.round(result.scorePercentage / 10)
        
        await endGameSession(sessionId, 'distorted_tale', {
          score: points,
          durationSec: timeSpent,
          accuracyPct: result.scorePercentage,
          details: {
            wordsUsed: getUsedWords().length,
            totalWords: targetWords.length,
            difficulty
          }
        })
        
        if (onScoreUpdate) {
          onScoreUpdate(points, undefined, 'distorted_tale')
        }
        
        await updateStudentProgress(trackingContext)
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to get feedback. Please try again.')
    } finally {
      clearInterval(progressInterval)
      setLoading(false)
    }
  }
  
  // Send to teacher
  const handleSendToTeacher = async () => {
    if (!story || !feedback) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')
    
    if (sessionId) {
      await supabase
        .from('game_sessions')
        .update({
          notes: JSON.stringify({
            reviewRequested: true,
            story: story.story,
            studentEnding,
            targetWords,
            score: feedback.scorePercentage,
            feedback: feedback.inlineFeedback,
            submittedAt: new Date().toISOString()
          })
        })
        .eq('id', sessionId)
    }
  }
  
  // Handle play again
  const handlePlayAgain = () => {
    stopAudio()
    setGamePhase('setup')
    setStory(null)
    setStudentEnding('')
    setFeedback(null)
    setDifficulty(null)
    setSessionId(null)
    startedAtRef.current = null
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [stopAudio])
  
  // Render grid selector
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={handleGridSelect}
        onClose={onClose}
        minGrids={1}
        maxGrids={1}
        wordsPerGrid={6}
        title="Choose a Color Block"
        description="Select the word block you want to practice with"
        gridConfig={gridConfig}
      />
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/20 via-cyan-500/15 to-fuchsia-500/20 rounded-3xl blur-2xl" />
        
        <div className="relative rounded-2xl bg-[#0d0d1a] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Finish the Story</h2>
                <p className="text-gray-400 text-xs">
                  {gamePhase === 'setup' && 'Choose your difficulty'}
                  {gamePhase === 'writing' && 'Write the ending using all words'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Setup Phase */}
            {gamePhase === 'setup' && !loading && (
              <div className="space-y-6">
                {/* Selected block preview */}
                {selectedGrid && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-6 h-6 rounded-lg"
                        style={{ backgroundColor: selectedGrid.colorScheme.hex }}
                      />
                      <span className="text-white text-sm font-medium">Your Words ({targetWords.length})</span>
                      <button
                        onClick={() => setShowGridSelector(true)}
                        className="ml-auto text-xs text-violet-400 hover:text-violet-300"
                      >
                        Change
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {targetWords.map((word, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-md bg-white/10 text-white text-xs font-medium">
                          {word}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
                
                {/* Difficulty selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Select Difficulty</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG['easy']][]).map(([key, config]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setDifficulty(key)}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all text-left
                          ${difficulty === key 
                            ? 'border-white/40 bg-white/10' 
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{config.icon}</span>
                          <span className={`text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs">{config.description}</p>
                        
                        {difficulty === key && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* Start button */}
                <div className="flex justify-center pt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartGame}
                    disabled={!difficulty}
                    className={`
                      px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all
                      ${difficulty 
                        ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30' 
                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                      }
                    `}
                  >
                    <Play className="w-5 h-5" />
                    Start
                  </motion.button>
                </div>
                
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
              </div>
            )}
            
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-56">
                  <MagicalProgressBar progress={loadingProgress} statusText={loadingStatus} />
                </div>
              </div>
            )}
            
            {/* Writing Phase */}
            {gamePhase === 'writing' && !loading && story && (
              <div className="space-y-4">
                {/* Instructions */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-white/80">
                      <strong className="text-white">Your Task:</strong> Read the story, then write the <strong>ending</strong> using ALL the vocabulary words!
                    </div>
                  </div>
                </motion.div>
                
                {/* Story + Writing side by side */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Story */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">The Story</h3>
                      {story.theme && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                          {story.theme}
                        </span>
                      )}
                      
                      {/* TTS Button for Story */}
                      <div className="ml-auto relative">
                        <button
                          onClick={() => {
                            setShowStoryTTS(!showStoryTTS)
                            setShowEndingTTS(false)
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isPlayingStory ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 hover:bg-white/10 text-gray-400'
                          }`}
                          title="Listen to story"
                        >
                          {isPlayingStory ? (
                            <Volume2 className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* TTS Panel for Story */}
                        {showStoryTTS && (
                          <div className="absolute right-0 top-8 z-20 w-56">
                            <TTSPanel
                              onPlay={() => handlePlayTTS(story.story, 'story')}
                              isPlaying={isPlayingStory}
                              isLoading={ttsLoading && !isPlayingStory}
                              selectedVoice={selectedVoice}
                              setSelectedVoice={setSelectedVoice}
                              playbackSpeed={playbackSpeed}
                              setPlaybackSpeed={setPlaybackSpeed}
                              onStop={stopAudio}
                              currentAudio={audioRef.current}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed">{story.story}</p>
                  </motion.div>
                  
                  {/* Writing area */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <PenTool className="w-4 h-4 text-fuchsia-400" />
                      <h3 className="text-sm font-semibold text-white">Your Ending</h3>
                      
                      {/* TTS Button for Student's Ending */}
                      {studentEnding.length > 10 && (
                        <div className="ml-auto relative">
                          <button
                            onClick={() => {
                              setShowEndingTTS(!showEndingTTS)
                              setShowStoryTTS(false)
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isPlayingEnding ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-white/5 hover:bg-white/10 text-gray-400'
                            }`}
                            title="Listen to your ending"
                          >
                            {isPlayingEnding ? (
                              <Volume2 className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                          
                          {/* TTS Panel for Ending */}
                          {showEndingTTS && (
                            <div className="absolute right-0 top-8 z-20 w-56">
                              <TTSPanel
                                onPlay={() => handlePlayTTS(studentEnding, 'ending')}
                                isPlaying={isPlayingEnding}
                                isLoading={ttsLoading && !isPlayingEnding}
                                selectedVoice={selectedVoice}
                                setSelectedVoice={setSelectedVoice}
                                playbackSpeed={playbackSpeed}
                                setPlaybackSpeed={setPlaybackSpeed}
                                onStop={stopAudio}
                                currentAudio={audioRef.current}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <textarea
                      value={studentEnding}
                      onChange={(e) => setStudentEnding(e.target.value)}
                      placeholder="Write the ending here... What happens next?"
                      className="flex-1 min-h-[140px] p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">{studentEnding.length} chars</div>
                  </motion.div>
                </div>
                
                {/* Word list */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-gray-400">Words to use</h4>
                    <span className="text-xs text-gray-500">{getUsedWords().length}/{targetWords.length}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {targetWords.map((word, idx) => {
                      const isUsed = getUsedWords().includes(word)
                      return (
                        <span
                          key={idx}
                          className={`
                            px-2.5 py-1 rounded-md text-xs font-medium transition-all
                            ${isUsed 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-white/10 text-white border border-white/10'
                            }
                          `}
                        >
                          {word}
                          {isUsed && <CheckCircle className="w-3 h-3 ml-1 inline" />}
                        </span>
                      )
                    })}
                  </div>
                </motion.div>
                
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
            
            {/* Feedback Phase */}
            {gamePhase === 'feedback' && feedback && (
              <FeedbackModule
                scorePercentage={feedback.scorePercentage}
                inlineFeedback={feedback.inlineFeedback}
                studentText={studentEnding}
                onClose={onClose}
                onPlayAgain={handlePlayAgain}
                onSendToTeacher={handleSendToTeacher}
              />
            )}
          </div>
          
          {/* Footer - only show in writing phase */}
          {gamePhase === 'writing' && !loading && (
            <div className="flex items-center justify-between p-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={handlePlayAgain}
                className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={studentEnding.trim().length < 20 || getUsedWords().length === 0}
                className={`
                  px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all
                  ${studentEnding.trim().length >= 20 && getUsedWords().length > 0
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30' 
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Send className="w-4 h-4" />
                Submit
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Click outside to close TTS panels */}
      {(showStoryTTS || showEndingTTS) && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => {
            setShowStoryTTS(false)
            setShowEndingTTS(false)
          }}
        />
      )}
    </div>
  )
}


