'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface StreakMilestoneAnimationProps {
  streak: number
  show: boolean
  onDismiss: () => void
}

export default function StreakMilestoneAnimation({ 
  streak, 
  show, 
  onDismiss 
}: StreakMilestoneAnimationProps) {
  const [flames, setFlames] = useState<{ id: number; x: number; delay: number }[]>([])

  useEffect(() => {
    // Generate random flame particles
    const newFlames = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 200 - 100, // -100 to 100
      delay: Math.random() * 0.3
    }))
    setFlames(newFlames)
  }, [streak])

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 z-[9998] backdrop-blur-sm"
            onClick={onDismiss}
          />

          {/* Main animation container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ 
                scale: 1,
                rotate: 0,
                opacity: 1
              }}
              exit={{ 
                scale: 0,
                opacity: 0,
                transition: { duration: 0.3 }
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="relative pointer-events-auto cursor-pointer"
              onClick={onDismiss}
            >
              {/* Flame particles background */}
              {flames.map((flame) => (
                <motion.div
                  key={flame.id}
                  className="absolute top-1/2 left-1/2"
                    initial={{ 
                      x: 0,
                      y: 0,
                      scale: 0,
                      opacity: 0
                    }}
                    animate={{
                      x: flame.x,
                      y: -120,
                      scale: 0,
                      opacity: 0
                    }}
                    transition={{
                      duration: 1.5,
                      delay: flame.delay,
                      repeat: Infinity,
                      repeatDelay: 0.5,
                      ease: "easeOut"
                    }}
                >
                  <div className="text-4xl">
                    {flame.id % 3 === 0 ? '🔥' : flame.id % 3 === 1 ? '✨' : '⭐'}
                  </div>
                </motion.div>
              ))}

              {/* Main streak badge */}
              <div className="relative bg-gradient-to-br from-orange-400 via-red-500 to-orange-600 rounded-full p-8 shadow-2xl">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300 to-red-600 opacity-50 blur-2xl animate-pulse" />
                
                {/* Inner content */}
                <div className="relative flex flex-col items-center justify-center">
                  {/* Fire emoji */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      repeatDelay: 0.5
                    }}
                    className="text-8xl mb-2"
                  >
                    🔥
                  </motion.div>

                  {/* Streak number */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.3,
                      type: "spring",
                      stiffness: 300,
                      damping: 10
                    }}
                    className="text-7xl font-black text-white drop-shadow-2xl"
                    style={{
                      textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,165,0,0.6)'
                    }}
                  >
                    {streak}
                  </motion.div>

                  {/* Day text */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold text-white uppercase tracking-wider mt-2"
                    style={{
                      textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}
                  >
                    {streak === 1 ? 'DAY' : 'DAYS'}
                  </motion.div>
                </div>
              </div>

              {/* Streak message */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
              >
                <div className="bg-white rounded-full px-8 py-4 shadow-2xl">
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {streak === 1 ? (
                      "Started your streak! 🎉"
                    ) : streak < 7 ? (
                      `${streak} days strong! 💪`
                    ) : streak < 30 ? (
                      `On fire! ${streak} days! 🔥`
                    ) : (
                      `Unstoppable! ${streak} days! 👑`
                    )}
                  </p>
                </div>
              </motion.div>

              {/* Sparkles around the badge */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 45) * (Math.PI / 180)
                const radius = 140
                const x = Math.cos(angle) * radius
                const y = Math.sin(angle) * radius

                return (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute text-4xl"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    initial={{ 
                      x: 0,
                      y: 0,
                      scale: 0,
                      opacity: 0,
                      rotate: 0
                    }}
                    animate={{
                      x: x,
                      y: y,
                      scale: 1,
                      opacity: 0.8,
                      rotate: 360
                    }}
                    transition={{
                      duration: 0.8,
                      delay: 0.2 + (i * 0.05),
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: "easeOut"
                    }}
                  >
                    ✨
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Tap to dismiss hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="absolute bottom-8 text-white text-lg font-medium opacity-70"
            >
              Tap to continue
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

