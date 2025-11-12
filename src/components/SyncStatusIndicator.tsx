'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, Cloud, CloudOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncStatusIndicatorProps {
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  className?: string
}

/**
 * Diskret sync status indikator som visar när data synkas till databasen
 * 
 * States:
 * - idle: Ingen pågående sync
 * - syncing: Data synkas (spinner)
 * - synced: Sync klar (grön bock, visas i 2 sekunder)
 * - error: Sync misslyckades (röd varning, visas i 3 sekunder)
 */
export default function SyncStatusIndicator({ 
  position = 'bottom-right',
  className = ''
}: SyncStatusIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [isVisible, setIsVisible] = useState(false)
  const [waitingForSync, setWaitingForSync] = useState(false)

  useEffect(() => {
    let hideTimer: NodeJS.Timeout

    // NEW APPROACH: Only show when a game completes
    const handleGameCompleted = (event: any) => {
      console.log('SyncIndicator: Game completed, waiting for sync...')
      setStatus('syncing')
      setIsVisible(true)
      setWaitingForSync(true)
      clearTimeout(hideTimer)
    }

    // När sync är klar
    const handleSyncSuccess = (event: any) => {
      const syncedCount = event.detail?.events_synced || 0
      console.log('SyncIndicator: xp-synced event received!', { syncedCount, waitingForSync })
      
      // Reagera om vi väntar på sync ELLER om vi just synkade något
      if (waitingForSync) {
        console.log('SyncIndicator: Sync completed, showing success!')
        setStatus('synced')
        setIsVisible(true)
        setWaitingForSync(false)
        
        // Visa "Saved" i 3 sekunder
        clearTimeout(hideTimer)
        hideTimer = setTimeout(() => {
          console.log('SyncIndicator: Hiding after 3 seconds')
          setIsVisible(false)
          setStatus('idle')
        }, 3000)
      }
    }

    const handleSyncError = (event: any) => {
      // Bara reagera om vi väntar på en sync
      if (waitingForSync) {
        console.log('SyncIndicator: Sync error!')
        setStatus('error')
        setIsVisible(true)
        setWaitingForSync(false)
        
        // Visa error i 4 sekunder
        clearTimeout(hideTimer)
        hideTimer = setTimeout(() => {
          setIsVisible(false)
          setStatus('idle')
        }, 4000)
      }
    }

    // Listen for game completion (from trackingV2)
    window.addEventListener('game-completed', handleGameCompleted)
    window.addEventListener('xp-synced', handleSyncSuccess)
    window.addEventListener('xp-sync-error', handleSyncError)

    return () => {
      clearTimeout(hideTimer)
      window.removeEventListener('game-completed', handleGameCompleted)
      window.removeEventListener('xp-synced', handleSyncSuccess)
      window.removeEventListener('xp-sync-error', handleSyncError)
    }
  }, [waitingForSync])

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: position.includes('bottom') ? 20 : -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className={`fixed ${positionClasses[position]} z-50 ${className}`}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
            {status === 'syncing' && (
              <>
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs font-medium text-gray-700">
                  Syncing...
                </span>
              </>
            )}
            
            {status === 'synced' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-700">
                  Saved
                </span>
              </>
            )}
            
            {status === 'error' && (
              <>
                <CloudOff className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-red-700">
                  Retry...
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

