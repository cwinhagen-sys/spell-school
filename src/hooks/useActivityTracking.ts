import { useEffect } from 'react'
import { updateUserActivity } from '@/lib/activity'

/**
 * Hook to track user activity and update last_active timestamp
 * This should be used on pages where student activity matters
 */
export function useActivityTracking() {
  useEffect(() => {
    // Update activity when component mounts
    updateUserActivity()

    // Set up interval to update activity every 30 seconds while user is on page
    const interval = setInterval(() => {
      updateUserActivity()
    }, 30000) // 30 seconds

    // Update activity when user interacts with the page
    const handleActivity = () => {
      updateUserActivity()
    }

    // Listen for user interactions
    document.addEventListener('click', handleActivity)
    document.addEventListener('keydown', handleActivity)
    document.addEventListener('scroll', handleActivity)

    // Cleanup
    return () => {
      clearInterval(interval)
      document.removeEventListener('click', handleActivity)
      document.removeEventListener('keydown', handleActivity)
      document.removeEventListener('scroll', handleActivity)
    }
  }, [])
}














