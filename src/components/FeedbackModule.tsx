'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Send, Loader2, Check, ChevronDown, Sparkles, Eye } from 'lucide-react'

interface InlineFeedback {
  type: 'strength' | 'improvement'
  segment: string
  comment: string
  suggestion?: string // What they could have written instead
}

interface FeedbackModuleProps {
  scorePercentage: number
  inlineFeedback: InlineFeedback[]
  studentText: string
  onClose: () => void
  onPlayAgain?: () => void
  onSendToTeacher?: () => Promise<void>
}

// Animated counter component
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(eased * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate)
    }, 200)
    
    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(animationFrame)
    }
  }, [value, duration])
  
  return <span>{count}</span>
}

// Big Score Meter - Main view
function BigScoreMeter({ score }: { score: number }) {
  const [showCelebration, setShowCelebration] = useState(false)
  
  useEffect(() => {
    if (score >= 70) {
      const timer = setTimeout(() => setShowCelebration(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [score])
  
  const getScoreColor = () => {
    if (score >= 80) return { primary: '#22C55E', secondary: '#10B981', glow: 'rgba(34, 197, 94, 0.5)' }
    if (score >= 60) return { primary: '#F59E0B', secondary: '#D97706', glow: 'rgba(245, 158, 11, 0.5)' }
    return { primary: '#EF4444', secondary: '#DC2626', glow: 'rgba(239, 68, 68, 0.5)' }
  }
  
  const colors = getScoreColor()
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const scoreLabel = score >= 90 ? 'Excellent!' : 
                     score >= 80 ? 'Amazing!' :
                     score >= 70 ? 'Great job!' : 
                     score >= 60 ? 'Good work!' :
                     score >= 50 ? 'Nice try!' : 'Keep practicing!'
  
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Outer glow */}
      <div 
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
      />
      
      <div className="relative w-64 h-64">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background track */}
          <circle
            cx="128" cy="128" r="120"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <defs>
            <linearGradient id="bigScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
            <filter id="bigGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <motion.circle
            cx="128" cy="128" r="120"
            fill="none"
            stroke="url(#bigScoreGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
            filter="url(#bigGlow)"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-7xl font-bold"
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            <AnimatedCounter value={score} duration={2} />
            <span className="text-4xl">%</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
            className="text-xl font-medium text-white/80 mt-2"
          >
            {scoreLabel}
          </motion.div>
        </div>
        
        {/* Celebration particles */}
        <AnimatePresence>
          {showCelebration && (
            <>
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : '#fff',
                    left: '50%', top: '50%'
                  }}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    x: [0, Math.cos(i * 22.5 * Math.PI / 180) * 100],
                    y: [0, Math.sin(i * 22.5 * Math.PI / 180) * 100],
                  }}
                  transition={{ duration: 1, delay: i * 0.03 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Detailed Feedback View
function DetailedFeedback({ 
  inlineFeedback, 
  studentText 
}: { 
  inlineFeedback: InlineFeedback[]
  studentText: string 
}) {
  // Highlight segments in text
  const getHighlightedText = () => {
    if (!inlineFeedback.length) return studentText
    
    let result = studentText
    const highlights: Array<{ start: number; end: number; type: 'strength' | 'improvement' }> = []
    
    inlineFeedback.forEach((feedback) => {
      const searchText = feedback.segment.toLowerCase()
      const textLower = result.toLowerCase()
      const startIndex = textLower.indexOf(searchText)
      
      if (startIndex !== -1) {
        highlights.push({
          start: startIndex,
          end: startIndex + feedback.segment.length,
          type: feedback.type
        })
      }
    })
    
    highlights.sort((a, b) => b.start - a.start)
    
    highlights.forEach(h => {
      const before = result.slice(0, h.start)
      const segment = result.slice(h.start, h.end)
      const after = result.slice(h.end)
      const colorClass = h.type === 'strength' 
        ? 'bg-emerald-500/30 border-b-2 border-emerald-400' 
        : 'bg-amber-500/30 border-b-2 border-amber-400'
      
      result = `${before}<mark class="${colorClass} px-0.5 rounded">${segment}</mark>${after}`
    })
    
    return result
  }
  
  const strengths = inlineFeedback.filter(f => f.type === 'strength')
  const improvements = inlineFeedback.filter(f => f.type === 'improvement')
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Student's text */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Your Ending</h4>
        <div 
          className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/90 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
        />
      </div>
      
      {/* What was good */}
      {strengths.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            What you did well
          </h4>
          <div className="space-y-2">
            {strengths.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-300 text-sm font-medium mb-1">"{item.segment}"</p>
                <p className="text-white/70 text-sm">{item.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* How to improve */}
      {improvements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            How to get a higher score
          </h4>
          <div className="space-y-2">
            {improvements.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 text-sm font-medium mb-1">"{item.segment}"</p>
                <p className="text-white/70 text-sm mb-2">{item.comment}</p>
                {item.suggestion && (
                  <div className="mt-2 p-2 rounded bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Try writing something like:</p>
                    <p className="text-sm text-cyan-300 italic">"{item.suggestion}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Main FeedbackModule - Big meter first, expandable details
export default function FeedbackModule({
  scorePercentage,
  inlineFeedback,
  studentText,
  onClose,
  onPlayAgain,
  onSendToTeacher
}: FeedbackModuleProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [sendingToTeacher, setSendingToTeacher] = useState(false)
  const [sentToTeacher, setSentToTeacher] = useState(false)
  
  const handleSendToTeacher = async () => {
    if (!onSendToTeacher || sendingToTeacher || sentToTeacher) return
    
    setSendingToTeacher(true)
    try {
      await onSendToTeacher()
      setSentToTeacher(true)
    } catch (error) {
      console.error('Failed to send to teacher:', error)
    } finally {
      setSendingToTeacher(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg"
      >
        {/* Background glow */}
        <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/20 via-cyan-500/10 to-fuchsia-500/20 rounded-full blur-3xl" />
        
        <div className="relative">
          {/* Main Score View */}
          {!showDetails && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-8"
            >
              <BigScoreMeter score={scorePercentage} />
              
              {/* Action buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.2 }}
                className="flex flex-col gap-3 mt-8 w-full max-w-xs"
              >
                <button
                  onClick={() => setShowDetails(true)}
                  className="w-full px-6 py-4 rounded-2xl font-semibold bg-gradient-to-r from-violet-500 to-cyan-500 text-white flex items-center justify-center gap-2 hover:from-violet-400 hover:to-cyan-400 transition-all shadow-lg shadow-violet-500/30"
                >
                  <Eye className="w-5 h-5" />
                  Show Feedback
                </button>
                
                {onSendToTeacher && (
                  <button
                    onClick={handleSendToTeacher}
                    disabled={sendingToTeacher || sentToTeacher}
                    className={`w-full px-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      sentToTeacher 
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30'
                        : 'bg-white/5 text-white border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {sendingToTeacher ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : sentToTeacher ? (
                      <>
                        <Check className="w-5 h-5" />
                        Sent to Teacher!
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send to Teacher
                      </>
                    )}
                  </button>
                )}
                
                <div className="flex gap-3">
                  {onPlayAgain && (
                    <button
                      onClick={onPlayAgain}
                      className="flex-1 px-4 py-3 rounded-xl font-medium bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      Play Again
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-xl font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {/* Detailed Feedback View */}
          {showDetails && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header with score */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                  <span className="text-sm">Back to score</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">{scorePercentage}%</span>
                </div>
              </div>
              
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5">
                <DetailedFeedback 
                  inlineFeedback={inlineFeedback} 
                  studentText={studentText} 
                />
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                {onPlayAgain && (
                  <button
                    onClick={onPlayAgain}
                    className="flex-1 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:from-violet-400 hover:to-cyan-400 transition-all"
                  >
                    Play Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}


