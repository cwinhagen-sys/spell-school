'use client'

import { useEffect, useState, useMemo } from 'react'
import { RotateCcw, ArrowLeft, Star, Trophy, Target, Clock, Gamepad2, CheckCircle, Award, Keyboard, AlertTriangle, BookOpen, CheckSquare, Brain, Scissors, FileText, Globe, Mic, Target as TargetIcon, Sparkles, BarChart3, Zap, Crown, Gem } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GameCompleteModalProps {
  score: number
  pointsAwarded: number
  gameType: string
  accuracy?: number
  time?: string
  details?: {
    correctAnswers?: number
    totalQuestions?: number
    wrongAttempts?: number
    finalScore?: number
    time?: string
    streak?: number
    sessions?: number
    efficiency?: number
    wordCount?: number
    kpm?: number
    failureReason?: string
    [key: string]: any
  }
  onPlayAgain: () => void
  onBackToDashboard: () => void
  onViewLeaderboard?: () => void
  themeColor?: string
  levelUp?: {
    level: number
    title: string
    image: string
    description: string
  }
}

// Particle component for confetti/sparkle effects
function Particle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ 
        backgroundColor: color,
        left: `${x}%`,
        top: '50%'
      }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [-100, -250],
        scale: [0, 1, 1, 0],
        x: [0, (Math.random() - 0.5) * 100]
      }}
      transition={{
        duration: 2,
        delay: delay,
        ease: "easeOut"
      }}
    />
  )
}

// XP Counter animation
function XPCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])
  
  return <span>{count}</span>
}

// Glowing ring component
function GlowingRing({ color, size, delay }: { color: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        left: '50%',
        top: '50%',
        marginLeft: -size / 2,
        marginTop: -size / 2
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.2, 1.5] }}
      transition={{ duration: 1.5, delay, ease: "easeOut" }}
    />
  )
}

