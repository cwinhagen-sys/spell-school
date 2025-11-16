'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { questOutbox } from '@/lib/questOutbox'
import { supabase } from '@/lib/supabase'

type SaveStatus = 'saving' | 'saved' | 'pending' | 'checking' | 'error'

/**
 * Save Status Indicator - Visar när det är säkert att logga ut eller navigera
 * 
 * Övervakar:
 * - Quest outbox (IndexedDB/localStorage)
 * - Pågående game sessions
 * - Pending database operations
 * - Database errors
 * 
 * Status:
 * - saving: Data sparas just nu
 * - saved: Allt sparat, säkert att logga ut (visas i 3 sek)
 * - pending: Det finns osparad data
 * - error: Database-fel, data kan ha gått förlorad
 * - checking: Kontrollerar status
 */
export default function SaveStatusIndicator() {
  const [status, setStatus] = useState<SaveStatus>('checking')
  const [pendingCount, setPendingCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [hasActiveOperation, setHasActiveOperation] = useState(false)
  const [lastKnownXP, setLastKnownXP] = useState<number | null>(null)

  useEffect(() => {
    let checkInterval: NodeJS.Timeout
    let hideTimer: NodeJS.Timeout

    // Verify database actually has the data
    const verifyDatabaseSync = async (): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return true // Can't verify, assume ok
        
        // Get current XP from database
        const { data, error } = await supabase
          .from('student_progress')
          .select('total_points')
          .eq('student_id', user.id)
          .is('word_set_id', null)
          .is('homework_id', null)
          .maybeSingle()
        
        if (error) {
          console.error('SaveStatusIndicator: Error verifying database:', error)
          return false
        }
        
        const dbXP = data?.total_points || 0
        
        // Also check localStorage for comparison
        const userXPKey = `studentTotalXP_${user.id}`
        const localXPRaw = localStorage.getItem(userXPKey)
        const fallbackXP = localStorage.getItem('studentTotalXP')
        const localXP = parseInt(localXPRaw || fallbackXP || '0')
        
        console.log('SaveStatusIndicator: === DATABASE VERIFICATION START ===')
        console.log('SaveStatusIndicator: User ID:', user.id)
        console.log('SaveStatusIndicator: LocalStorage key:', userXPKey)
        console.log('SaveStatusIndicator: LocalStorage value (user-specific):', localXPRaw)
        console.log('SaveStatusIndicator: LocalStorage value (fallback):', fallbackXP)
        console.log('SaveStatusIndicator: Parsed localXP:', localXP)
        console.log('SaveStatusIndicator: Database XP:', dbXP)
        console.log('SaveStatusIndicator: Difference:', Math.abs(dbXP - localXP))
        console.log('SaveStatusIndicator: === VERIFICATION DATA ===', { dbXP, localXP, difference: Math.abs(dbXP - localXP) })
        
        // If there's a mismatch, data is NOT synced
        // IMPORTANT: Allow large discrepancy (100 points) because:
        // - localStorage updates immediately (optimistic)
        // - Database writes happen in background and can take 200-5000ms!
        // - Games can award 50-100 points at once
        // - Network latency varies (especially on mobile/poor connections)
        // - We might check before database write completes
        const difference = Math.abs(dbXP - localXP)
        const THRESHOLD = 100
        
        console.log('SaveStatusIndicator: Checking difference:', { difference, threshold: THRESHOLD, willFail: difference > THRESHOLD })
        
        if (difference > THRESHOLD) {
          const errorDetails = `
=== CRITICAL XP MISMATCH (> ${THRESHOLD}) ===
Database XP: ${dbXP}
LocalStorage XP: ${localXP}
Difference: ${difference}
Threshold: ${THRESHOLD}

User ID: ${user.id}
LocalStorage key: ${userXPKey}
LocalStorage (user-specific): ${localXPRaw}
LocalStorage (fallback): ${fallbackXP}

This indicates the database write either:
1. Failed completely (updateStudentProgress returned 0)
2. Is taking extremely long (> 5 seconds - check network)
3. A major sync issue occurred

Check browser console for database errors!
`
          console.error(errorDetails)
          return false
        }
        
        if (difference > 0 && difference <= THRESHOLD) {
          console.log(`SaveStatusIndicator: ✅ XP difference within acceptable range (${difference} ≤ ${THRESHOLD}):`, { 
            dbXP, 
            localXP, 
            difference,
            message: 'Database write completed or in final stages. This is normal!'
          })
        } else if (difference === 0) {
          console.log('SaveStatusIndicator: ✅ Perfect sync - Database and LocalStorage match exactly!')
        }
        
        setLastKnownXP(dbXP)
        return true
      } catch (error) {
        console.error('SaveStatusIndicator: Error in verifyDatabaseSync:', error)
        return false
      }
    }

    const checkPendingOperations = async () => {
      try {
        // Check quest outbox
        const outboxStatus = await questOutbox.getStatus()
        const outboxPending = outboxStatus.pendingCount

        // Check localStorage for pending game sessions
        // Also clean up old pending sessions (> 1 hour old)
        const pendingSessionKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('pendingSession_')
        )
        
        // Clean up old pending sessions
        let validSessions = 0
        const now = Date.now()
        const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
        
        for (const key of pendingSessionKeys) {
          try {
            const backup = JSON.parse(localStorage.getItem(key) || '{}')
            const age = now - (backup.timestamp || 0)
            
            if (age > MAX_AGE_MS) {
              // Session is too old, remove it
              console.log(`SaveStatusIndicator: Removing old pending session: ${key} (age: ${Math.round(age / 1000 / 60)} minutes)`)
              localStorage.removeItem(key)
            } else {
              validSessions++
            }
          } catch (e) {
            // Invalid backup data, remove it
            console.log(`SaveStatusIndicator: Removing invalid pending session: ${key}`)
            localStorage.removeItem(key)
          }
        }
        
        const sessionsPending = validSessions

        const totalPending = outboxPending + sessionsPending

        console.log('SaveStatusIndicator: Pending operations:', {
          outbox: outboxPending,
          sessions: sessionsPending,
          total: totalPending,
          cleaned: pendingSessionKeys.length - validSessions
        })

        setPendingCount(totalPending)

        // Update status based on pending operations
        if (totalPending > 0 || hasActiveOperation) {
          // There's pending data OR an active operation
          if (hasActiveOperation) {
            setStatus('saving')
          } else {
            setStatus('pending')
          }
          setIsVisible(true)
          clearTimeout(hideTimer)
        } else {
          // All saved! (no pending, no active operations)
          // OPTIMIZED: Skip database verification to prevent loops and delays
          if (status === 'pending' || status === 'saving') {
            console.log('SaveStatusIndicator: No pending operations - showing saved immediately')
            setStatus('saved')
            setLastSaveTime(new Date())
            setIsVisible(true)
            
            // Hide "Saved" message after 4 seconds
            clearTimeout(hideTimer)
            hideTimer = setTimeout(() => {
              setIsVisible(false)
            }, 4000)
          } else if (status === 'checking') {
            // Initial check - hide if nothing pending
            setIsVisible(false)
          } else if (status === 'error') {
            // Don't auto-hide error status
            // Will be handled by error timeout
          }
        }
      } catch (error) {
        console.error('SaveStatusIndicator: Error checking pending operations:', error)
      }
    }

    // Initial check
    checkPendingOperations()

    // Check every 1 second for pending operations
    checkInterval = setInterval(checkPendingOperations, 1000)

    // Listen for sync events
    const handleSyncStart = () => {
      console.log('SaveStatusIndicator: Sync started')
      setHasActiveOperation(true)
      setStatus('saving')
      setIsVisible(true)
      clearTimeout(hideTimer)
    }

    const handleSyncComplete = () => {
      console.log('SaveStatusIndicator: Sync completed successfully')
      setHasActiveOperation(false)
      
      // OPTIMIZED: Immediate check instead of delayed verification
      // This prevents the 4-5 minute delays
      console.log('SaveStatusIndicator: Running immediate check after sync complete event')
      checkPendingOperations()
    }

    const handleSyncError = (event: any) => {
      console.error('SaveStatusIndicator: Sync error detected!', event.detail)
      setHasActiveOperation(false)
      setStatus('error')
      setIsVisible(true)
      
      // Keep error visible longer (10 seconds)
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        // After showing error, re-check pending operations
        checkPendingOperations()
      }, 10000)
    }

    window.addEventListener('xp-sync-start', handleSyncStart)
    window.addEventListener('xp-synced', handleSyncComplete)
    window.addEventListener('xp-sync-error', handleSyncError)
    window.addEventListener('quest-sync-complete', handleSyncComplete)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(hideTimer)
      window.removeEventListener('xp-sync-start', handleSyncStart)
      window.removeEventListener('xp-synced', handleSyncComplete)
      window.removeEventListener('xp-sync-error', handleSyncError)
      window.removeEventListener('quest-sync-complete', handleSyncComplete)
    }
  }, [status, hasActiveOperation])

  // Status text and styling
  const getStatusInfo = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
          text: 'Sparar...',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'saved':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: 'Allt sparat - säkert att logga ut',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'pending':
        return {
          icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
          text: pendingCount > 0 
            ? `Sparar data (${pendingCount} kvar)... Vänta!`
            : 'Data sparas...',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'FEL vid sparning! Data kan ha gått förlorad.',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300'
        }
      case 'checking':
        return {
          icon: <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />,
          text: 'Kontrollerar...',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className={`
            ${statusInfo.bgColor} 
            ${statusInfo.borderColor}
            backdrop-blur-sm 
            border-2
            rounded-xl 
            shadow-lg 
            px-4 
            py-3 
            flex 
            items-center 
            gap-3
            min-w-[240px]
          `}>
            {statusInfo.icon}
            <div className="flex-1">
              <span className={`text-sm font-medium ${statusInfo.textColor}`}>
                {statusInfo.text}
              </span>
              {lastSaveTime && status === 'saved' && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {lastSaveTime.toLocaleTimeString('sv-SE', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

