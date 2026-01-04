'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Play, Pause, Volume2, VolumeX,
  ChevronRight, RefreshCw, Loader2, 
  Sparkles, Lock, Star, Home, ArrowLeft, Gem
} from 'lucide-react'
import { startGameSession, endGameSession, type TrackingContext, updateStudentProgress } from '@/lib/tracking'
import { ENVIRONMENTS, getStory } from '@/data/scenarios/storyLoader'
import type { Environment, ScenarioInfo, StaticStory, StorySegment, StoryProgress } from '@/data/scenarios/types'

interface ScenarioGameProps {
  onClose: () => void
  trackingContext?: TrackingContext
  onScoreUpdate?: (points: number, newTotal?: number, gameType?: string, metadata?: { scenarioId: string, goalId: string, success: boolean, stars?: number }) => void
  initialEnvironmentId?: string
}

type GamePhase = 'environments' | 'scenarios' | 'playing' | 'ending'

// Mini stars component for difficulty display (2 star system: easy/medium)
function DifficultyStars({ count, size = 'sm' }: { count: 1 | 2, size?: 'sm' | 'xs' }) {
  const sizeClass = size === 'xs' ? 'w-2 h-2' : 'w-3 h-3'
  return (
    <div className="flex gap-0.5">
      {[1, 2].map(i => (
        <Star 
          key={i} 
          className={`${sizeClass} ${i <= count ? 'text-gray-300 fill-gray-300' : 'text-gray-600/30'}`} 
        />
      ))}
    </div>
  )
}

