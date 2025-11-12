'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Sync Status Indicator V1 - För Gamla Tracking Systemet
 * 
 * Visar när XP och game sessions sparas till databasen.
 * Fungerar med gamla tracking.ts (updateStudentProgress).
 * 
 * Logik:
 * - Lyssnar på tracking.ts persistent logs
 * - Visar "Syncing..." när updateStudentProgress körs
 * - Visar "Saved" när XP uppdateras i DB
 */
export default function SyncStatusIndicatorV1() {
  const [isVisible, setIsVisible] = useState(false)
  const [status, setStatus] = useState<'syncing' | 'saved'>('syncing')

  useEffect(() => {
    let hideTimer: NodeJS.Timeout
    let lastProcessedLogIndex = -1

    // Monitor persistent logs for tracking events
    const checkInterval = setInterval(() => {
      try {
        const logs = localStorage.getItem('persistentLogs')
        if (!logs) return

        const parsed = JSON.parse(logs)
        if (!Array.isArray(parsed) || parsed.length === 0) return

        // Only process NEW logs since last check
        if (parsed.length <= lastProcessedLogIndex) return
        
        const newLogs = parsed.slice(lastProcessedLogIndex + 1)
        lastProcessedLogIndex = parsed.length - 1

        // Check for updateStudentProgress call (spel startar)
        const hasUpdateCall = newLogs.some((log: any) => 
          log.message?.includes('updateStudentProgress called')
        )

        // Check for XP updated (spel slutfört och sparat)
        const hasXPUpdate = newLogs.some((log: any) => 
          log.message?.includes('XP updated in DB') ||
          log.message?.includes('XP updated successfully')
        )

        // If we see updateStudentProgress, show syncing
        if (hasUpdateCall) {
          setStatus('syncing')
          setIsVisible(true)
          clearTimeout(hideTimer)
        }

        // If we see XP update, show success
        if (hasXPUpdate) {
          setStatus('saved')
          setIsVisible(true)
          
          // Hide after 3 seconds
          clearTimeout(hideTimer)
          hideTimer = setTimeout(() => {
            setIsVisible(false)
          }, 3000)
        }

      } catch (error) {
        // Silent fail
      }
    }, 300) // Check every 300ms for faster response

    return () => {
      clearTimeout(hideTimer)
      clearInterval(checkInterval)
    }
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
            {status === 'syncing' && (
              <>
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs font-medium text-gray-700">
                  Saving...
                </span>
              </>
            )}
            
            {status === 'saved' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-700">
                  Saved
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

