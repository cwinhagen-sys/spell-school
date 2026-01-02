import { useEffect, useRef } from 'react'
import { updateUserActivity } from '@/lib/activity'

/**
 * Hook to track user activity and update last_active timestamp
 * This should be used on pages where student activity matters
 */
export function useActivityTracking() {
  const lastUpdateRef = useRef<number>(0)
  
  useEffect(() => {
    // Update activity immediately when component mounts
    updateUserActivity()
    lastUpdateRef.current = Date.now()

    // Set up interval to update activity every 30 seconds while user is on page
    const interval = setInterval(() => {
      updateUserActivity()
      lastUpdateRef.current = Date.now()
    }, 30000) // 30 seconds

    // Throttled activity update - max once per 15 seconds
    const handleActivity = () => {
      const now = Date.now()
      // Only update if more than 15 seconds since last update
      if (now - lastUpdateRef.current > 15000) {
        updateUserActivity()
        lastUpdateRef.current = now
      }
    }

    // Listen for user interactions
    document.addEventListener('click', handleActivity)
    document.addEventListener('keydown', handleActivity)

    // Cleanup
    return () => {
      clearInterval(interval)
      document.removeEventListener('click', handleActivity)
      document.removeEventListener('keydown', handleActivity)
    }
  }, [])
}