// 3D Star Animation Component for completion - stars stay visible after animation
function StarReward({ stars, onComplete }: { stars: 1 | 2 | 3, onComplete: () => void }) {
  const [revealedStars, setRevealedStars] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)
  const onCompleteRef = useRef(onComplete)
  
  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  
  useEffect(() => {
    // Reset state when stars change
    setRevealedStars(0)
    setAnimationComplete(false)
    
    const timers: NodeJS.Timeout[] = []
    
    // Reveal stars one by one with dramatic timing
    for (let i = 1; i <= stars; i++) {
      timers.push(setTimeout(() => {
        setRevealedStars(i)
      }, i * 500))
    }
    
    // Mark animation as complete and call onComplete
    timers.push(setTimeout(() => {
      setAnimationComplete(true)
      // Ensure all earned stars are revealed
      setRevealedStars(stars)
      onCompleteRef.current()
    }, stars * 500 + 600))
    
    return () => timers.forEach(clearTimeout)
  }, [stars])
  
  return (
    <div className="flex justify-center items-center gap-3 py-4">
      {[1, 2, 3].map(i => {
        const isEarned = i <= stars
        // Show star if: it's earned AND (it's been revealed OR animation is complete)
        const isRevealed = isEarned && (i <= revealedStars || (animationComplete && i <= stars))
        
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, rotateY: -180, opacity: 0 }}
            animate={isRevealed ? {
              scale: 1,
              rotateY: 0,
              opacity: 1,
            } : { scale: 0.6, rotateY: 0, opacity: 0.3 }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="relative"
            style={{ perspective: '1000px' }}
          >
            {/* Outer glow ring */}
            {isEarned && isRevealed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: animationComplete ? 0.5 : [0, 0.8, 0.5],
                  scale: animationComplete ? 1 : [0.8, 1.2, 1]
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute inset-[-12px] bg-gradient-to-br from-slate-500/20 to-gray-600/15 rounded-full blur-lg"
              />
            )}
            
            {/* Star container with 3D styling */}
            <motion.div 
              className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${
                isEarned && isRevealed
                  ? 'bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700'
                  : 'bg-gray-800/50 border border-gray-700/50'
              }`}
              style={{ 
                transformStyle: 'preserve-3d',
                boxShadow: isEarned && isRevealed 
                  ? '0 8px 32px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.2)'
                  : 'inset 0 2px 0 rgba(255,255,255,0.05)'
              }}
              animate={isEarned && isRevealed && !animationComplete ? {
                rotateY: [0, 15, -15, 0],
                scale: [1, 1.05, 1.05, 1]
              } : isEarned && isRevealed && animationComplete ? {
                scale: 1,
                rotateY: 0
              } : {}}
              transition={{
                duration: 1.5,
                repeat: animationComplete ? 0 : Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: i * 0.15
              }}
            >
              <Star 
                className={`w-8 h-8 ${
                  isEarned && isRevealed 
                    ? 'text-white fill-white drop-shadow-lg' 
                    : 'text-gray-600 fill-gray-700'
                }`}
                style={{
                  filter: isEarned && isRevealed 
                    ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' 
                    : 'none'
                }}
              />
            </motion.div>
            
            {/* Sparkle particles on reveal */}
            {isEarned && isRevealed && !animationComplete && (
              <>
                {[...Array(8)].map((_, j) => (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.2, 0],
                      x: Math.cos((j * 45) * Math.PI / 180) * 35,
                      y: Math.sin((j * 45) * Math.PI / 180) * 35,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: 0.1,
                      ease: 'easeOut'
                    }}
                          className="absolute w-1.5 h-1.5 bg-gray-400 rounded-full"
                    style={{ left: '50%', top: '50%', marginLeft: -3, marginTop: -3 }}
                  />
                ))}
              </>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// XP Tick-up Animation Component
function XPCounter({ targetXP, delay = 0 }: { targetXP: number, delay?: number }) {
  const [displayXP, setDisplayXP] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsAnimating(true)
      const duration = 1200
      const steps = 30
      const increment = targetXP / steps
      let current = 0
      
      const interval = setInterval(() => {
        current += increment
        if (current >= targetXP) {
          setDisplayXP(targetXP)
          clearInterval(interval)
        } else {
          setDisplayXP(Math.floor(current))
        }
      }, duration / steps)
      
      return () => clearInterval(interval)
    }, delay)
    
    return () => clearTimeout(startTimer)
  }, [targetXP, delay])
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
      className="flex items-center justify-center gap-2"
    >
      <motion.div
        animate={isAnimating ? { 
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, 0]
        } : {}}
        transition={{ duration: 0.3, repeat: isAnimating && displayXP < targetXP ? Infinity : 0 }}
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/30"
      >
        <Gem className="w-5 h-5 text-white" />
      </motion.div>
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">XP Earned</p>
        <motion.p 
          className="text-2xl font-bold text-white"
          animate={displayXP === targetXP ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          +{displayXP}
        </motion.p>
      </div>
    </motion.div>
  )
}

export default function ScenarioGame({
  onClose,
  trackingContext,
  onScoreUpdate,
  initialEnvironmentId
}: ScenarioGameProps) {
  // Navigation state
  const [gamePhase, setGamePhase] = useState<GamePhase>(initialEnvironmentId ? 'scenarios' : 'environments')
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(() => {
    if (initialEnvironmentId) {
      return ENVIRONMENTS.find(e => e.id === initialEnvironmentId && e.isAvailable) || null
    }
    return null
  })
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null)
  
  // Story state
  const [story, setStory] = useState<StaticStory | null>(null)
  const [progress, setProgress] = useState<StoryProgress>({
    currentSegmentId: '',
    visitedSegments: [],
    choicesMade: [],
    totalQualityScore: 0
  })
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(0.85)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Completion state
  const [finalStars, setFinalStars] = useState<1 | 2 | 3>(1)
  const [xpEarned, setXpEarned] = useState(0)
  const [showStarAnimation, setShowStarAnimation] = useState(true)
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startTimeRef = useRef<number>(0)

  // Get current segment
  const currentSegment: StorySegment | null = story?.segments[progress.currentSegmentId] || null
  const isEnding = currentSegment?.isEnding ?? false

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Play audio for current segment
  const playAudio = useCallback(async (audioPath?: string) => {
    if (!audioPath || isMuted) return
    
    setIsLoadingAudio(true)
    
    try {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      const audio = new Audio(audioPath)
      audio.playbackRate = playbackSpeed
      audioRef.current = audio
      
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => {
        console.error('Audio playback error')
        setIsPlaying(false)
      }
      audio.oncanplaythrough = () => {
        setIsLoadingAudio(false)
        audio.play()
        setIsPlaying(true)
      }
      
      audio.load()
    } catch (error) {
      console.error('Play audio error:', error)
      setIsLoadingAudio(false)
    }
  }, [isMuted, playbackSpeed])

  // Toggle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    } else if (currentSegment?.audioPath) {
      playAudio(currentSegment.audioPath)
    }
  }

  // Select environment
  const selectEnvironment = (env: Environment) => {
    if (!env.isAvailable) return
    setSelectedEnvironment(env)
    setGamePhase('scenarios')
  }

  // Start playing a scenario
  const startScenario = async (scenario: ScenarioInfo) => {
    if (!scenario.isAvailable) return
    
    setSelectedScenario(scenario)
    const loadedStory = getStory(scenario.storyId)
    
    if (!loadedStory) {
      console.error('Story not found:', scenario.storyId)
      return
    }
    
    setStory(loadedStory)
    setProgress({
      currentSegmentId: loadedStory.startSegmentId,
      visitedSegments: [loadedStory.startSegmentId],
      choicesMade: [],
      totalQualityScore: 0
    })
    // Reset completion state when starting new story
    setFinalStars(1)
    setXpEarned(0)
    setShowStarAnimation(true)
    
    setGamePhase('playing')
    startTimeRef.current = Date.now()
    
    // Start tracking session
    if (trackingContext) {
      const session = await startGameSession('scenario_adventure', trackingContext)
      if (session) {
        setSessionId(session.id)
      }
    }
    
    // Auto-play intro audio after a short delay
    setTimeout(() => {
      const startSegment = loadedStory.segments[loadedStory.startSegmentId]
      if (startSegment?.audioPath) {
        playAudio(startSegment.audioPath)
      }
    }, 500)
  }

  // Make a choice
  const makeChoice = async (choiceId: string, leadsTo: string, qualityImpact: number) => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
    
    const newProgress: StoryProgress = {
      currentSegmentId: leadsTo,
      visitedSegments: [...progress.visitedSegments, leadsTo],
      choicesMade: [...progress.choicesMade, { 
        segmentId: progress.currentSegmentId, 
        choiceId, 
        qualityImpact 
      }],
      totalQualityScore: progress.totalQualityScore + qualityImpact
    }
    
    setProgress(newProgress)
    
    const nextSegment = story?.segments[leadsTo]
    
    // Check if this is an ending
    if (nextSegment?.isEnding) {
      await handleEnding(nextSegment, newProgress)
    } else {
      // Play audio for next segment
      setTimeout(() => {
        if (nextSegment?.audioPath) {
          playAudio(nextSegment.audioPath)
        }
      }, 300)
    }
  }

  // Handle ending
  const handleEnding = async (endingSegment: StorySegment, finalProgress: StoryProgress) => {
    const duration = Date.now() - startTimeRef.current
    
    // Update progress to show ending segment
    setProgress({
      ...finalProgress,
      currentSegmentId: endingSegment.id
    })
    
    // Calculate stars based on ending type and quality score
    let stars: 1 | 2 | 3 = 1
    
    // Priority 1: If endingType is explicitly set, use it (unless minStars/maxStars differ)
    if (endingSegment.endingType === 'success') {
      stars = 3
    } else if (endingSegment.endingType === 'partial') {
      // For partial, check if minStars and maxStars differ
      if (endingSegment.minStars !== undefined && 
          endingSegment.maxStars !== undefined && 
          endingSegment.minStars !== endingSegment.maxStars) {
        // Use quality score to determine between min and max
        stars = finalProgress.totalQualityScore > 0 
          ? (endingSegment.maxStars as 1 | 2 | 3)
          : (endingSegment.minStars as 1 | 2 | 3)
      } else {
        stars = 2
      }
    } else if (endingSegment.endingType === 'fail') {
      stars = 1
    } else if (endingSegment.minStars !== undefined && 
               endingSegment.maxStars !== undefined && 
               endingSegment.minStars !== endingSegment.maxStars) {
      // If minStars and maxStars are different (and no endingType), use quality score
      stars = finalProgress.totalQualityScore > 0 
        ? (endingSegment.maxStars as 1 | 2 | 3)
        : (endingSegment.minStars as 1 | 2 | 3)
    } else {
      // Fallback: use minStars if available, otherwise default to 1
      if (endingSegment.minStars !== undefined) {
        stars = endingSegment.minStars as 1 | 2 | 3
      } else {
        stars = 1
      }
    }
    
    // Debug log to help diagnose issues
    console.log('🌟 Ending calculation:', {
      endingType: endingSegment.endingType,
      minStars: endingSegment.minStars,
      maxStars: endingSegment.maxStars,
      qualityScore: finalProgress.totalQualityScore,
      calculatedStars: stars,
      segmentId: endingSegment.id
    })
    
    // Calculate XP
    const xp = story?.xpRewards 
      ? (stars === 3 ? story.xpRewards.threeStars : stars === 2 ? story.xpRewards.twoStars : story.xpRewards.oneStar)
      : stars * 15
    
    setFinalStars(stars)
    setXpEarned(xp)
    setShowStarAnimation(true)
    setGamePhase('ending')
    
    // End session and update progress
    if (sessionId && trackingContext) {
      await endGameSession(sessionId, 'scenario_adventure', {
        score: xp,
        durationSec: duration,
        accuracyPct: stars === 3 ? 100 : stars === 2 ? 70 : 40,
        details: {
          maxScore: story?.xpRewards.threeStars || 50,
          stars
        }
      })
      
      await updateStudentProgress(xp, 'scenario_adventure', trackingContext)
    }
    
    // Callback - pass xp as newTotal to ensure it gets added to player's points
    if (onScoreUpdate && selectedEnvironment && selectedScenario) {
      onScoreUpdate(stars === 3 ? 100 : stars === 2 ? 70 : 40, xp, 'scenario_adventure', {
        scenarioId: selectedEnvironment.id,
        goalId: selectedScenario.id,
        success: stars >= 2,
        stars: stars
      })
    }
    
    // Play ending audio
    setTimeout(() => {
      if (endingSegment?.audioPath) {
        playAudio(endingSegment.audioPath)
      }
    }, 500)
  }

  // Go back to scenarios
  const backToScenarios = () => {
    setGamePhase('scenarios')
    setStory(null)
    setProgress({
      currentSegmentId: '',
      visitedSegments: [],
      choicesMade: [],
      totalQualityScore: 0
    })
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
  }

  // Go back to environments
  const backToEnvironments = () => {
    setGamePhase('environments')
    setSelectedEnvironment(null)
    setSelectedScenario(null)
  }

  // Play again
  const playAgain = () => {
    if (selectedScenario) {
      startScenario(selectedScenario)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-5xl max-h-[85vh] bg-gradient-to-br from-[#1f1b17] to-[#2a241e] rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            {gamePhase !== 'environments' && (
              <button
                onClick={gamePhase === 'scenarios' ? backToEnvironments : backToScenarios}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <ArrowLeft className="w-5 h-5 text-gray-300" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Scenario Adventure</h2>
              <p className="text-xs text-gray-400">
                {gamePhase === 'environments' && 'Choose an environment'}
                {gamePhase === 'scenarios' && selectedEnvironment?.name}
                {gamePhase === 'playing' && selectedScenario?.name}
                {gamePhase === 'ending' && 'Adventure Complete!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gamePhase === 'playing' && currentSegment?.audioPath && (
              <button
                onClick={togglePlayPause}
                disabled={isLoadingAudio}
                className={`p-2 rounded-lg transition-colors border ${
                  isPlaying 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 text-gray-300" />
                ) : (
                  <Volume2 className="w-5 h-5 text-gray-300" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content - Custom scrollbar styling */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/40 hover:scrollbar-thumb-gray-600/50" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(55, 65, 81, 0.4) rgba(17, 24, 39, 0.2)' }}>
          {/* Ambient background glow */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-slate-600/[0.08] rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-gray-700/[0.06] rounded-full blur-[100px]" />
          </div>
          
          <AnimatePresence mode="wait">
            {/* Environment Selection */}
            {gamePhase === 'environments' && (
              <motion.div
                key="environments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">Choose Your Adventure</h3>
                  <p className="text-sm text-gray-400">Select an environment to explore</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ENVIRONMENTS.filter(env => env.isAvailable).map((env, index) => (
                    <motion.button
                      key={env.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectEnvironment(env)}
                      className={`relative p-5 rounded-2xl border text-left transition-all overflow-hidden group bg-gradient-to-br ${env.color} border-white/20 hover:border-white/30 cursor-pointer shadow-xl shadow-black/30 hover:shadow-slate-900/30`}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          env.isAvailable 
                            ? 'bg-white/20 backdrop-blur-sm shadow-inner' 
                            : 'bg-gray-800/50'
                        }`}>
                          <span className="text-3xl">{env.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white drop-shadow-sm">{env.name}</h4>
                          <p className={`text-sm ${env.isAvailable ? 'text-white/80' : 'text-gray-400'}`}>
                            {env.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Scenario Selection - Compact grid without header */}
            {gamePhase === 'scenarios' && selectedEnvironment && (
              <motion.div
                key="scenarios"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative"
              >
                <div className="grid grid-cols-3 gap-2">
                  {selectedEnvironment.scenarios.map((scenario, index) => {
                    const canPlay = scenario.isAvailable
                    
                    return (
                      <motion.button
                        key={scenario.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04 }}
                        whileHover={canPlay ? { scale: 1.03, y: -2 } : {}}
                        whileTap={canPlay ? { scale: 0.97 } : {}}
                        onClick={() => canPlay && startScenario(scenario)}
                        disabled={!canPlay}
                        className={`relative aspect-[3/2] rounded-lg overflow-hidden group ${
                          canPlay
                            ? 'shadow-lg shadow-black/40 hover:shadow-slate-900/30 cursor-pointer'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {/* Thumbnail Image or Gradient Fallback */}
                        <div className="absolute inset-0">
                          {scenario.thumbnail ? (
                            <img 
                              src={scenario.thumbnail} 
                              alt={scenario.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              scenario.isAvailable
                                ? 'bg-gradient-to-br from-slate-700 to-slate-800' 
                                : 'bg-gradient-to-br from-gray-800 to-gray-900'
                            }`}>
                              <span className="text-2xl">{scenario.icon}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        
                        {/* Hover glow */}
                        {canPlay && (
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
                        )}
                        
                        {/* Border */}
                        <div className={`absolute inset-0 rounded-lg border ${
                          canPlay
                            ? 'border-white/30 group-hover:border-white/50' 
                            : 'border-white/10'
                        } transition-colors`} />
                        
                        {/* Content at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-sm font-bold truncate ${canPlay ? 'text-white' : 'text-gray-300'}`}>
                              {scenario.name}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <DifficultyStars count={scenario.difficultyStars} size="xs" />
                              <span className={`text-[10px] font-medium ${canPlay ? 'text-gray-300' : 'text-gray-500'}`}>
                                {scenario.maxXp} XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Playing Phase */}
            {gamePhase === 'playing' && currentSegment && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Progress indicator */}
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>Progress</span>
                  <div className="flex-1 h-1.5 bg-gray-900/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-slate-600 to-gray-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, progress.visitedSegments.length * 20)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Two-column layout: Left (image) | Right (text + choices) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left Column: Image */}
                  <div>
                    {/* Story Image - use intro image from boy folder for first segment */}
                    {(currentSegment.imagePath || (currentSegment.id === 'intro' && story?.introImages?.boy)) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10"
                      >
                        <img
                          src={currentSegment.id === 'intro' && story?.introImages?.boy 
                            ? story.introImages.boy 
                            : currentSegment.imagePath}
                          alt="Story scene"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </motion.div>
                    )}
                  </div>

                  {/* Right Column: Text + Choices */}
                  <div className="space-y-4">
                    {/* Story Text */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                      <p className="text-sm text-white/90 leading-relaxed">
                        {currentSegment.text}
                      </p>
                    </div>

                    {/* Choices */}
                    {currentSegment.choices && currentSegment.choices.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-400">What do you do?</h4>
                        {currentSegment.choices.map((choice, index) => (
                          <motion.button
                            key={choice.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08 }}
                            onClick={() => makeChoice(choice.id, choice.leadsTo, choice.qualityImpact)}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-gray-300 text-xs font-bold shrink-0">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="flex-1 text-white/90 text-sm">{choice.text}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors shrink-0" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Ending Phase - Compact, no-scroll design */}
            {gamePhase === 'ending' && currentSegment && (
              <motion.div
                key="ending"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center"
              >
                {/* Compact completion card */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full max-w-lg p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 shadow-2xl shadow-black/40"
                >
                  {/* Stars - Always visible */}
                  <div className="mb-3">
                    <StarReward 
                      stars={finalStars} 
                      onComplete={() => setShowStarAnimation(false)} 
                    />
                  </div>

                  {/* Ending Image - Small */}
                  {currentSegment.imagePath && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="relative h-28 rounded-lg overflow-hidden border border-white/10 mb-3"
                    >
                      <img
                        src={currentSegment.imagePath}
                        alt="Ending scene"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#12100a]/80 via-transparent to-transparent" />
                    </motion.div>
                  )}

                  {/* Ending Text - Compact */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-3 max-h-24 overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(55, 65, 81, 0.3) transparent' }}
                  >
                    <p className="text-xs text-white/80 leading-relaxed text-center">
                      {currentSegment.text}
                    </p>
                  </motion.div>

                  {/* Divider + XP in row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-gray-600/10" />
                    <XPCounter targetXP={xpEarned} delay={800} />
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-600/10 via-gray-600/30 to-transparent" />
                  </div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="flex gap-2"
                  >
                    <button
                      onClick={playAgain}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-slate-600 to-gray-700 text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-slate-900/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">Play Again</span>
                    </button>
                    <button
                      onClick={backToScenarios}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      <span className="text-sm">Scenarios</span>
                    </button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
