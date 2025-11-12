'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  level: number
  title?: string
  image?: string
  description?: string
  onClose: () => void
}

export default function LevelUpModal({ level, title, image, description, onClose }: Props) {
  const isMilestone = level % 10 === 0
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number }[]>([])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    // Just a few subtle particles
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 20 + (i * 12),
      delay: i * 0.1
    }))
    setParticles(newParticles)
  }, [])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" onClick={onClose}>
        {/* Subtle backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
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
            {/* Subtle particles around */}
            {particles.map((particle) => (
              <motion.div
                key={`particle-${particle.id}`}
                className="absolute top-0 left-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{
                  duration: 2,
                  delay: particle.delay,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <div 
                  className={`absolute w-1.5 h-1.5 rounded-full ${
                    isMilestone ? 'bg-yellow-300' : 'bg-purple-300'
                  }`}
                  style={{ 
                    left: `${particle.x}%`, 
                    top: '-10px',
                  }}
                />
              </motion.div>
            ))}

            {/* Main Card - Clean and Rounded */}
            <div className={`relative rounded-3xl ${
              isMilestone 
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300' 
                : 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300'
            } p-8 shadow-2xl overflow-hidden min-w-[320px]`}>
              
              {/* Subtle glow */}
              <div className={`absolute inset-0 ${
                isMilestone ? 'bg-yellow-100/30' : 'bg-purple-100/30'
              } blur-3xl -z-10`} />

              {/* Level Up Text */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-3"
              >
                <h2 className={`text-2xl font-bold ${
                  isMilestone ? 'text-yellow-700' : 'text-purple-700'
                }`}>
                  Level Up!
                </h2>
              </motion.div>

              {/* Level Number - Big and Clean */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="text-center mb-6"
              >
                <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${
                  isMilestone 
                    ? 'bg-gradient-to-br from-yellow-200 to-orange-200 border-4 border-yellow-400' 
                    : 'bg-gradient-to-br from-purple-200 to-pink-200 border-4 border-purple-400'
                } shadow-lg`}>
                  <span className={`text-6xl font-black ${
                    isMilestone ? 'text-yellow-800' : 'text-purple-800'
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
                  <div className="flex items-center justify-center gap-3 bg-white/50 rounded-2xl p-4 border border-yellow-200">
                    {image && (
                      <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-yellow-400">
                        <img src={image} alt={title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-xs text-yellow-600 font-medium">New Title</div>
                      <div className="text-sm font-bold text-yellow-800">{title}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Subtle XP indicator */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mb-6"
              >
                <div className={`h-2 rounded-full overflow-hidden ${
                  isMilestone ? 'bg-yellow-200' : 'bg-purple-200'
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      isMilestone 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                        : 'bg-gradient-to-r from-purple-400 to-pink-400'
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
                  Tap to continue
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
