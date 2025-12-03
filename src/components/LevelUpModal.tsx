'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Star, Sparkles } from 'lucide-react'

type Props = {
  level: number
  title?: string
  image?: string
  description?: string
  onClose: () => void
}

// Particle component for confetti effects
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
        y: [-50, -150],
        scale: [0, 1, 1, 0],
        x: [0, (Math.random() - 0.5) * 80]
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: "easeOut"
      }}
    />
  )
}

export default function LevelUpModal({ level, title, image, description, onClose }: Props) {
  const isMilestone = level % 10 === 0
  
  // Generate particles
  const particles = useMemo(() => {
    const colors = isMilestone 
      ? ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a'] 
      : ['#a78bfa', '#8b5cf6', '#c4b5fd', '#ddd6fe']
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.3,
      x: 10 + Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))
  }, [isMilestone])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" onClick={onClose}>
        {/* Dark backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Content */}
        <div className="relative h-full w-full flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
            className="relative pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particles.map(p => (
                <Particle key={p.id} delay={p.delay} x={p.x} color={p.color} />
              ))}
            </div>
            
            {/* Glow effect */}
            <div className={`absolute -inset-4 rounded-3xl blur-2xl ${
              isMilestone 
                ? 'bg-gradient-to-br from-amber-500/40 to-orange-500/40' 
                : 'bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40'
            }`} />

            {/* Main Card */}
            <div className={`relative rounded-3xl ${
              isMilestone 
                ? 'bg-gradient-to-br from-[#1a1510] to-[#12122a] border-2 border-amber-500/50' 
                : 'bg-gradient-to-br from-[#151020] to-[#12122a] border-2 border-violet-500/50'
            } p-8 shadow-2xl overflow-hidden min-w-[340px]`}>
              
              {/* Top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                isMilestone 
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400' 
                  : 'bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400'
              }`} />

              {/* Level Up Text */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-4 flex items-center justify-center gap-2"
              >
                {isMilestone ? (
                  <Crown className="w-7 h-7 text-amber-400" />
                ) : (
                  <Sparkles className="w-7 h-7 text-violet-400" />
                )}
                <h2 className={`text-2xl font-bold ${
                  isMilestone ? 'text-amber-400' : 'text-violet-400'
                }`}>
                  Level Up!
                </h2>
              </motion.div>

              {/* Level Number - Big and Glowing */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="text-center mb-6"
              >
                <div className={`relative inline-flex items-center justify-center w-32 h-32 rounded-full ${
                  isMilestone 
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-4 border-amber-500/50' 
                    : 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-4 border-violet-500/50'
                }`}>
                  {/* Inner glow */}
                  <div className={`absolute inset-2 rounded-full blur-xl ${
                    isMilestone ? 'bg-amber-500/30' : 'bg-violet-500/30'
                  }`} />
                  <span className={`relative text-6xl font-black ${
                    isMilestone ? 'text-amber-400' : 'text-violet-400'
                  }`}>
                    {level}
                  </span>
                </div>
              </motion.div>

              {/* Title (if milestone) */}
              {isMilestone && title && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-6"
                >
                  <div className="flex items-center justify-center gap-3 bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                    {image && (
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-amber-400 shadow-lg shadow-amber-500/30">
                        <img src={image} alt={title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-xs text-amber-400/70 font-medium">Ny titel</div>
                      <div className="text-lg font-bold text-amber-400">{title}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* XP Progress Bar */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mb-6"
              >
                <div className={`h-2 rounded-full overflow-hidden ${
                  isMilestone ? 'bg-amber-500/20' : 'bg-violet-500/20'
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      isMilestone 
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400' 
                        : 'bg-gradient-to-r from-violet-400 to-fuchsia-400'
                    }`}
                  />
                </div>
              </motion.div>

              {/* Tap to continue hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center"
              >
                <p className="text-xs text-gray-500 font-medium">
                  Tryck för att fortsätta
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
