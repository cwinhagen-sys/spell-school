'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Trophy } from 'lucide-react'

interface SessionGameCompleteModalProps {
  isOpen: boolean
  completedGames: number
  totalGames: number
  onClose: () => void
}

export default function SessionGameCompleteModal({
  isOpen,
  completedGames,
  totalGames,
  onClose
}: SessionGameCompleteModalProps) {
  const [progressWidth, setProgressWidth] = useState(0)

  // Calculate previous progress (before this game was completed)
  const previousCompleted = Math.max(0, completedGames - 1)
  const previousPercentage = totalGames > 0 ? Math.round((previousCompleted / totalGames) * 100) : 0
  const currentPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0

  useEffect(() => {
    if (isOpen) {
      // Start from previous percentage
      setProgressWidth(previousPercentage)
      
      // Use requestAnimationFrame to ensure DOM is ready before animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Animate to current percentage
          setProgressWidth(currentPercentage)
        })
      })
    } else {
      // Reset when closed
      setProgressWidth(0)
    }
  }, [isOpen, previousPercentage, currentPercentage])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-md bg-[#161622] rounded-2xl border border-white/[0.12] shadow-2xl p-8">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white text-center mb-2"
              >
                Game Complete!
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-400 text-center mb-6"
              >
                Great job! Your progress has been updated.
              </motion.p>

              {/* Progress Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-6"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-lg font-bold text-white">
                      {completedGames} / {totalGames}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    initial={{ width: `${previousPercentage}%` }}
                    animate={{ width: `${progressWidth}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>

              {/* Continue Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200"
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

