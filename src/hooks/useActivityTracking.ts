import { useEffect } from 'react'
import { updateUserActivity } from '@/lib/activity'

/**
 * Hook to track user activity and update last_active timestamp
 * This should be used on pages where student activity matters
 */
// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useActivityTracking() {
  useEffect(() => {
    // Update activity when component mounts
    updateUserActivity()

    // Set up interval to update activity every 60 seconds while user is on page (increased from 30)
    const interval = setInterval(() => {
      updateUserActivity()
    }, 60000) // 60 seconds

    // Debounced activity update - max once per 60 seconds
    const debouncedUpdate = debounce(() => {
      updateUserActivity()
    }, 60000)

    // Update activity when user interacts with the page (debounced)
    const handleActivity = () => {
      debouncedUpdate()
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