export default function UniversalGameCompleteModal({
  score,
  pointsAwarded,
  gameType,
  accuracy,
  time,
  details = {},
  onPlayAgain,
  onBackToDashboard,
  onViewLeaderboard,
  themeColor,
  levelUp
}: GameCompleteModalProps) {
  const [showContent, setShowContent] = useState(false)
  const [showXP, setShowXP] = useState(false)
  
  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 300)
    const timer2 = setTimeout(() => setShowXP(true), 800)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])
  
  // Generate particles
  const particles = useMemo(() => {
    const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#34d399']
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.5,
      x: 10 + Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))
  }, [])
  
  const getGameIcon = () => {
    switch (gameType) {
      case 'flashcards': return BookOpen
      case 'match': return Brain
      case 'typing': return Keyboard
      case 'translate': return Globe
      case 'connect': return TargetIcon
      case 'storygap': return FileText
      case 'roulette': return TargetIcon
      case 'choice': return CheckSquare
      case 'spellcasting': return Sparkles
      case 'quiz': return BarChart3
      default: return Gamepad2
    }
  }

  const getGameTitle = () => {
    switch (gameType) {
      case 'flashcards': return 'Flashcards'
      case 'match': return 'Memory'
      case 'typing': return 'Typing Challenge'
      case 'translate': return 'Translate'
      case 'connect': return 'Matching Pairs'
      case 'storygap': return 'Sentence Gap'
      case 'roulette': return 'Word Roulette'
      case 'choice': return 'Multiple Choice'
      case 'spellcasting': return 'Spell Casting'
      case 'quiz': return 'Quiz'
      default: return 'Game Complete!'
    }
  }

  const getPerformanceLevel = () => {
    if (accuracy !== undefined) {
      if (accuracy >= 100) return { label: 'PERFECT!', color: 'from-yellow-400 to-amber-500', emoji: '🏆' }
      if (accuracy >= 90) return { label: 'Fantastic!', color: 'from-emerald-400 to-green-500', emoji: '⭐' }
      if (accuracy >= 80) return { label: 'Great job!', color: 'from-amber-400 to-orange-500', emoji: '💪' }
      if (accuracy >= 70) return { label: 'Keep it up!', color: 'from-orange-400 to-amber-500', emoji: '👍' }
      return { label: 'Keep practicing!', color: 'from-orange-400 to-red-500', emoji: '📚' }
    }
    if (pointsAwarded >= 20) return { label: 'Fantastic!', color: 'from-yellow-400 to-amber-500', emoji: '⭐' }
    if (pointsAwarded >= 15) return { label: 'Great job!', color: 'from-amber-400 to-orange-500', emoji: '💪' }
    if (pointsAwarded >= 10) return { label: 'Good!', color: 'from-orange-400 to-amber-500', emoji: '👍' }
    return { label: 'Keep practicing!', color: 'from-orange-400 to-amber-500', emoji: '📚' }
  }

  const performance = getPerformanceLevel()
  const GameIconComponent = getGameIcon()

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Particle effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {showXP && particles.map(p => (
            <Particle key={p.id} delay={p.delay} x={p.x} color={p.color} />
          ))}
        </div>
        
        <motion.div
          className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col"
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <div className="relative bg-[#12122a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
            {/* Top gradient bar */}
            <div className={`h-1.5 bg-gradient-to-r ${performance.color} flex-shrink-0`} />
            
            <div className="p-3 sm:p-4 md:p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Level Up Notification */}
              <AnimatePresence>
                {levelUp && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex-shrink-0"
                  >
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: 3 }}
                      >
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-amber-400" />
                      </motion.div>
                      <div className="text-center">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-amber-400">Level Up!</h3>
                        <p className="text-xs sm:text-sm text-amber-200/80">You reached level {levelUp.level}</p>
                        <p className="text-xs text-amber-300/60 mt-0.5">{levelUp.title}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Title */}
              <AnimatePresence>
                {showContent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-2 sm:mb-3 flex-shrink-0"
                  >
                    <motion.h2
                      className={`text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r ${performance.color} bg-clip-text text-transparent mb-1`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {performance.label}
                    </motion.h2>
                    
                    <motion.div
                      className="flex items-center justify-center gap-1.5 sm:gap-2 text-gray-400 text-xs sm:text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <GameIconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                      <span>{getGameTitle()}</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* XP Award - Big animated counter */}
              <AnimatePresence>
                {showXP && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    className="text-center mb-3 sm:mb-4 flex-shrink-0"
                  >
                    <div className="relative inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl sm:rounded-2xl border border-amber-500/30">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Gem className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-amber-400" />
                      </motion.div>
                      <div>
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                          +<XPCounter value={pointsAwarded} /> XP
                        </div>
                        <div className="text-xs text-gray-400">Experience Points earned</div>
                      </div>
                      
                      {/* Sparkle effects around XP */}
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            top: i < 2 ? '-6px' : 'auto',
                            bottom: i >= 2 ? '-6px' : 'auto',
                            left: i % 2 === 0 ? '-6px' : 'auto',
                            right: i % 2 === 1 ? '-6px' : 'auto'
                          }}
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        >
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 flex-shrink-0 overflow-y-auto min-h-0"
              >
                {details.failureReason === 'too_many_errors' && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <span className="text-red-300 text-sm">
                      The game ended after three errors. Try again to get a result!
                    </span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {accuracy !== undefined && (
                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-white/5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">
                        <Target className="w-3 h-3" />
                        <span>Accuracy</span>
                      </div>
                      <div className={`text-base sm:text-lg font-bold ${
                        accuracy >= 80 ? 'text-emerald-400' : 
                        accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {accuracy}%
                      </div>
                    </div>
                  )}
                  
                  {details.correctAnswers !== undefined && details.totalQuestions !== undefined && (
                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-white/5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">
                        <CheckCircle className="w-3 h-3" />
                        <span>Correct</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white">
                        {details.correctAnswers}/{details.totalQuestions}
                      </div>
                    </div>
                  )}
                  
                  {time && (
                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-white/5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Time</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-amber-400">{time}</div>
                    </div>
                  )}

                  {details.streak !== undefined && (
                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-white/5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">
                        <Zap className="w-3 h-3" />
                        <span>Best streak</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-amber-400">{details.streak}</div>
                    </div>
                  )}

                  {details.kpm !== undefined && (
                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-white/5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">
                        <Keyboard className="w-3 h-3" />
                        <span>Typing speed</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-amber-400">{details.kpm} WPM</div>
                    </div>
                  )}

                  {details.wordCount !== undefined && (
                    <div className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-white/5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-0.5">
                        <BookOpen className="w-3 h-3" />
                        <span>Words</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-amber-400">{details.wordCount}</div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-2 sm:space-y-3 flex-shrink-0 mt-auto"
              >
                <button
                  onClick={onPlayAgain}
                  className="w-full relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg sm:rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all text-xs sm:text-sm">
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Play again</span>
                  </div>
                </button>
                
                {onViewLeaderboard && (
                  <button
                    onClick={onViewLeaderboard}
                    className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border border-amber-500/30 text-xs sm:text-sm"
                  >
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>View leaderboard</span>
                  </button>
                )}
                
                <button
                  onClick={onBackToDashboard}
                  className="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10 text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Back to dashboard</span>
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
